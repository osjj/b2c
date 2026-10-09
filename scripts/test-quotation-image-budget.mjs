// Real finalizer, preview route and renderers; all DB/storage/AI I/O is isolated.
// Does not load .env, production data or credentials.
import assert from 'node:assert/strict'
import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { createRequire } from 'node:module'
import { build } from 'esbuild'
import sharp from 'sharp'

const nodeRequire = createRequire(import.meta.url)
const rawImage = randomBytes(600 * 600 * 3)
const sourceImages = await Promise.all(Array.from({ length: 36 }, async (_, index) => {
  const bytes = await sharp(rawImage, { raw: { width: 600, height: 600, channels: 3 } })
    .linear([1, 1, 1], [index, 0, 0]).png().toBuffer()
  return { bytes, sha256: createHash('sha256').update(bytes).digest('hex'), sizeBytes: bytes.length, contentType: 'image/png' }
}))
assert.equal(new Set(sourceImages.map(image => image.sha256)).size, 36)
const sourceImageFor = (itemIndex, imageIndex) => sourceImages[itemIndex < 6 ? itemIndex * 4 + imageIndex : 24 + (itemIndex - 6) * 3 + imageIndex]
const sourceImagesByKey = new Map(Array.from({ length: 10 }, (_, index) =>
  Array.from({ length: index < 6 ? 4 : 3 }, (_, order) => [`quotation/source/${index}-${order}.png`, sourceImageFor(index, order)]),
).flat())
const makeRevision = () => ({
  id: 'cmockrevision0000000000000', salesQuotationId: 'cmockquotation000000000000', state: 'DRAFT', version: 1,
  revisionNumber: 1, documentLanguage: 'ENGLISH', templateVersion: 'jordan-ai-v1', quotationDate: new Date('2026-10-07T00:00:00Z'), validUntil: null,
  currency: 'USD', currencyMinorUnit: 2, roundingMode: 'HALF_UP', customerSnapshot: { companyName: 'Isolated Buyer', contacts: [] },
  publicTerms: {}, subtotal: '30.00', discountAmount: '0', discountPercent: null, shippingFee: '0', otherFee: '0', taxRate: '0', taxAmount: '0', roundingAdjustment: '0', total: '30.00', totalCost: null, profit: null,
  salesQuotation: { quotationNumber: 'QT-IMAGE-BUDGET' },
  items: Array.from({ length: 10 }, (_, index) => ({
    id: `cmockitem${String(index).padStart(17, '0')}`, sortOrder: index, quotationProductId: null, productId: null,
    nameEn: `Sample ${index + 1}`, nameZh: null, model: null, sku: null, specifications: ['Material: Cotton'], unit: 'pcs',
    quantity: '3', unitPrice: '1', discountAmount: '0', discountPercent: null, unitCost: null, costCurrency: null, exchangeRate: null,
    internalNotes: null, lineTotal: '3', lineCost: null,
    assets: Array.from({ length: index < 6 ? 4 : 3 }, (_, order) => ({
      id: `cmockasset${index}${order}`, itemId: `cmockitem${String(index).padStart(17, '0')}`,
      assetType: 'PRODUCT_IMAGE', displayName: `sample-${index}-${order}.png`, sortOrder: order,
      objectKey: `quotation/source/${index}-${order}.png`, contentType: 'image/png',
      sizeBytes: sourceImageFor(index, order).sizeBytes, sha256: sourceImageFor(index, order).sha256,
    })),
  })),
})
let revision = makeRevision()
let attempts = [], documents = []
let reads = 0, writes = 0, apiCalls = 0
let simulatedNow = Date.now(), imageReadTime = 0
const heartbeats = []
const objects = new Map()
const matches = (row, where) => Object.entries(where).every(([key, value]) => value && typeof value === 'object' && 'in' in value ? value.in.includes(row[key]) : row[key] === value)
const update = (row, data) => {
  for (const [key, value] of Object.entries(data)) row[key] = value && typeof value === 'object' && 'increment' in value ? row[key] + value.increment : value
  return row
}
const db = {
  setting: { findUnique: async () => null },
  salesQuotationRevision: {
    findUnique: async () => structuredClone(revision),
    update: async ({ data }) => update(revision, data),
    updateMany: async ({ where, data }) => { if (!matches(revision, where)) return { count: 0 }; update(revision, data); return { count: 1 } },
  },
  salesQuotationItem: { update: async ({ where, data }) => update(revision.items.find(item => item.id === where.id), data) },
  salesQuotationItemAsset: { update: async ({ where, data }) => update(revision.items.flatMap(item => item.assets).find(asset => asset.id === where.id), data) },
  salesQuotationDocument: { createMany: async ({ data }) => { documents.push(...data) } },
  quotationAuditLog: { create: async () => ({}) },
  quotationFinalizationAttempt: {
    findUnique: async ({ where }) => { const attempt = attempts.find(row => row.idempotencyKey === where.idempotencyKey); return attempt ? { ...attempt, revision, documents: documents.filter(doc => doc.attemptId === attempt.id) } : null },
    create: async ({ data }) => { attempts.push(data); return data },
    update: async ({ where, data }) => update(attempts.find(row => matches(row, where)), data),
    updateMany: async ({ where, data }) => {
      const rows = attempts.filter(row => matches(row, where))
      rows.forEach(row => update(row, data))
      if (data.heartbeatAt) heartbeats.push({ reads, leaseExpiresAt: Number(data.leaseExpiresAt) })
      return { count: rows.length }
    },
  },
  $transaction: async (work) => {
    const backup = structuredClone({ revision, attempts, documents })
    try { return await work(db) } catch (error) { ({ revision, attempts, documents } = backup); throw error }
  },
}
const storage = {
  provider: 'r2-private',
  get: async (key) => {
    reads++; simulatedNow += imageReadTime
    if (imageReadTime) assert.ok(Number(attempts.at(-1).leaseExpiresAt) > simulatedNow, 'An active image transfer must not outlive its lease')
    const image = sourceImagesByKey.get(key); assert.ok(image, 'Only selected source images may be read'); return image
  },
  put: async (key, bytes) => { writes++; objects.set(key, bytes) },
  move: async (from, to) => { writes++; objects.set(to, objects.get(from)); objects.delete(from) },
  delete: async (key) => { writes++; objects.delete(key) },
}
const mocks = {
  '@/lib/prisma': 'export const prisma=require("quotation-budget-test-state").db;',
  '@/lib/auth-utils': 'export async function requireAdmin(){return {id:"isolated-admin"};}',
  '../private-storage': 'export function getQuotationPrivateStorage(){return require("quotation-budget-test-state").storage;}',
  '@/lib/quotation/private-storage': 'export function getQuotationPrivateStorage(){return require("quotation-budget-test-state").storage;}',
  'next/navigation': 'export function unstable_rethrow(){}',
}
const built = await build({
  stdin: { contents: 'export {finalizeQuotationRevision} from "./src/lib/quotation/services/finalize"; export {GET} from "./src/app/api/admin/quotation-revisions/[id]/preview/route";', resolveDir: process.cwd(), loader: 'ts' },
  bundle: true, write: false, platform: 'node', format: 'cjs', packages: 'external', define: { 'process.env': '__quotationTestEnvironment', 'Date.now': '__quotationNow' },
  plugins: [{ name: 'isolate-budget', setup(plugin) {
    plugin.onResolve({ filter: /.*/ }, ({ path }) => {
      if (path in mocks) return { path, namespace: 'mock' }
      if (path === 'quotation-budget-test-state') return { path, external: true }
    })
    plugin.onLoad({ filter: /.*/, namespace: 'mock' }, ({ path }) => ({ contents: mocks[path], loader: 'js' }))
  } }],
})
const fixtureFetch = async (url, init) => {
  assert.equal(url, 'https://example.test/v1/chat/completions')
  apiCalls++
  const input = JSON.parse(JSON.parse(init.body).messages[1].content)
  return Response.json({ choices: [{ message: { content: JSON.stringify({ items: input.items.map(item => ({ position: item.position, imageColumns: 2, noteIndices: [] })) }) }, finish_reason: 'stop' }] })
}
const loaded = { exports: {} }
new Function('require', 'module', 'exports', '__quotationTestEnvironment', 'fetch', '__quotationNow', built.outputFiles[0].text)(
  name => name === 'quotation-budget-test-state' ? { db, storage } : nodeRequire(name), loaded, loaded.exports,
  { NODE_ENV: 'test', OPENAI_API_ENDPOINT: 'https://example.test', OPENAI_API_KEY: 'test-only' }, fixtureFetch, () => simulatedNow,
)
const reset = () => { revision = makeRevision(); attempts = []; documents = []; objects.clear(); reads = 0; writes = 0; apiCalls = 0; imageReadTime = 0; simulatedNow = Date.now(); heartbeats.length = 0 }
const finalizeInput = () => ({ revisionId: revision.id, expectedVersion: revision.version, idempotencyKey: randomUUID() })
const preview = () => loaded.exports.GET(new Request(`https://example.test/preview?version=${revision.version}`), { params: Promise.resolve({ id: revision.id }) })
const selectedBytes = revision.items.flatMap(item => item.assets).reduce((sum, asset) => sum + asset.sizeBytes, 0)
assert.ok(selectedBytes > 20 * 1024 * 1024 && selectedBytes < 64 * 1024 * 1024)
let response = await preview()
assert.equal(response.status, 200)
assert.equal(Buffer.from(await response.arrayBuffer()).subarray(0, 4).toString(), '%PDF')
assert.equal(reads, 36); assert.equal(writes, 0); assert.equal(apiCalls, 0)
assert.equal(revision.state, 'DRAFT'); assert.equal(revision.version, 1); assert.equal(documents.length, 0)
reset()
const input = finalizeInput()
const result = await loaded.exports.finalizeQuotationRevision(input, 'isolated-admin')
assert.equal(result.status, 'FINALIZED'); assert.equal(documents.length, 4)
assert.equal(reads, 36); assert.equal(apiCalls, 2)
const saved = JSON.parse(objects.get(documents.find(doc => doc.documentType === 'SNAPSHOT_JSON').objectKey).toString())
assert.equal(saved.items.length, 10); assert.equal(saved.items.flatMap(item => item.images).length, 36)
assert.equal(saved.money.total, '30.00')
const originals = makeRevision()
assert.deepEqual(saved.items.map(item => item.nameEn), originals.items.map(item => item.nameEn))
assert.deepEqual(saved.items.map(item => item.images.map(image => image.sha256)), originals.items.map(item => item.assets.map(asset => asset.sha256)), 'Each line must retain its selected image order')
for (let itemIndex = 0; itemIndex < revision.items.length; itemIndex++) {
  const item = revision.items[itemIndex]
  for (let imageIndex = 0; imageIndex < item.assets.length; imageIndex++) {
    const asset = item.assets[imageIndex]
    const image = sourceImageFor(itemIndex, imageIndex)
    assert.equal(asset.sha256, image.sha256); assert.equal(asset.sizeBytes, image.sizeBytes)
    assert.ok(objects.get(asset.objectKey).equals(image.bytes), 'Frozen image bytes must match the corresponding source')
    assert.ok(Buffer.from(saved.items[itemIndex].images[imageIndex].dataUrl.split(',')[1], 'base64').equals(image.bytes), 'Snapshot image bytes must retain source order')
  }
}
const beforeReplay = { reads, writes, apiCalls }
assert.equal((await loaded.exports.finalizeQuotationRevision(input, 'isolated-admin')).status, 'FINALIZED')
assert.deepEqual({ reads, writes, apiCalls }, beforeReplay)

