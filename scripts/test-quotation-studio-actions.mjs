// Real customer/product/catalog actions. Mocked Prisma/S3/private storage, no .env or network.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { Readable } from 'node:stream'
import { build } from 'esbuild'
import sharp from 'sharp'

const require = createRequire(import.meta.url)
const state = { enabled: true, admin: true, dbCalls: 0, catalogReads: 0, productReads: 0, storageReads: 0, s3Calls: 0, putCalls: 0, failReadAt: 0, failPutAt: 0, contentLength: null, counter: 0, customers: [], products: [], settings: [], images: [], sources: [], audits: [], failAudit: false }
const objects = new Map()
const readKeys = []
let copyHook
let count = 0
const id = () => `c${String(++count).padStart(24, '0')}`
const stamp = () => new Date(1788700000000 + ++count * 1000)
const catalogId = id()
const catalog = { id: catalogId, name: 'Catalog sample', price: '12.50', cost: '8.25', source: { value: '  Supplier / https://supplier.example/item  ', costPriceText: '  100 pcs: $8.25\n500 pcs: $7.50  ' }, description: 'A product description', specifications: { Material: 'Cotton' }, isActive: true, updatedAt: stamp(), images: [{ id: id(), url: 'https://shop.laifappe.com/products/sample.png', sortOrder: 0 }] }
const matches = (row, where) => Object.entries(where).every(([key, value]) => value instanceof Date ? row[key]?.getTime() === value.getTime() : row[key] === value)
const db = {
  businessCustomer: {
    create: async ({ data }) => { const row = { ...data, id: id(), updatedAt: stamp(), contacts: ['preserve'] }; state.customers.push(row); return row },
    updateMany: async ({ where, data }) => { const row = state.customers.find((entry) => matches(entry, where)); if (!row) return { count: 0 }; Object.assign(row, data, { updatedAt: stamp() }); return { count: 1 } },
  },
  product: {
    findUnique: async ({ where, include, select }) => {
      state.catalogReads++
      if (where.id !== catalog.id) return null
      if (include) {
        assert.deepEqual(include.source, { select: { value: true, costPriceText: true } })
        return structuredClone(catalog)
      }
      if (select.images) {
        assert.deepEqual(select, { id: true, updatedAt: true, images: { orderBy: { sortOrder: 'asc' }, take: 8, select: { id: true, url: true } } })
        return { id: catalog.id, updatedAt: new Date(catalog.updatedAt), images: catalog.images.toSorted((a, b) => a.sortOrder - b.sortOrder).slice(0, 8).map(({ id, url }) => ({ id, url })) }
      }
      assert.deepEqual(select, { updatedAt: true, isActive: true })
      return { updatedAt: catalog.updatedAt, isActive: catalog.isActive }
    },
    findMany: async ({ select }) => { state.catalogReads++; assert.equal(select.source, undefined); return [catalog] },
  }, // no write methods: any catalog write fails
  quotationProduct: {
    findUnique: async ({ where, select }) => { state.productReads++; assert.deepEqual(select, { id: true, productId: true, updatedAt: true }); const row = state.products.find(entry => matches(entry, where)); return row ? { id: row.id, productId: row.productId, updatedAt: new Date(row.updatedAt) } : null },
    findFirst: async ({ where }) => state.products.find((entry) => matches(entry, where)),
    create: async ({ data }) => { const row = { ...data, id: id(), updatedAt: stamp() }; state.products.push(row); return row },
    updateMany: async ({ where, data }) => { const row = state.products.find((entry) => matches(entry, where)); if (!row) return { count: 0 }; Object.assign(row, data, { updatedAt: data.updatedAt ?? stamp() }); return { count: 1 } },
  },
  setting: {
    upsert: async ({ where, create, update }) => { const row = state.settings.find((entry) => entry.key === where.key); if (row) Object.assign(row, update); else state.settings.push(create) },
    create: async ({ data }) => { state.settings.push(data); return data },
  },
  quotationNumberCounter: { upsert: async () => ({ value: ++state.counter }) },
  quotationSourceFile: {
    createMany: async ({ data }) => state.sources.push(...data.map(row => ({ deletedAt: null, salesQuotationId: null, ...row }))),
    findMany: async ({ where }) => state.sources.filter(row => where.id.in.includes(row.id) && row.securityStatus === where.securityStatus && row.deletedAt === where.deletedAt && row.salesQuotationId === where.salesQuotationId && where.contentType.in.includes(row.contentType) && row.sizeBytes <= where.sizeBytes.lte),
  },
  quotationProductImage: {
    createMany: async ({ data }) => state.images.push(...data),
    deleteMany: async ({ where }) => { state.images = state.images.filter(row => row.quotationProductId !== where.quotationProductId) },
  },
  quotationAuditLog: { create: async ({ data }) => { if (state.failAudit) throw new Error('Mock database failure'); state.audits.push(data) } },
  $executeRaw: async () => 1,
  $queryRaw: async () => { throw new Error('Catalog advisory locks must not deserialize PostgreSQL void results') },
  $transaction: async (work) => { state.dbCalls++; const backup = structuredClone(state); try { return await work(db) } catch (error) { Object.assign(state, backup); throw error } },
}
const bytes = await sharp({ create: { width: 20, height: 30, channels: 3, background: '#789' } }).png().toBuffer()
const storage = { provider: 'r2-private', put: async (key, data) => { state.putCalls++; objects.set(key, data); if (state.putCalls === state.failPutAt) throw new Error(`PRIVATE_SECRET_KEY ${key}`) }, delete: async (key) => objects.delete(key) }
async function readCatalogImage(command) {
  state.s3Calls++; readKeys.push(command.input.Key)
  copyHook?.()
  if (state.s3Calls === state.failReadAt) throw new Error('PRIVATE_SECRET_KEY SDK failure')
  return { ContentLength: state.contentLength ?? bytes.length, Body: Readable.from([bytes]) }
}
const mockSources = {
  '@/lib/prisma': 'export const prisma=require("studio-state").db',
  '@/lib/auth-utils': 'export async function requireAdmin(){if(!require("studio-state").state.admin)throw new Error("No permission");return {id:"admin"}}',
  '@/lib/quotation/feature': 'export function assertQuotationWorkbenchEnabled(){if(!require("studio-state").state.enabled)throw new Error("Disabled")}',
  '@/lib/r2': 'export function assertR2Configured(){};export const r2BucketName="public";export const r2Client={send:command=>require("studio-state").readCatalogImage(command)}',
  '@/lib/quotation/private-storage': 'export function getQuotationPrivateStorage(){const s=require("studio-state");s.state.storageReads++;return s.storage}',
  'next/cache': 'export function revalidatePath(){}',
  'next/navigation': 'export function unstable_rethrow(){}',
}
const built = await build({ stdin: { contents: 'export * from "./src/actions/admin/quotation-customers";export * from "./src/actions/admin/common-quotation-products";export * from "./src/actions/admin/quotation-catalog";', resolveDir: process.cwd(), loader: 'ts' }, bundle: true, write: false, platform: 'node', format: 'cjs', packages: 'external', define: { 'process.env': '{}' }, plugins: [{ name: 'isolate', setup(plugin) {
  plugin.onResolve({ filter: /.*/ }, ({ path }) => path in mockSources ? { path, namespace: 'mock' } : path === 'studio-state' ? { path, external: true } : undefined)
  plugin.onLoad({ filter: /.*/, namespace: 'mock' }, ({ path }) => ({ contents: mockSources[path], loader: 'js' }))
} }] })
const actionModule = { exports: {} }
new Function('require', 'module', 'exports', built.outputFiles[0].text)((name) => name === 'studio-state' ? { state, db, storage, readCatalogImage } : require(name), actionModule, actionModule.exports)
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
assert.equal('productSource' in search.data[0], false); assert.equal('costPriceText' in search.data[0], false); assert.equal('source' in search.data[0], false)
const input = { productId: catalogId, updatedAt: catalog.updatedAt.toISOString(), includeImages: true }
const beforeStale = structuredClone(state.products)
assert.equal((await actions.importQuotationCatalogProduct({ ...input, updatedAt: new Date(0).toISOString() })).code, 'VERSION_CONFLICT')
assert.deepEqual(state.products, beforeStale)
const imported = await actions.importQuotationCatalogProduct(input); assert.equal(imported.success, true); assert.equal(objects.size, 1); assert.equal(state.images.length, 1); assert.equal(state.sources[0].storageProvider, 'r2-private')
const importedProduct = state.products.find((row) => row.id === imported.data.id)
assert.equal(importedProduct.productSource, 'Supplier / https://supplier.example/item')
assert.equal(importedProduct.costPriceText, '100 pcs: $8.25\n500 pcs: $7.50')
const importedDefaults = state.settings.find((row) => row.key.endsWith(imported.data.id)).value
assert.equal(importedDefaults.unitCost, '8.25'); assert.equal(importedDefaults.unitPrice, '12.50')
assert.equal((await actions.saveCommonQuotationProduct({ id: importedProduct.id, expectedUpdatedAt: importedProduct.updatedAt.toISOString(), name: 'Manually edited', productSource: 'Manual supplier', costPriceText: 'Manual cost\nPreserve this line', description: 'Manual description', packaging: 'Manual packaging', unitCost: '6.50', unitPrice: '15', unit: 'pcs', currency: 'USD', active: true })).success, true)
const manualProduct = structuredClone(importedProduct)
const manualDefaults = structuredClone(state.settings.find((row) => row.key.endsWith(imported.data.id)).value)
const again = await actions.importQuotationCatalogProduct(input); assert.equal(again.data.id, imported.data.id); assert.equal(again.data.reused, true); assert.equal(state.s3Calls, 1)
assert.deepEqual(importedProduct, manualProduct)
assert.deepEqual(state.settings.find((row) => row.key.endsWith(imported.data.id)).value, manualDefaults)
assert.equal(catalog.price, '12.50'); assert.equal(catalog.name, 'Catalog sample')
for (const metadata of [null, { value: null, costPriceText: null }, { value: ' \n ', costPriceText: ' \n ' }]) {
  catalog.id = id(); catalog.source = metadata
  const result = await actions.importQuotationCatalogProduct({ ...input, productId: catalog.id, includeImages: false })
  assert.equal(result.success, true)
  const row = state.products.find((entry) => entry.id === result.data.id)
  assert.equal(row.productSource, null); assert.equal(row.costPriceText, null)
  assert.equal(state.settings.find((entry) => entry.key.endsWith(row.id)).value.unitCost, '8.25')
}
for (const metadata of [{ value: 123, costPriceText: null }, { value: 'x'.repeat(2001), costPriceText: null }, { value: null, costPriceText: 123 }, { value: null, costPriceText: 'x'.repeat(2001) }]) {
  catalog.id = id(); catalog.source = metadata
  const before = structuredClone(state)
  const result = await actions.importQuotationCatalogProduct({ ...input, productId: catalog.id })
  assert.equal(result.code, 'VALIDATION_FAILED')
  assert.deepEqual(state.products, before.products); assert.deepEqual(state.settings, before.settings); assert.deepEqual(state.audits, before.audits)
  assert.equal(state.dbCalls, before.dbCalls); assert.equal(state.s3Calls, before.s3Calls); assert.equal(objects.size, 1)
}
catalog.source = { value: 'Rollback supplier', costPriceText: 'Rollback cost' }
catalog.id = id(); state.failAudit = true
const failed = await actions.importQuotationCatalogProduct({ ...input, productId: catalog.id }); assert.equal(failed.success, false); assert.equal(objects.size, 1); assert.equal(state.images.length, 1)
state.failAudit = false
const imageIds = [1, 2, 3].map(value => `00000000-0000-4000-8000-${String(value).padStart(12, '0')}`)
state.sources.push(...imageIds.map((imageId, index) => ({ ...state.sources[0], id: imageId, displayName: `Ordered image ${index + 1}`, securityStatus: 'CLEAN', deletedAt: null, salesQuotationId: null })))
const orderedSourceIds = [imageIds[2], imageIds[0], imageIds[1]]
const orderedProduct = state.products.find(row => row.id === imported.data.id)
const oldImageStamp = orderedProduct.updatedAt.toISOString()
assert.equal((await actions.saveCommonProductImages({ id: orderedProduct.id, updatedAt: oldImageStamp, sourceIds: orderedSourceIds })).success, true)
const savedImageRows = state.images.filter(row => row.quotationProductId === orderedProduct.id).sort((a, b) => a.sortOrder - b.sortOrder)
assert.deepEqual(savedImageRows.map(row => row.sourceFileId), orderedSourceIds)
assert.deepEqual(savedImageRows.map(row => row.sortOrder), [0, 1, 2])
assert.deepEqual(savedImageRows.map(row => row.displayName), ['Ordered image 3', 'Ordered image 1', 'Ordered image 2'])
const savedImages = structuredClone(state.images)
assert.equal((await actions.saveCommonProductImages({ id: orderedProduct.id, updatedAt: oldImageStamp, sourceIds: imageIds })).code, 'VERSION_CONFLICT')
assert.deepEqual(state.images, savedImages)
const latestImageStamp = state.products.find(row => row.id === imported.data.id).updatedAt.toISOString()
assert.equal((await actions.saveCommonProductImages({ id: orderedProduct.id, updatedAt: latestImageStamp, sourceIds: [imageIds[0], imageIds[0]] })).code, 'DUPLICATE_FILE')
assert.deepEqual(state.images, savedImages)

