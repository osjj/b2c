import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import { AsyncLocalStorage } from 'node:async_hooks';
// Exercise the installed Next cache implementation without connecting to a database.
globalThis.AsyncLocalStorage = AsyncLocalStorage;
const nextCache = (await import('next/cache.js')).default;
const { workAsyncStorage } = await import('next/dist/server/app-render/work-async-storage.external.js');
function loadTs(relative, imports) {
    const source = fs.readFileSync(path.resolve(relative), 'utf8');
    const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
    const compiledModule = { exports: {} };
    vm.runInThisContext(`(function(require,module,exports){${compiled}\n})`, { filename: relative })((id) => {
        if (!(id in imports))
            throw new Error(`Unexpected test dependency: ${id}`);
        return imports[id];
    }, compiledModule, compiledModule.exports);
    return compiledModule.exports;
}
const homeCache = loadTs('src/lib/home-cache.ts', { 'next/cache': nextCache });
function fixture() {
    const entries = new Map();
    let stale = false, productCalls = 0, solutionCalls = 0, fail = false, price = 12;
    const incrementalCache = {
        generateCacheKey: async (key) => key,
        get: async (key) => entries.has(key) ? { value: entries.get(key).value, isStale: stale } : null,
        set: async (key, value, options) => entries.set(key, { value, options }),
    };
    const data = loadTs('src/modules/home-new/lib/home-data.ts', {
        'next/cache': nextCache, '@/lib/home-cache': homeCache,
        '@/actions/collections': { getCollectionProducts: async (slug, limit) => {
                assert.equal(slug, 'best-sellers');
                assert.equal(limit, 5);
                productCalls++;
                if (fail)
                    throw new Error('Simulated DB unavailable');
                return { collection: { name: 'Best sellers' }, products: [{ id: 'p1', price }] };
            } },
        '@/actions/solutions': { getSolutions: async (input) => {
                assert.deepEqual(input, { activeOnly: true, limit: 5 });
                solutionCalls++;
                if (fail)
                    throw new Error('Simulated DB unavailable');
                return { solutions: [{ id: 's1', title: 'Mining' }], pagination: { total: 1 } };
            } },
    });
    async function render(fn) {
        const store = { route: '/', page: '/page', incrementalCache, isStaticGeneration: true };
        return workAsyncStorage.run(store, async () => {
            const result = await fn();
            await Promise.all(Object.values(store.pendingRevalidates || {}));
            return result;
        });
    }
    return { entries, data, render, incrementalCache, counts: () => ({ productCalls, solutionCalls }), setStale: value => { stale = value; }, setFail: value => { fail = value; }, setPrice: value => { price = value; } };
}
test('public getters reuse successful Next cache entries, with independent 300 second tags', async () => {
    const f = fixture();
    for (let i = 0; i < 2; i++)
        await f.render(() => Promise.all([f.data.getHomeFeaturedProducts(), f.data.getHomeSolutions()]));
    assert.deepEqual(f.counts(), { productCalls: 1, solutionCalls: 1 });
    assert.deepEqual([...f.entries.values()].flatMap(e => e.options.tags).sort(), ['home-products', 'home-solutions']);
    assert.ok([...f.entries.values()].every(e => e.value.revalidate === 300));
});
test('a failed cold read rejects without storing null, and a later read recovers', async () => {
    const f = fixture();
    f.setFail(true);
    await assert.rejects(f.render(() => f.data.getHomeFeaturedProducts()), /DB unavailable/);
    assert.equal(f.entries.size, 0);
    f.setFail(false);
    assert.equal((await f.render(() => f.data.getHomeFeaturedProducts())).products[0].price, 12);
});
test('Next stale refresh failure retains the last successful price', async (t) => {
    const f = fixture();
    await f.render(() => f.data.getHomeFeaturedProducts());
    f.setStale(true);
    f.setFail(true);
    const expectedWarning = t.mock.method(console, 'error', () => { });
    const result = await f.render(() => f.data.getHomeFeaturedProducts());
    assert.equal(result.products[0].price, 12);
    assert.equal(expectedWarning.mock.callCount(), 1);
    assert.equal(JSON.parse([...f.entries.values()][0].value.data.body).products[0].price, 12);
    f.setFail(false);
    f.setPrice(17);
    assert.equal((await f.render(() => f.data.getHomeFeaturedProducts())).products[0].price, 17);
});
for (const section of ['products', 'solutions'])
    test(`${section} invalidation expires data immediately and invalidates homepage HTML`, async () => {
        const f = fixture();
        await f.render(() => Promise.all([f.data.getHomeFeaturedProducts(), f.data.getHomeSolutions()]));
        const store = { route: '/api/admin/test', page: '/api/admin/test/route', incrementalCache: f.incrementalCache };
        workAsyncStorage.run(store, () => homeCache.invalidateHomeCache(section));
        assert.ok(store.pendingRevalidatedTags.some(e => e.tag === `home-${section}` && e.profile?.expire === 0));
        assert.ok(store.pendingRevalidatedTags.some(e => e.tag === '_N_T_/'));
        // Apply the invalidation tokens to the fixture cache, as a cache handler would.
        for (const [key, entry] of f.entries)
            if (entry.options.tags.includes(`home-${section}`))
                f.entries.delete(key);
        f.setPrice(29);
        const result = await f.render(() => Promise.all([f.data.getHomeFeaturedProducts(), f.data.getHomeSolutions()]));
        assert.deepEqual(f.counts(), section === 'products' ? { productCalls: 2, solutionCalls: 1 } : { productCalls: 1, solutionCalls: 2 });
        assert.equal(result[0].products[0].price, section === 'products' ? 29 : 12);
    });
