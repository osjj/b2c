// Exercises real actions against an isolated transaction double. No .env or live database.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { build } from 'esbuild'

const nodeRequire = createRequire(import.meta.url)
const productId = 'c0000000000000000000000001'
const quotationId = 'c0000000000000000000000002'
const stamp = '2026-09-28T00:00:00.000Z'
const state = { authorized: true, enabled: true, reads: 0, writes: 0, source: null, product: null, quotation: null, settings: [], audits: [] }
const assignDefined = (target, data) => Object.assign(target, Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined)))
function writeProduct(data) {
  const { source, ...fields } = data
  state.product ??= { id: productId, images: [], variants: [], attributeValues: [], priceTiers: [], category: null, weight: null }
  assignDefined(state.product, fields)
  // Relation mutations mirror Prisma's create/upsert semantics, without returning unrequested relations.
  if (source?.create) state.source = { productId, ...source.create }
  if (source?.upsert) state.source = { productId, ...(state.source ? source.upsert.update : source.upsert.create) }
  return { ...state.product }
}
function readProduct(args = {}) {
  state.reads++
  if (!state.product) return null
  if (args.select) return Object.fromEntries(Object.keys(args.select).map((key) => [key, state.product[key]]))
  return { ...state.product, ...(args.include?.source ? { source: state.source } : {}) }
}
const db = {
  product: {
    create: async ({ data }) => writeProduct(data),
    update: async ({ data }) => writeProduct(data),
    findUnique: async (args) => readProduct(args),
    findMany: async (args) => state.product ? [readProduct(args)] : [],
    count: async () => state.product ? 1 : 0,
  },
  productSlugRedirect: { findUnique: async () => null },
  productImage: { deleteMany: async () => {} },
  productCollection: { deleteMany: async () => {} },
  productAttributeValue: { deleteMany: async () => {} },
  priceTier: { deleteMany: async () => {} },
  quotationProduct: {
    create: async ({ data }) => { state.quotation = { id: quotationId, updatedAt: new Date(stamp), ...data }; return { ...state.quotation } },
    updateMany: async ({ where, data }) => {
      if (!state.quotation || where.id !== state.quotation.id || where.updatedAt.toISOString() !== stamp) return { count: 0 }
      assignDefined(state.quotation, data)
      return { count: 1 }
    },
    findMany: async () => state.quotation ? [{ ...state.quotation, images: [] }] : [],
  },
  setting: {
    upsert: async ({ where, create, update }) => { const row = state.settings.find((entry) => entry.key === where.key); if (row) Object.assign(row, update); else state.settings.push(create) },
    findMany: async () => state.settings,
  },
  quotationNumberCounter: { upsert: async () => ({ value: 1 }) },
  quotationAuditLog: { create: async ({ data }) => { state.audits.push(data) } },
  $transaction: async (work) => {
    state.writes++
    const backup = structuredClone(state)
    try { return await work(db) } catch (error) { Object.assign(state, backup); throw error }
  },
}
const mocks = {
  '@/lib/prisma': 'export const prisma = require("source-test-state").db',
  '@/lib/auth-utils': 'export async function requireAdmin(){if(!require("source-test-state").state.authorized)throw new Error("Denied");return {id:"admin-test"}}',
  '@/lib/quotation/feature': 'export function assertQuotationWorkbenchEnabled(){if(!require("source-test-state").state.enabled)throw new Error("Disabled")}',
  '@/lib/product-slug.server': 'export async function generateUniqueProductSlug(){return "test-product"};export async function saveLegacyProductSlug(){}',
  '@/lib/embeddings': 'export function buildProductEmbeddingText(){};export async function generateEmbedding(){}',
  '@/lib/indexnow-auto': 'export function collectProductIndexNowUrls(){return []};export function scheduleIndexNowUrls(){}',
  'next/navigation': 'export function redirect(){throw new Error("TEST_REDIRECT")};export function unstable_rethrow(){}',
  'next/cache': 'export function revalidatePath(){}',
  'next/server': 'export function after(){}',
}
const built = await build({
  stdin: { contents: 'export * from "./src/actions/products"; export {saveCommonQuotationProduct} from "./src/actions/admin/common-quotation-products"; export {readCommonProducts} from "./src/lib/quotation/services/common-products";', resolveDir: process.cwd(), loader: 'ts' },
  bundle: true, write: false, platform: 'node', format: 'cjs', packages: 'external',
  plugins: [{ name: 'isolation', setup(plugin) {
    plugin.onResolve({ filter: /.*/ }, ({ path }) => path in mocks ? { path, namespace: 'mock' } : undefined)
    plugin.onLoad({ filter: /.*/, namespace: 'mock' }, ({ path }) => ({ contents: mocks[path], loader: 'js', resolveDir: process.cwd() }))
  } }],
})
const actionModule = { exports: {} }
new Function('require', 'module', 'exports', built.outputFiles[0].text)((name) => name === 'source-test-state' ? { state, db } : nodeRequire(name), actionModule, actionModule.exports)
const actions = actionModule.exports
function form(source) {
  const data = new FormData()
  for (const [key, value] of Object.entries({ name: 'Test product', slug: 'test-product', description: '', price: '1', isActive: 'true' })) data.set(key, value)
  if (source !== undefined) data.set('productSource', source)
  return data
}
const saved = (promise) => assert.rejects(promise, /TEST_REDIRECT/)
await saved(actions.createProduct({}, form('  https://supplier.example/item  ')))
assert.equal((await actions.getProduct(productId)).productSource, 'https://supplier.example/item')
await saved(actions.updateProduct(productId, {}, form()))
assert.equal((await actions.getProduct(productId)).productSource, 'https://supplier.example/item', 'omitted source must preserve')
await saved(actions.updateProduct(productId, {}, form('供应商 A / 型号 B')))
assert.equal((await actions.getProduct(productId)).productSource, '供应商 A / 型号 B')
for (const result of [await actions.getProductBySlug('test-product'), await actions.getProducts(), await actions.getFeaturedProducts()]) {
  const payload = JSON.stringify(result)
  assert.equal(payload.includes('供应商 A'), false)
  assert.equal(payload.includes('productSource'), false)
  assert.equal(payload.includes('"source"'), false)
}
const beforeInvalid = state.writes
assert.ok((await actions.updateProduct(productId, {}, form('x'.repeat(2001)))).errors.productSource)
assert.ok((await actions.createProduct({}, form(new Blob(['not text'])))).errors.productSource)
assert.equal(state.writes, beforeInvalid)
await saved(actions.updateProduct(productId, {}, form(' \n ')))
assert.equal((await actions.getProduct(productId)).productSource, null)
state.authorized = false
const beforeDenied = [state.reads, state.writes]
await assert.rejects(actions.getProduct(productId), /Denied/)
await assert.rejects(actions.createProduct({}, form('secret')), /Denied/)
await assert.rejects(actions.updateProduct(productId, {}, form('secret')), /Denied/)
assert.deepEqual([state.reads, state.writes], beforeDenied)
state.authorized = true

