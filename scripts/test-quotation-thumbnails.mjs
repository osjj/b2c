// Real Sharp/helper/route tests with isolated auth, DB and storage. No .env or network.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { build } from 'esbuild'
import sharp from 'sharp'

const nodeRequire = createRequire(import.meta.url)
const environment = { NODE_ENV: 'production', QUOTATION_WORKBENCH_ENABLED: 'true' }
const state = { authorized: true, file: null, reads: 0, dbReads: 0, options: [], bytes: null }
const storage = {
  provider: 'r2-private',
  async get(_key, contentType, options) {
    state.reads++
    state.options.push(options)
    const bytes = state.bytes
    return { bytes, contentType, sizeBytes: bytes.length, sha256: hash(bytes) }
  },
}
const db = {
  quotationSourceFile: { async findFirst({ where }) {
    state.dbReads++
    assert.equal(where.securityStatus, 'CLEAN')
    assert.equal(where.deletedAt, null)
    return state.file?.securityStatus === 'CLEAN' && !state.file.deletedAt ? state.file : null
  } },
  salesQuotationItemAsset: { async findUnique() { state.dbReads++; return state.file } },
}
const mocks = {
  '@/lib/prisma': 'export const prisma = require("thumbnail-test-state").db',
  '@/lib/auth-utils': 'export async function requireAdmin() { if (!require("thumbnail-test-state").state.authorized) throw new Error("Denied") }',
  '@/lib/quotation/private-storage': 'export function getQuotationPrivateStorage() { return require("thumbnail-test-state").storage }',
  'next/navigation': 'export function unstable_rethrow() {}',
}
async function load(entry) {
  const built = await build({ entryPoints: [entry], bundle: true, write: false, platform: 'node', format: 'cjs', packages: 'external',
    define: { 'process.env': '__thumbnailEnvironment' },
    plugins: [{ name: 'isolated-thumbnails', setup(plugin) {
      plugin.onResolve({ filter: /.*/ }, ({ path }) => {
        if (path in mocks) return { path, namespace: 'mock' }
        if (path === 'thumbnail-test-state') return { path, external: true }
      })
      plugin.onLoad({ filter: /.*/, namespace: 'mock' }, ({ path }) => ({ contents: mocks[path], loader: 'js' }))
    } }],
  })
  const loadedModule = { exports: {} }
  new Function('require', 'module', 'exports', '__thumbnailEnvironment', built.outputFiles[0].text)(
    (name) => name === 'thumbnail-test-state' ? { state, db, storage } : nodeRequire(name), loadedModule, loadedModule.exports, environment,
  )
  return loadedModule.exports
}
function hash(bytes) { return createHash('sha256').update(bytes).digest('hex') }
const helper = await load('src/lib/quotation/private-thumbnails.ts')
const { GET } = await load('src/app/api/admin/quotation-images/[id]/route.ts')
const sourceId = '5b99f218-8d88-45b0-a26d-19d45d4919ef'
const legacyId = 'cmuy1oip600bzb8uwmmsv4q37'
function fileFor(bytes, extra = {}) {
  return { id: sourceId, objectKey: 'quotation/test/product.png', displayName: 'product.png', contentType: 'image/png', sizeBytes: bytes.length,
    sha256: hash(bytes), storageProvider: 'r2-private', securityStatus: 'CLEAN', deletedAt: null, ...extra }
}
function request(query = 'kind=source&variant=thumbnail', headers = {}, id = sourceId) {
  return GET(new Request(`https://isolated.test/api/admin/quotation-images/${id}?${query}`, { headers }), { params: Promise.resolve({ id }) })
}

// A transparent large image becomes a small, bounded derivative, with alpha preserved.
state.bytes = await sharp({ create: { width: 1600, height: 800, channels: 4, background: { r: 20, g: 100, b: 200, alpha: 0.5 } } }).png().toBuffer()
state.file = fileFor(state.bytes)
const originalBytes = Buffer.from(state.bytes)
const first = await request()
assert.equal(first.status, 200)
assert.equal(first.headers.get('content-type'), 'image/webp')
assert.equal(first.headers.get('cache-control'), 'private, no-cache, must-revalidate')
assert.equal(first.headers.get('vary'), 'Cookie')
const thumbnail = Buffer.from(await first.arrayBuffer())
const metadata = await sharp(thumbnail).metadata()
assert.equal(metadata.width, 480)
assert.equal(metadata.height, 240)
assert.equal(metadata.hasAlpha, true)
assert.ok(thumbnail.length < originalBytes.length)
assert.deepEqual(state.bytes, originalBytes)
assert.deepEqual(state.options.at(-1), { maxBytes: 12 * 1024 * 1024 })
const initialReads = state.reads
const etag = first.headers.get('etag')
assert.ok(etag)
assert.equal((await request()).status, 200)
assert.equal(state.reads, initialReads, 'transformed bytes should be reused')
assert.equal((await request(undefined, { 'if-none-match': `"unrelated", W/${etag}` })).status, 304)
assert.equal(state.reads, initialReads, 'validated 304 needs no storage read')