reset(); imageReadTime = 15_000
const slowResult = await loaded.exports.finalizeQuotationRevision(finalizeInput(), 'isolated-admin')
assert.equal(slowResult.status, 'FINALIZED')
assert.ok(heartbeats.some(entry => entry.reads > 0 && entry.reads < 36), 'Large image sets must renew their lease during copying')
assert.ok(heartbeats.length >= 20)

for (const failure of ['total', 'single', 'invalid', 'integrity']) {
  reset()
  const assets = revision.items.flatMap(item => item.assets)
  if (failure === 'total') assets.forEach(asset => { asset.sizeBytes = 2 * 1024 * 1024 })
  if (failure === 'single') assets.at(-1).sizeBytes = 5 * 1024 * 1024 + 1
  if (failure === 'invalid') assets.at(-1).sizeBytes = 0
  if (failure === 'integrity') assets[0].sha256 = '0'.repeat(64)
  const expectedCode = failure === 'integrity' ? 'DOCUMENT_VALIDATION_FAILED' : failure === 'invalid' ? 'VALIDATION_FAILED' : 'FILE_TOO_LARGE'
  response = await preview()
  assert.equal(response.status, 400)
  assert.equal((await response.json()).code, expectedCode)
  assert.equal(reads, failure === 'integrity' ? 1 : 0); assert.equal(writes, 0)
  reads = 0
  await assert.rejects(loaded.exports.finalizeQuotationRevision(finalizeInput(), 'isolated-admin'), error => error.code === expectedCode)
  assert.equal(reads, failure === 'integrity' ? 1 : 0); assert.equal(writes, 0); assert.equal(apiCalls, 0)
  assert.equal(revision.state, 'READY'); assert.equal(documents.length, 0); assert.equal(attempts[0].status, 'FAILED')
}
process.stdout.write(`PASS: 36 original images (${(selectedBytes / 1024 / 1024).toFixed(1)} MiB), real preview/finalization rendering, frozen bytes/order/totals, immutable replay, early image limits and integrity failure compensation. All external I/O mocked.\n`)
