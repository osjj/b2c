// Real customer/product/catalog actions. Mocked Prisma/S3/private storage, no .env or network.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { Readable } from 'node:stream'
import { build } from 'esbuild'
import sharp from 'sharp'

const require = createRequire(import.meta.url)
const state = { enabled: true, admin: true, dbCalls: 0, s3Calls: 0, counter: 0, customers: [], products: [], settings: [], images: [], sources: [], audits: [], failAudit: false }
const objects = new Map()
let count = 0
const id = () => `c${String(++count).padStart(24, '0')}`
const stamp = () => new Date(1788700000000 + ++count * 1000)
const catalogId = id()
const catalog = { id: catalogId, name: 'Catalog sample', price: '12.50', cost: '8.25', description: 'A product description', specifications: { Material: 'Cotton' }, isActive: true, updatedAt: stamp(), images: [{ id: id(), url: 'https://shop.laifappe.com/products/sample.png', sortOrder: 0 }] }
const matches = (row, where) => Object.entries(where).every(([key, value]) => value instanceof Date ? row[key]?.getTime() === value.getTime() : row[key] === value)
const db = {
  businessCustomer: {
    create: async ({ data }) => { const row = { ...data, id: id(), updatedAt: stamp(), contacts: ['preserve'] }; state.customers.push(row); return row },
    updateMany: async ({ where, data }) => { const row = state.customers.find((entry) => matches(entry, where)); if (!row) return { count: 0 }; Object.assign(row, data, { updatedAt: stamp() }); return { count: 1 } },
  },
  product: { findUnique: async () => catalog, findMany: async () => [catalog] }, // no write methods: any catalog write fails
  quotationProduct: {
    findFirst: async ({ where }) => state.products.find((entry) => matches(entry, where)),
    create: async ({ data }) => { const row = { ...data, id: id(), updatedAt: stamp() }; state.products.push(row); return row },
    updateMany: async ({ where, data }) => { const row = state.products.find((entry) => matches(entry, where)); if (!row) return { count: 0 }; Object.assign(row, data, { updatedAt: stamp() }); return { count: 1 } },
  },
  setting: {
    upsert: async ({ where, create, update }) => { const row = state.settings.find((entry) => entry.key === where.key); if (row) Object.assign(row, update); else state.settings.push(create) },
    create: async ({ data }) => { state.settings.push(data); return data },
  },
  quotationNumberCounter: { upsert: async () => ({ value: ++state.counter }) },
  quotationSourceFile: { createMany: async ({ data }) => state.sources.push(...data) },
  quotationProductImage: { createMany: async ({ data }) => state.images.push(...data) },
  quotationAuditLog: { create: async ({ data }) => { if (state.failAudit) throw new Error('Mock database failure'); state.audits.push(data) } },
  $executeRaw: async () => 1,
  $queryRaw: async () => { throw new Error('Catalog advisory locks must not deserialize PostgreSQL void results') },
  $transaction: async (work) => { state.dbCalls++; const backup = structuredClone(state); try { return await work(db) } catch (error) { Object.assign(state, backup); throw error } },
}
const bytes = await sharp({ create: { width: 20, height: 30, channels: 3, background: '#789' } }).png().toBuffer()
const storage = { provider: 'r2-private', put: async (key, data) => { objects.set(key, data) }, delete: async (key) => objects.delete(key) }
const mockSources = {
  '@/lib/prisma': 'export const prisma=require("studio-state").db',
  '@/lib/auth-utils': 'export async function requireAdmin(){if(!require("studio-state").state.admin)throw new Error("No permission");return {id:"admin"}}',
  '@/lib/quotation/feature': 'export function assertQuotationWorkbenchEnabled(){if(!require("studio-state").state.enabled)throw new Error("Disabled")}',
  '@/lib/r2': 'export function assertR2Configured(){};export const r2BucketName="public";export const r2Client={send:async()=>{const s=require("studio-state");s.state.s3Calls++;return {ContentLength:s.bytes.length,Body:s.stream()}}}',
  '@/lib/quotation/private-storage': 'export function getQuotationPrivateStorage(){return require("studio-state").storage}',
  'next/cache': 'export function revalidatePath(){}',
  'next/navigation': 'export function unstable_rethrow(){}',
}
const built = await build({ stdin: { contents: 'export * from "./src/actions/admin/quotation-customers";export * from "./src/actions/admin/common-quotation-products";export * from "./src/actions/admin/quotation-catalog";', resolveDir: process.cwd(), loader: 'ts' }, bundle: true, write: false, platform: 'node', format: 'cjs', packages: 'external', define: { 'process.env': '{}' }, plugins: [{ name: 'isolate', setup(plugin) {
  plugin.onResolve({ filter: /.*/ }, ({ path }) => path in mockSources ? { path, namespace: 'mock' } : path === 'studio-state' ? { path, external: true } : undefined)
  plugin.onLoad({ filter: /.*/, namespace: 'mock' }, ({ path }) => ({ contents: mockSources[path], loader: 'js' }))
} }] })
const actionModule = { exports: {} }
new Function('require', 'module', 'exports', built.outputFiles[0].text)((name) => name === 'studio-state' ? { state, db, storage, bytes, stream: () => Readable.from([bytes]) } : require(name), actionModule, actionModule.exports)
const actions = actionModule.exports