// Refresh only linked image references. Old private source rows and objects remain usable.
catalog.id = catalogId; catalog.isActive = false
catalog.images = [2, 0, 1].map(order => ({ id: id(), url: `https://shop.laifappe.com/products/refresh-${order}.png`, sortOrder: order }))
const currentProduct = () => state.products.find(row => row.id === imported.data.id)
const refreshInput = () => ({ id: imported.data.id, updatedAt: currentProduct().updatedAt.toISOString() })
const productFields = () => { const { updatedAt, ...fields } = currentProduct(); assert.ok(updatedAt instanceof Date); return structuredClone(fields) }
const oldSources = structuredClone(state.sources)
const oldKeys = [...objects.keys()]
const originalFields = productFields()
const originalSettings = structuredClone(state.settings)
const originalCatalog = structuredClone(catalog)
const keysBeforeRefresh = readKeys.length
const refreshed = await actions.reimportCommonProductImages(refreshInput())
assert.equal(refreshed.success, true); assert.equal(refreshed.data.id, imported.data.id)
assert.equal(refreshed.data.updatedAt, currentProduct().updatedAt.toISOString())
assert.ok(new Date(refreshed.data.updatedAt).getTime() > new Date(latestImageStamp).getTime())
assert.deepEqual(readKeys.slice(keysBeforeRefresh), ['products/refresh-0.png', 'products/refresh-1.png', 'products/refresh-2.png'])
assert.deepEqual(refreshed.data.images.map(row => row.name), ['catalog-1.png', 'catalog-2.png', 'catalog-3.png'])
assert.ok(refreshed.data.images.every(row => row.kind === 'source' && !('objectKey' in row)))
assert.deepEqual(state.images.filter(row => row.quotationProductId === imported.data.id).map(row => row.sourceFileId), refreshed.data.images.map(row => row.id))
assert.deepEqual(state.images.filter(row => row.quotationProductId === imported.data.id).map(row => row.sortOrder), [0, 1, 2])
assert.deepEqual(productFields(), originalFields); assert.deepEqual(state.settings, originalSettings); assert.deepEqual(catalog, originalCatalog)
for (const source of oldSources) assert.deepEqual(state.sources.find(row => row.id === source.id), source)
for (const key of oldKeys) assert.ok(objects.has(key))
assert.deepEqual(state.audits.at(-1).metadata, { field: 'images', source: 'CATALOG', productId: catalogId })
assert.equal((await actions.saveCommonProductImages({ id: imported.data.id, updatedAt: refreshed.data.updatedAt, sourceIds: refreshed.data.images.toReversed().map(row => row.id) })).success, true)
assert.deepEqual(state.images.filter(row => row.quotationProductId === imported.data.id).map(row => row.sourceFileId), refreshed.data.images.toReversed().map(row => row.id))