const common = { name: 'Common product', description: '', specifications: '', unit: 'pcs', unitPrice: '1', currency: 'USD', active: true }
assert.equal((await actions.saveCommonQuotationProduct({ ...common, productSource: '  private supplier  ' })).success, true)
assert.equal(state.quotation.productSource, 'private supplier')
const update = { ...common, id: quotationId, expectedUpdatedAt: stamp }
assert.equal((await actions.saveCommonQuotationProduct(update)).success, true)
assert.equal(state.quotation.productSource, 'private supplier')
const picker = await actions.readCommonProducts()
assert.equal(JSON.stringify(picker).includes('private supplier'), false)
assert.equal('productSource' in picker[0], false)
assert.equal((await actions.saveCommonQuotationProduct({ ...update, expectedUpdatedAt: '2026-09-27T00:00:00.000Z', productSource: 'stale edit' })).code, 'VERSION_CONFLICT')
assert.equal(state.quotation.productSource, 'private supplier')
for (const invalid of [123, 'x'.repeat(2001)]) assert.equal((await actions.saveCommonQuotationProduct({ ...update, productSource: invalid })).code, 'VALIDATION_FAILED')
assert.equal(state.quotation.productSource, 'private supplier')
for (const blank of ['', ' \n ', null]) {
  assert.equal((await actions.saveCommonQuotationProduct({ ...update, productSource: blank })).success, true)
  assert.equal(state.quotation.productSource, null)
}
state.authorized = false
const deniedWrites = state.writes
assert.equal((await actions.saveCommonQuotationProduct({ ...update, productSource: 'secret' })).success, false)
assert.equal(state.writes, deniedWrites)
state.authorized = true
state.enabled = false
assert.equal((await actions.saveCommonQuotationProduct({ ...update, productSource: 'secret' })).success, false)
assert.equal(state.writes, deniedWrites)
process.stdout.write('PASS: source create/read/update/clear/preserve, public exclusion, invalid input, admin denial, quotation feature/version guards. Real actions with isolated transaction double; no live database contacted.\n')