const customer = await actions.saveQuotationCustomer({ name: 'Name only' }); assert.equal(customer.success, true); assert.equal(state.customers[0].email, null)
const update = { id: customer.data.id, expectedUpdatedAt: state.customers[0].updatedAt.toISOString(), name: 'Jane', company: 'Sample Company', country: '中国', email: 'jane@example.com', phone: '+86 123', gender: 'FEMALE', notes: 'Private notes' }
assert.equal((await actions.saveQuotationCustomer(update)).success, true)
assert.deepEqual(state.customers[0].contacts, ['preserve']); assert.equal(state.settings[0].value.gender, 'FEMALE')
assert.equal((await actions.saveQuotationCustomer({ ...update, name: 'Stale overwrite' })).code, 'VERSION_CONFLICT'); assert.equal(state.customers[0].companyName, 'Jane')
assert.equal((await actions.saveQuotationCustomer({ name: 'Bad', email: 'test' })).success, false)
const common = await actions.saveCommonQuotationProduct({ name: 'Common', specifications: 'Material: Cotton', description: 'Description', packaging: '10 / bag', unitCost: '1.25', unitPrice: '2.50', unit: 'pcs', currency: 'USD', active: true })
assert.equal(common.success, true); assert.deepEqual(state.products[0].specifications, ['Material: Cotton']); assert.equal(state.settings.find((row) => row.key.endsWith(common.data.id)).value.packaging, '10 / bag')
const search = await actions.searchQuotationCatalog({ search: 'sample' }); assert.equal(search.success, true); assert.equal(search.data[0].unitCost, '8.25')
const input = { productId: catalogId, updatedAt: catalog.updatedAt.toISOString(), includeImages: true }
assert.equal((await actions.importQuotationCatalogProduct({ ...input, updatedAt: new Date(0).toISOString() })).code, 'VERSION_CONFLICT')
const imported = await actions.importQuotationCatalogProduct(input); assert.equal(imported.success, true); assert.equal(objects.size, 1); assert.equal(state.images.length, 1); assert.equal(state.sources[0].storageProvider, 'r2-private')
const again = await actions.importQuotationCatalogProduct(input); assert.equal(again.data.id, imported.data.id); assert.equal(again.data.reused, true); assert.equal(state.s3Calls, 1)
assert.equal(catalog.price, '12.50'); assert.equal(catalog.name, 'Catalog sample')
catalog.id = id(); state.failAudit = true
const failed = await actions.importQuotationCatalogProduct({ ...input, productId: catalog.id }); assert.equal(failed.success, false); assert.equal(objects.size, 1); assert.equal(state.images.length, 1)
state.failAudit = false; state.admin = false
const calls = state.dbCalls; const s3Calls = state.s3Calls
assert.equal((await actions.saveQuotationCustomer({ name: 'Forbidden' })).success, false)
assert.equal((await actions.importQuotationCatalogProduct(input)).success, false)
assert.equal(state.dbCalls, calls); assert.equal(state.s3Calls, s3Calls)
state.admin = true; state.enabled = false
assert.equal((await actions.saveCommonQuotationProduct({})).success, false)
assert.equal(state.dbCalls, calls)
process.stdout.write('PASS: customer optional fields/concurrency, product cost/spec/packaging, catalog read-only copy/private images/idempotency/rollback, auth and feature gates. All external I/O mocked.\n')