async function assertRefreshFailure(expectedCode, input = refreshInput()) {
  const before = { images: structuredClone(state.images), sources: structuredClone(state.sources), settings: structuredClone(state.settings), audits: structuredClone(state.audits), keys: [...objects.keys()].sort() }
  const result = await actions.reimportCommonProductImages(input)
  assert.equal(result.code, expectedCode)
  assert.equal(result.reason.includes('PRIVATE_SECRET_KEY'), false)
  assert.deepEqual(state.images, before.images); assert.deepEqual(state.sources, before.sources); assert.deepEqual(state.settings, before.settings); assert.deepEqual(state.audits, before.audits)
  assert.deepEqual([...objects.keys()].sort(), before.keys)
  return result
}
const noCopyCalls = state.s3Calls; const noCopyPuts = state.putCalls
await assertRefreshFailure('VALIDATION_FAILED', { id: 'invalid', updatedAt: 'invalid' })
await assertRefreshFailure('NOT_FOUND', { id: id(), updatedAt: latestImageStamp })
await assertRefreshFailure('NOT_FOUND', { id: common.data.id, updatedAt: state.products.find(row => row.id === common.data.id).updatedAt.toISOString() })
await assertRefreshFailure('VERSION_CONFLICT', { id: imported.data.id, updatedAt: latestImageStamp })
catalog.id = id(); await assertRefreshFailure('NOT_FOUND'); catalog.id = catalogId
const gallery = catalog.images; catalog.images = []; await assertRefreshFailure('NOT_FOUND'); catalog.images = gallery
assert.equal(state.s3Calls, noCopyCalls); assert.equal(state.putCalls, noCopyPuts)

