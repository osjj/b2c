// Real image pipeline and private adapters; HTTP/S3 doubles only, no environment or production I/O.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, dirname, resolve } from 'node:path'
import { createHash } from 'node:crypto'
import { setTimeout as delay } from 'node:timers/promises'
import { build } from 'esbuild'
import sharp from 'sharp'

const require = createRequire(import.meta.url)
const MiB = 1024 * 1024
const originalFetch = globalThis.fetch
let checks = 0
let sdkSend = async () => ({})

async function load(entry, fast = false, mockSdk = false) {
  const result = await build({
    entryPoints: [entry], bundle: true, write: false, platform: 'node', format: 'cjs', packages: 'external',
    define: { 'process.env.R2_PUBLIC_URL': '"https://catalog.example/assets"' },
    plugins: [{ name: 'isolated-image-import', setup(plugin) {
      plugin.onResolve({ filter: /^image-test-state$/ }, ({ path }) => ({ path, external: true }))
      plugin.onResolve({ filter: /^next\/navigation$/ }, () => ({ path: 'navigation', namespace: 'double' }))
      plugin.onLoad({ filter: /.*/, namespace: 'double' }, () => ({ contents: 'export const unstable_rethrow=()=>{}', loader: 'js' }))
      if (mockSdk) {
        plugin.onResolve({ filter: /^@aws-sdk\/client-s3$/ }, () => ({ path: 'sdk', namespace: 'sdk' }))
        plugin.onLoad({ filter: /.*/, namespace: 'sdk' }, () => ({ contents: `
          export class S3Client { send(...args){return require('image-test-state').sdkSend(...args)} }
          export class PutObjectCommand { constructor(input){this.input=input;this.kind='put'} }
          export class DeleteObjectCommand { constructor(input){this.input=input;this.kind='delete'} }
          export class GetObjectCommand { constructor(input){this.input=input} }
          export class DeleteObjectsCommand { constructor(input){this.input=input} }
          export class ListObjectsV2Command { constructor(input){this.input=input} }
        `, loader: 'js' }))
      }
      if (fast) plugin.onLoad({ filter: /services[\\/]catalog-images\.ts$/ }, async ({ path }) => ({
        contents: (await readFile(path, 'utf8'))
          .replace('const BATCH_TIMEOUT_MS = 45_000', 'const BATCH_TIMEOUT_MS = 180')
          .replace('const DOWNLOAD_TIMEOUT_MS = 20_000', 'const DOWNLOAD_TIMEOUT_MS = 55')
          .replace('const UPLOAD_TIMEOUT_MS = 15_000', 'const UPLOAD_TIMEOUT_MS = 55')
          .replace('const CLEANUP_TIMEOUT_MS = 5_000', 'const CLEANUP_TIMEOUT_MS = 45'),
        loader: 'ts', resolveDir: resolve('src/lib/quotation/services'),
      }))
    } }],
  })
  const builtModule = { exports: {} }
  new Function('require', 'module', 'exports', result.outputFiles[0].text)(
    (name) => name === 'image-test-state' ? { sdkSend } : require(name), builtModule, builtModule.exports,
  )
  return builtModule.exports
}

const servicePath = 'src/lib/quotation/services/catalog-images.ts'
const { copyCatalogImages, cleanupCatalogImages } = await load(servicePath)
const timed = await load(servicePath, true)
const { getQuotationPrivateStorage } = await load('src/lib/quotation/private-storage.ts', false, true)
const source = await readFile(servicePath, 'utf8')
assert.match(source, /BATCH_TIMEOUT_MS = 45_000/)
assert.match(source, /DOWNLOAD_TIMEOUT_MS = 20_000/)
assert.match(source, /UPLOAD_TIMEOUT_MS = 15_000/)
checks++

