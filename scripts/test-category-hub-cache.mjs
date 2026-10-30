// Render the actual page and exercise successful/failed mutations without a database.
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { z } from 'zod'
import ts from 'typescript'

const require = createRequire(import.meta.url)
async function load(file, overrides = {}) {
  const source = await readFile(new URL(file, import.meta.url), 'utf8')
  const compiled = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText
  const exports = {}
  new Function('require', 'exports', compiled)((id) => {
    if (id in overrides) return overrides[id]
    if (id.startsWith('@/')) throw new Error(`Unexpected dependency ${id}`)
    return require(id)
  }, exports)
  return exports
}

const navigation = await load('../src/lib/product-category-navigation.ts')
const categoryContent = await load('../src/lib/category-seo-content.ts')
const expected = [
  'fall-protection', 'respiratory-protection', 'body-protection', 'hand-protection',
  'hearing-protection', 'head-protection', 'firefighting-equipment', 'eye-protection',
  'rainwear', 'foot-protection', 'other-supplies',
]
let reads = 0
const catalog = [...expected, 'uncategorized', 'hidden'].map((slug) => ({
  id: slug, slug, name: slug, description: `${slug} current description`, image: null,
  isActive: slug !== 'hidden', sortOrder: 0, children: [],
  parentId: slug === 'hearing-protection' ? 'head-protection' : slug === 'rainwear' ? 'body-protection' : null,
  parent: slug === 'hearing-protection' ? { slug: 'head-protection', isActive: true }
    : slug === 'rainwear' ? { slug: 'body-protection', isActive: true } : null,
})).reverse()
const page = await load('../src/app/(store)/categories/page.tsx', {
  'next/link': ({ children, href, ...props }) => createElement('a', { href, ...props }, children),
  'next/image': (props) => {
    const imageProps = { ...props }
    delete imageProps.fill
    delete imageProps.priority
    return createElement('img', imageProps)
  },
  '@/actions/categories': { getCategories: async () => { reads++; return catalog } },
  '@/lib/product-category-navigation': navigation,
  '@/lib/category-seo-content': categoryContent,
  '@/lib/seo-title': { buildPageTitle: (title) => `${title} | Laifappe` },
  '@/lib/site-url': { getSiteUrl: () => 'https://www.laifappe.com' },
})
assert.equal(page.dynamic, 'force-dynamic')
const first = renderToStaticMarkup(await page.default())
const names = [...first.matchAll(/<h2\b[^>]*>([^<]+)<\/h2>/g)].map((match) => match[1])
assert.deepEqual(names, expected)
assert.ok(first.includes('href="/categories/head-protection/hearing-protection"'))
assert.ok(first.includes('href="/categories/body-protection/rainwear"'))
assert.ok(!first.includes('/categories/uncategorized'))
assert.ok(!first.includes('<img')) // Missing category media gets an icon, not a broken URL.
assert.ok(first.includes('<svg'))
for (const slug of ['head-protection', 'eye-protection', 'hearing-protection', 'firefighting-equipment', 'other-supplies']) {
  const category = catalog.find((item) => item.slug === slug)
  const description = categoryContent.getCategorySeoContent(category, category.parent).heroDescription
  assert.ok(description, `Expected reviewed summary for ${slug}`)
  const encoded = renderToStaticMarkup(createElement('span', null, description)).slice(6, -7)
  assert.ok(first.includes(encoded), `Reviewed summary missing from ${slug} card`)
  assert.ok(!first.includes(category.description), `Stale database summary still visible on ${slug} card`)
}
assert.ok(first.includes('fall-protection current description'))
catalog.find(({ slug }) => slug === 'eye-protection').name = 'Updated Eye & Face Protection'
const second = renderToStaticMarkup(await page.default())
assert.ok(second.includes('Updated Eye &amp; Face Protection'))
assert.equal(reads, 2)
assert.equal(page.metadata.alternates.canonical, 'https://www.laifappe.com/categories')

function mutationHarness({ denied = false, duplicate = false, products = 0 } = {}) {
  const invalidations = []
  let writes = 0
  const category = { slug: 'sample', isActive: true, parent: null, children: [] }
  return {
    invalidations,
    writes: () => writes,
    dependencies: {
      'next/cache': { revalidatePath: (...args) => invalidations.push(args) },
      'next/navigation': { redirect: () => { throw new Error('ADMIN_REDIRECT') } },
      '@prisma/client': {},
      '@/lib/prisma': { prisma: { category: {
        findUnique: async ({ where }) => where.slug ? (duplicate ? category : null) : category,
        findFirst: async () => null,
        create: async () => { writes++ }, update: async () => { writes++ }, delete: async () => { writes++ },
        count: async () => 0,
      }, product: { count: async () => products } } },
      zod: { z },
      '@/lib/auth-utils': { requireAdmin: async () => { if (denied) throw new Error('DENIED') } },
      '@/lib/indexnow-auto': { collectCategoryIndexNowUrls: () => [], scheduleIndexNowUrls: () => {} },
    },
  }
}
function form(name = 'Sample') {
  const value = new FormData()
  value.set('name', name)
  value.set('slug', 'sample')
  value.set('isActive', 'true')
  return value
}
for (const operation of ['createCategory', 'updateCategory', 'deleteCategory']) {
  const h = mutationHarness()
  const actions = await load('../src/actions/categories.ts', h.dependencies)
  if (operation === 'createCategory') await assert.rejects(actions[operation]({}, form()), /ADMIN_REDIRECT/)
  else if (operation === 'updateCategory') await assert.rejects(actions[operation]('id', {}, form()), /ADMIN_REDIRECT/)
  else await actions[operation]('id')
  assert.equal(h.writes(), 1)
  assert.deepEqual(h.invalidations, [['/admin/categories'], ['/products'], ['/categories', 'layout']])
}
for (const options of [{ denied: true }, { duplicate: true }]) {
  const h = mutationHarness(options)
  const actions = await load('../src/actions/categories.ts', h.dependencies)
  if (options.denied) await assert.rejects(actions.createCategory({}, form()), /DENIED/)
  else assert.equal((await actions.createCategory({}, form())).error, 'Slug already exists')
  assert.equal(h.writes(), 0)
  assert.deepEqual(h.invalidations, [])
}
const invalid = mutationHarness()
const actions = await load('../src/actions/categories.ts', invalid.dependencies)
assert.ok((await actions.createCategory({}, form(''))).errors)
assert.equal(invalid.writes(), 0)
assert.deepEqual(invalid.invalidations, [])
const blocked = mutationHarness({ products: 1 })
const deleteActions = await load('../src/actions/categories.ts', blocked.dependencies)
await assert.rejects(deleteActions.deleteCategory('id'), /Cannot delete category with products/)
assert.equal(blocked.writes(), 0)
assert.deepEqual(blocked.invalidations, [])
process.stdout.write('Category hub freshness, shared navigation, fallback media, and successful/failed mutation invalidation boundaries passed.\n')