state.failReadAt = state.s3Calls + 2
await assertRefreshFailure('INTERNAL_ERROR'); state.failReadAt = 0
state.failPutAt = state.putCalls + 2
await assertRefreshFailure('INTERNAL_ERROR'); state.failPutAt = 0
state.contentLength = 5 * 1024 * 1024 + 1
await assertRefreshFailure('FILE_TOO_LARGE'); state.contentLength = null
const savedUrl = catalog.images[0].url; catalog.images[0].url = 'https://outside.example/secret-image.png'
await assertRefreshFailure('VALIDATION_FAILED'); catalog.images[0].url = savedUrl
state.failAudit = true
const stampBeforeAuditFailure = currentProduct().updatedAt.toISOString()
await assertRefreshFailure('INTERNAL_ERROR'); state.failAudit = false
assert.equal(currentProduct().updatedAt.toISOString(), stampBeforeAuditFailure)

for (const mutate of [
  () => { currentProduct().updatedAt = new Date(currentProduct().updatedAt.getTime() + 1) },
  () => { currentProduct().productId = id() },
  () => { catalog.updatedAt = new Date(catalog.updatedAt.getTime() + 1) },
  () => { catalog.images[0].url += '?changed' },
  () => { catalog.images[0].sortOrder = -1 },
]) {
  const beforeCatalog = structuredClone(catalog)
  copyHook = () => { copyHook = undefined; mutate() }
  await assertRefreshFailure('VERSION_CONFLICT')
  Object.assign(catalog, beforeCatalog); currentProduct().productId = catalogId
}
// Maximum-eight gallery rule is applied before copying, including an inactive linked product.
catalog.images = Array.from({ length: 9 }, (_, order) => ({ id: id(), url: `https://shop.laifappe.com/products/max-${order}.png`, sortOrder: order }))
const readsBeforeMaximum = state.s3Calls
const maxGallery = await actions.reimportCommonProductImages(refreshInput())
assert.equal(maxGallery.success, true); assert.equal(maxGallery.data.images.length, 8); assert.equal(state.s3Calls - readsBeforeMaximum, 8)