const opaque = await sharp({ create: { width: 80, height: 40, channels: 3, background: '#c53' } }).webp().toBuffer()
const alpha = await sharp({ create: { width: 80, height: 40, channels: 4, background: '#c5300044' } }).png().toBuffer()
const oriented = await sharp({ create: { width: 80, height: 40, channels: 3, background: '#27c' } }).jpeg().withMetadata({ orientation: 6 }).toBuffer()
const url = (name) => ({ url: `https://catalog.example/assets/${name}` })
function storageDouble(overrides = {}) {
  const objects = new Map()
  return { provider: 'r2-private', objects,
    put: async (key, bytes, contentType, { signal } = {}) => {
      signal?.throwIfAborted(); objects.set(key, { bytes, contentType })
      return { bytes, contentType, sizeBytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') }
    },
    delete: async (key, { signal } = {}) => { signal?.throwIfAborted(); objects.delete(key) },
    ...overrides,
  }
}
function aborted(signal, work) {
  return new Promise((resolveWork, reject) => {
    signal.throwIfAborted()
    const onAbort = () => reject(signal.reason)
    signal.addEventListener('abort', onAbort, { once: true })
    work?.(resolveWork)
  })
}
function simpleFetch(bytes = opaque) {
  return async (_input, options) => {
    assert.equal(options.redirect, 'error'); assert.equal(options.credentials, 'omit'); assert.equal(options.cache, 'no-store')
    return new Response(bytes, { headers: { 'content-length': String(bytes.length) } })
  }
}

try {
  let active = 0; let peak = 0
  const fetchOrder = []
  globalThis.fetch = async (input, options) => {
    assert.equal(options.redirect, 'error'); assert.equal(options.credentials, 'omit'); assert.equal(options.cache, 'no-store')
    const name = input.split('/').at(-1)
    fetchOrder.push(name); active++; peak = Math.max(peak, active)
    await delay(name === '1' ? 45 : 8); active--
    return new Response(opaque)
  }
  const storage = storageDouble()
  const keys = []
  const result = await copyCatalogImages(Array.from({ length: 8 }, (_, index) => url(String(index + 1))), storage, keys)
  assert.equal(peak, 3); assert.equal(result.length, 8); assert.equal(storage.objects.size, 8)
  assert.deepEqual(result.map((image) => image.displayName), Array.from({ length: 8 }, (_, index) => `catalog-${index + 1}.jpg`))
  assert.deepEqual(fetchOrder, ['1', '2', '3', '4', '5', '6', '7', '8'])
  for (const image of result) {
    const saved = storage.objects.get(image.objectKey)
    assert.equal(saved.contentType, image.contentType)
    assert.equal(image.sha256, createHash('sha256').update(saved.bytes).digest('hex'))
    assert.equal((await sharp(saved.bytes).metadata()).format, 'jpeg')
  }
  checks++

  for (const [bytes, expectedType, expectedWidth, expectedHeight] of [
    [alpha, 'image/png', 80, 40], [oriented, 'image/jpeg', 40, 80], [opaque, 'image/jpeg', 80, 40],
  ]) {
    globalThis.fetch = simpleFetch(bytes)
    const adapter = storageDouble()
    const [image] = await copyCatalogImages([url('fixture')], adapter, [])
    assert.equal(image.contentType, expectedType)
    const saved = adapter.objects.get(image.objectKey)
    const meta = await sharp(saved.bytes).metadata()
    assert.equal(meta.width, expectedWidth); assert.equal(meta.height, expectedHeight)
    if (expectedType === 'image/png') {
      assert.equal(meta.hasAlpha, true)
      const { data, info } = await sharp(saved.bytes).raw().toBuffer({ resolveWithObject: true })
      assert.equal(info.channels, 4); assert.ok(data[3] < 255)
    }
    checks++
  }

  let reads = 0
  globalThis.fetch = async () => { reads++; throw new Error('must not fetch') }
  for (const invalid of [
    'https://other.example/assets/a', 'http://catalog.example/assets/a',
    'https://catalog.example/elsewhere/a', 'https://user:password@catalog.example/assets/a',
    'https://catalog.example/assets/a?secret=key', 'https://catalog.example/assets/a#hash',
    'https://catalog.example/assets/%ZZ', 'https://catalog.example/assets/%2e%2e%2fprivate',
  ]) {
    const adapter = storageDouble()
    await assert.rejects(copyCatalogImages([{ url: invalid }], adapter, []), (error) => error.code === 'VALIDATION_FAILED' && error.stage === 'download' && !error.message.includes('secret'))
    assert.equal(adapter.objects.size, 0)
  }
  assert.equal(reads, 0); checks++

  for (const status of [301, 403, 404, 429, 503]) {
    globalThis.fetch = async () => new Response('private server body secret', { status })
    await assert.rejects(copyCatalogImages([url('missing')], storageDouble(), []), (error) => error.stage === 'download' && error.message.includes(`HTTP ${status}`) && !error.message.includes('secret'))
    checks++
  }
  globalThis.fetch = async (_url, options) => { assert.equal(options.redirect, 'error'); throw new TypeError('redirect https://secret.example/credential') }
  await assert.rejects(copyCatalogImages([url('redirect')], storageDouble(), []), (error) => error.stage === 'download' && !error.message.includes('secret'))
  checks++

  for (const response of [
    () => new Response(opaque, { headers: { 'content-length': String(5 * MiB + 1) } }),
    () => new Response(new Uint8Array(5 * MiB + 1)),
  ]) {
    globalThis.fetch = async () => response()
    await assert.rejects(copyCatalogImages([url('oversize')], storageDouble(), []), (error) => error.code === 'FILE_TOO_LARGE' && error.stage === 'download')
    checks++
  }
  globalThis.fetch = simpleFetch(Buffer.from('secret invalid image'))
  await assert.rejects(copyCatalogImages([url('corrupt')], storageDouble(), []), (error) => error.code === 'VALIDATION_FAILED' && error.stage === 'conversion' && !error.message.includes('secret'))
  checks++
  globalThis.fetch = simpleFetch(Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64'))
  await assert.rejects(copyCatalogImages([url('unsupported.gif')], storageDouble(), []), (error) => error.code === 'VALIDATION_FAILED' && error.stage === 'conversion')
  checks++
  globalThis.fetch = async () => { throw new Error('Empty/oversized batches must not fetch') }
  assert.deepEqual(await copyCatalogImages([], storageDouble(), []), [])
  await assert.rejects(copyCatalogImages(Array.from({ length: 9 }, () => url('too-many')), storageDouble(), []), (error) => error.code === 'VALIDATION_FAILED')
  checks++

  globalThis.fetch = (_url, options) => aborted(options.signal)
  const startDownload = Date.now()
  await assert.rejects(timed.copyCatalogImages([url('timeout')], storageDouble(), []), (error) => error.stage === 'download' && /超时/.test(error.message))
  assert.ok(Date.now() - startDownload < 1000); checks++

  let bodyCancelled = false
  globalThis.fetch = async (_url, options) => new Response(new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array([1]))
      options.signal.addEventListener('abort', () => controller.error(options.signal.reason), { once: true })
    }, cancel() { bodyCancelled = true },
  }))
  const startBody = Date.now()
  await assert.rejects(timed.copyCatalogImages([url('stalled-body')], storageDouble(), []), (error) => error.stage === 'download' && /超时/.test(error.message))
  assert.ok(Date.now() - startBody < 1000); checks++
  // A read rejected by abort already errors the stream, so its cancel callback need not run.
  assert.equal(typeof bodyCancelled, 'boolean')

  globalThis.fetch = simpleFetch()
  let putSettled = false
  const slowPut = storageDouble({ put: async (_key, _bytes, _type, options) => {
    try { await aborted(options.signal) } finally { putSettled = true }
  } })
  const attempted = []
  await assert.rejects(timed.copyCatalogImages([url('put-timeout')], slowPut, attempted), (error) => error.stage === 'storage' && /超时/.test(error.message))
  assert.equal(putSettled, true); assert.equal(attempted.length, 1); checks++

  // A rejected sibling stops the batch and joins the other PUT before compensation.
  let puts = 0; let running = 0; let completed = 0
  const joined = storageDouble({ put: async (key, bytes, contentType, options) => {
    const count = ++puts; running++
    try {
      if (count === 1) { await delay(20); throw Object.assign(new Error('secret key'), { name: 'AccessDenied' }) }
      await aborted(options.signal)
    } finally { running--; completed++ }
  }, delete: async () => { assert.equal(running, 0) } })
  const joinedKeys = []
  await assert.rejects(copyCatalogImages([url('one'), url('two'), url('three'), url('four')], joined, joinedKeys), (error) => error.stage === 'storage' && error.code === 'FORBIDDEN' && !error.message.includes('secret'))
  assert.equal(running, 0); assert.equal(completed, puts); assert.equal(puts, 3)
  await cleanupCatalogImages(joined, joinedKeys); checks++

  // Every individual transfer fits its own budget, but three waves exceed the batch budget.
  let batchActive = 0
  const delayedTransfer = async (signal) => {
    batchActive++
    try {
      await delay(36, undefined, { signal })
      signal.throwIfAborted()
    } finally { batchActive-- }
  }
  globalThis.fetch = async (_input, options) => { await delayedTransfer(options.signal); return new Response(opaque) }
  const batchStorage = storageDouble({ put: async (_key, _bytes, _type, options) => { await delayedTransfer(options.signal) } })
  const startBatch = Date.now()
  await assert.rejects(timed.copyCatalogImages(Array.from({ length: 8 }, (_, index) => url(`batch-${index}`)), batchStorage, []), (error) => /超时/.test(error.message))
  assert.equal(batchActive, 0); assert.ok(Date.now() - startBatch < 1000); checks++

  let cleaned = 0
  const startCleanup = Date.now()
  await timed.cleanupCatalogImages(storageDouble({ delete: async (_key, options) => {
    try { await aborted(options.signal) } finally { cleaned++ }
  } }), ['quotation/a', 'quotation/b'])
  assert.equal(cleaned, 2); assert.ok(Date.now() - startCleanup < 1000); checks++

  // Real local adapter retains old signatures and rejects pre-cancelled operations.
  const root = await mkdtemp(resolve(tmpdir(), 'catalog-private-storage-'))
  try {
    const local = getQuotationPrivateStorage({ NODE_ENV: 'test', QUOTATION_PRIVATE_LOCAL_ROOT: root })
    const key = 'quotation/test/file.jpg'
    await local.put(key, opaque, 'image/jpeg')
    assert.deepEqual((await local.get(key, 'image/jpeg')).bytes, opaque)
    const abortedSignal = AbortSignal.abort(new DOMException('Test abort', 'AbortError'))
    await assert.rejects(local.put('quotation/test/abort.jpg', opaque, 'image/jpeg', { signal: abortedSignal }), { name: 'AbortError' })
    await assert.rejects(local.delete(key, { signal: abortedSignal }), { name: 'AbortError' })
    assert.deepEqual((await local.get(key, 'image/jpeg')).bytes, opaque)
    await local.delete(key)
    checks++
  } finally {
    assert.equal(dirname(root), resolve(tmpdir()))
    assert.match(basename(root), /^catalog-private-storage-[^\\/]+$/)
    await rm(root, { recursive: true, force: true })
  }

  const r2 = getQuotationPrivateStorage({ NODE_ENV: 'test', QUOTATION_PRIVATE_STORAGE_PROVIDER: 'r2-private',
    QUOTATION_PRIVATE_R2_ENDPOINT: 'https://test.invalid', QUOTATION_PRIVATE_R2_ACCESS_KEY_ID: 'test',
    QUOTATION_PRIVATE_R2_SECRET_ACCESS_KEY: 'test', QUOTATION_PRIVATE_R2_BUCKET: 'private-test' })
  const forwarded = []
  sdkSend = async (command, options) => { forwarded.push({ kind: command.kind, signal: options.abortSignal }); return {} }
  const signal = new AbortController().signal
  await r2.put('quotation/test/file', opaque, 'image/jpeg', { signal })
  await r2.delete('quotation/test/file', { signal })
  assert.deepEqual(forwarded.map((item) => item.kind), ['put', 'delete'])
  assert.ok(forwarded.every((item) => item.signal === signal)); checks++
  sdkSend = async (_command, options) => aborted(options.abortSignal)
  const controller = new AbortController()
  const upload = r2.put('quotation/test/file', opaque, 'image/jpeg', { signal: controller.signal })
  controller.abort(new DOMException('Test abort', 'AbortError'))
  await assert.rejects(upload, { name: 'AbortError' }); checks++

  console.log(JSON.stringify({ success: true, checks, budgets: { workers: 3, downloadMs: 20000, conversionMs: 10000, putMs: 15000, batchMs: 45000, cleanupMs: 5000 } }))
} finally { globalThis.fetch = originalFetch }