// A warm cache/ETag never bypasses current auth, gate, source status or provider validation.
const beforeDenied = [state.reads, state.dbReads]
state.authorized = false
assert.equal((await request(undefined, { 'if-none-match': etag })).status, 400)
assert.deepEqual([state.reads, state.dbReads], beforeDenied)
state.authorized = true
environment.QUOTATION_WORKBENCH_ENABLED = 'false'
assert.equal((await (await request()).json()).code, 'FEATURE_DISABLED')
assert.deepEqual([state.reads, state.dbReads], beforeDenied)
environment.QUOTATION_WORKBENCH_ENABLED = 'true'
state.file.deletedAt = new Date()
assert.equal((await request(undefined, { 'if-none-match': etag })).status, 400)
state.file.deletedAt = null
state.file.securityStatus = 'REJECTED'
assert.equal((await request(undefined, { 'if-none-match': etag })).status, 400)
state.file.securityStatus = 'CLEAN'
state.file.storageProvider = 'local'
assert.equal((await request(undefined, { 'if-none-match': etag })).status, 400)
state.file.storageProvider = 'r2-private'
assert.equal(state.reads, initialReads)

// Invalid controls, oversized metadata, corrupt bytes, MIME mismatch and integrity fail closed.
assert.equal((await request('kind=source&variant=huge')).status, 400)
assert.equal((await request('kind=source&variant=thumbnail', {}, 'bad-id')).status, 400)
state.file = fileFor(state.bytes, { sizeBytes: 12 * 1024 * 1024 + 1 })
assert.equal((await (await request()).json()).code, 'FILE_TOO_LARGE')
assert.equal(state.reads, initialReads)
state.file = fileFor(state.bytes, { sha256: 'a'.repeat(64) })
assert.equal((await (await request()).json()).code, 'DOCUMENT_VALIDATION_FAILED')
const failedReads = state.reads
assert.equal((await request()).status, 400)
assert.equal(state.reads, failedReads + 1, 'failed work is not cached')
state.bytes = Buffer.from('not an image')
state.file = fileFor(state.bytes)
assert.equal((await (await request()).json()).code, 'VALIDATION_FAILED')

// Small sources are not enlarged; PNG cannot masquerade as JPEG; excessive pixels reject.
state.bytes = await sharp({ create: { width: 24, height: 12, channels: 3, background: '#123456' } }).png().toBuffer()
state.file = fileFor(state.bytes)
assert.equal((await sharp(Buffer.from(await (await request()).arrayBuffer())).metadata()).width, 24)
state.file = fileFor(state.bytes, { contentType: 'image/jpeg' })
assert.equal((await (await request()).json()).code, 'VALIDATION_FAILED')
state.bytes = await sharp({ create: { width: 8000, height: 5001, channels: 3, background: '#ffffff' } }).png().toBuffer()
state.file = fileFor(state.bytes)
assert.equal((await (await request()).json()).code, 'VALIDATION_FAILED')

// Legacy source/asset identifiers work, originals remain original and never use 304/cache.
state.bytes = originalBytes
state.file = fileFor(state.bytes)
assert.equal((await request('kind=source&variant=thumbnail', {}, legacyId)).status, 200)
delete state.file.storageProvider // Item assets have no provider column in the existing schema.
assert.equal((await request('kind=asset&variant=thumbnail', {}, legacyId)).status, 200)
state.file.storageProvider = 'r2-private'
const beforeOriginal = state.reads
const original = await request('kind=source', { 'if-none-match': etag })
assert.equal(original.status, 200)
assert.equal(original.headers.get('cache-control'), 'private, no-store')
assert.equal(original.headers.get('etag'), null)
assert.deepEqual(Buffer.from(await original.arrayBuffer()), originalBytes)
assert.equal(state.reads, beforeOriginal + 1)
assert.equal(state.options.at(-1), undefined)

// Cache is bounded by bytes/count/TTL, de-duplicates pending work, and caps concurrency/queue.
let clock = 0
let calls = 0
const cache = helper.createThumbnailCache({ maxBytes: 8, maxEntries: 2, ttlMs: 10, now: () => clock, maxConcurrent: 1, maxPending: 1 })
const loadBytes = async () => { calls++; return Buffer.alloc(4) }
await cache.get('a', loadBytes); await cache.get('b', loadBytes); await cache.get('a', loadBytes)
assert.equal(calls, 2)
await cache.get('c', loadBytes); await cache.get('b', loadBytes)
assert.equal(calls, 4, 'least recently used entry evicted')
clock = 11
await cache.get('b', loadBytes)
assert.equal(calls, 5, 'expired entry fetched again')
await cache.get('large', async () => Buffer.alloc(9))
await cache.get('large', async () => { calls++; return Buffer.alloc(9) })
assert.equal(calls, 6, 'oversized entry is not retained')
let release
let active = 0
let peak = 0
const wait = () => new Promise(resolve => { release = resolve })
const running = cache.get('running', async () => { active++; peak = Math.max(peak, active); await wait(); active--; return Buffer.alloc(1) })
const duplicate = cache.get('running', async () => { throw new Error('duplicate ran') })
const queued = cache.get('queued', async () => { active++; peak = Math.max(peak, active); active--; return Buffer.alloc(1) })
await assert.rejects(cache.get('overflow', loadBytes))
release()
await Promise.all([running, duplicate, queued])
assert.equal(peak, 1)
await assert.rejects(cache.get('failed', async () => { throw new Error('failed') }))
await cache.get('failed', loadBytes)
assert.equal(calls, 7)
assert.equal(helper.thumbnailEtagMatches('*', '"test"'), true)
assert.equal(helper.thumbnailEtagMatches('"other"', '"test"'), false)
process.stdout.write(`PASS: private thumbnail bounds, alpha, cache/ETag, authorization, status, provider, corruption, identifiers, originals, LRU/TTL/dedup/concurrency. Representative image ${originalBytes.length} → ${thumbnail.length} bytes. No DB or R2 contacted.\n`)