state.admin = false
const calls = state.dbCalls; const s3Calls = state.s3Calls; const catalogReads = state.catalogReads
const productReads = state.productReads; const storageReads = state.storageReads; const putCalls = state.putCalls
assert.equal((await actions.saveQuotationCustomer({ name: 'Forbidden' })).success, false)
assert.equal((await actions.importQuotationCatalogProduct(input)).success, false)
assert.equal((await actions.saveCommonProductImages({ id: imported.data.id, updatedAt: latestImageStamp, sourceIds: orderedSourceIds })).success, false)
assert.equal((await actions.reimportCommonProductImages(refreshInput())).success, false)
assert.equal(state.dbCalls, calls); assert.equal(state.s3Calls, s3Calls); assert.equal(state.catalogReads, catalogReads)
assert.equal(state.productReads, productReads); assert.equal(state.storageReads, storageReads); assert.equal(state.putCalls, putCalls)
state.admin = true; state.enabled = false
assert.equal((await actions.saveCommonQuotationProduct({})).success, false)
assert.equal((await actions.importQuotationCatalogProduct(input)).success, false)
assert.equal((await actions.searchQuotationCatalog({ search: 'sample' })).success, false)
assert.equal((await actions.reimportCommonProductImages(refreshInput())).success, false)
assert.equal(state.dbCalls, calls); assert.equal(state.catalogReads, catalogReads); assert.equal(state.s3Calls, s3Calls)
assert.equal(state.productReads, productReads); assert.equal(state.storageReads, storageReads); assert.equal(state.putCalls, putCalls)
process.stdout.write('PASS: customer/product/catalog metadata and sort guards; catalog image refresh/order/inactive/max8/old retention/text preservation; missing/stale/snapshot guards, partial-copy/audit rollback/cleanup, auth and feature gates. All external I/O mocked.\n')
