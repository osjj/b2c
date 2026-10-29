// Runs the real actions/services with an in-memory transaction double.
// No .env loading, PrismaClient construction, TCP, database, R2 or user-data access.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { build } from 'esbuild'

const nodeRequire = createRequire(import.meta.url)
const state = { authorized: true, touched: 0, counters: 0, customers: [], quotations: [], revisions: [], items: [], assets: [], sources: [], audits: [] }
let counter = 0
const id = () => 'c' + String(++counter).padStart(24, '0')
const db = {
  setting: { findUnique: async () => null },
  quotationNumberCounter: { upsert: async () => ({ value: ++state.counters }) },
  businessCustomer: {
    create: async ({ data }) => { const row = { id: id(), contacts: [], ...data }; state.customers.push(row); return row },
    findUnique: async ({ where }) => state.customers.find((row) => row.id === where.id),
  },
  salesQuotation: {
    create: async ({ data }) => { const row = { id: id(), outcomeStatus: 'OPEN', ...data }; state.quotations.push(row); return row },
    update: async ({ where, data }) => Object.assign(state.quotations.find((row) => row.id === where.id), data),
  },
  salesQuotationRevision: {
    create: async ({ data }) => { const row = { id: id(), state: 'DRAFT', version: 1, ...data }; state.revisions.push(row); return row },
    findUnique: async ({ where }) => { const row = state.revisions.find((entry) => entry.id === where.id); return row ? { ...row, salesQuotation: state.quotations.find((entry) => entry.id === row.salesQuotationId) } : null },
    updateMany: async ({ where, data }) => {
      const row = state.revisions.find((entry) => entry.id === where.id && entry.version === where.version && where.state.in.includes(entry.state))
      if (!row) return { count: 0 }
      Object.assign(row, data, { version: row.version + data.version.increment }); return { count: 1 }
    },
  },
  salesQuotationItem: {
    createMany: async ({ data }) => { for (const item of data) state.items.push({ ...item, id: item.id || id() }); return { count: data.length } },
    findMany: async ({ where }) => state.items.filter((item) => item.revisionId === where.revisionId).sort((a, b) => a.sortOrder - b.sortOrder).map((item) => ({ ...item, assets: state.assets.filter((asset) => asset.itemId === item.id).sort((a, b) => a.sortOrder - b.sortOrder) })),
    deleteMany: async ({ where }) => { state.items = state.items.filter((item) => item.revisionId !== where.revisionId) },
  },
  salesQuotationItemAsset: {
    create: async ({ data }) => { const row = { id: id(), assetType: 'PRODUCT_IMAGE', ...data }; state.assets.push(row); return row },
    createMany: async ({ data }) => { state.assets.push(...data.map((asset) => ({ ...asset, id: asset.id || id(), assetType: asset.assetType || 'PRODUCT_IMAGE' }))) },
    deleteMany: async ({ where }) => { const ids = state.items.filter((item) => item.revisionId === where.item.revisionId).map((item) => item.id); state.assets = state.assets.filter((asset) => !ids.includes(asset.itemId)) },
  },
  quotationSourceFile: { findMany: async ({ where }) => state.sources.filter((file) => where.id.in.includes(file.id) && file.securityStatus === 'CLEAN' && !file.deletedAt && (file.salesQuotationId === null || where.OR.some((entry) => entry.salesQuotationId === file.salesQuotationId))) },
  quotationAuditLog: { create: async ({ data }) => { state.audits.push(data) } },
  $transaction: async (work) => {
    state.touched++
    const backup = structuredClone(state)
    try { return await work(db) } catch (error) { Object.assign(state, backup); throw error }
  },
}
const built = await build({ stdin: { contents: 'export {createSalesQuotation,updateSalesQuotation} from "./src/actions/admin/sales-quotations";', resolveDir: process.cwd(), loader: 'ts' }, bundle: true, write: false, platform: 'node', format: 'cjs', packages: 'external', plugins: [{ name: 'isolation', setup(plugin) {
  plugin.onResolve({ filter: /^@\/lib\/prisma$/ }, () => ({ path: 'db', namespace: 'mock' }))
  plugin.onResolve({ filter: /^@\/lib\/auth-utils$/ }, () => ({ path: 'auth', namespace: 'mock' }))
  plugin.onResolve({ filter: /^next\/(cache|navigation)$/ }, () => ({ path: 'next', namespace: 'mock' }))
  plugin.onResolve({ filter: /^@\/lib\/quotation\/feature$/ }, () => ({ path: 'feature', namespace: 'mock' }))
  plugin.onResolve({ filter: /^quotation-test-state$/ }, () => ({ path: 'quotation-test-state', external: true }))
  plugin.onLoad({ filter: /.*/, namespace: 'mock' }, ({ path }) => ({ loader: 'js', resolveDir: process.cwd(), contents: path === 'db' ? 'export const prisma=require("quotation-test-state").db;' : path === 'auth' ? 'export async function requireAdmin(){if(!require("quotation-test-state").state.authorized)throw new Error("Denied");return {id:"admin-test"}}' : path === 'feature' ? 'export function assertQuotationWorkbenchEnabled(){}' : 'export function revalidatePath(){};export function unstable_rethrow(){};' }))
} }] })
const actionModule = { exports: {} }
new Function('require', 'module', 'exports', built.outputFiles[0].text)((name) => name === 'quotation-test-state' ? { state, db } : nodeRequire(name), actionModule, actionModule.exports)
const actions = actionModule.exports
const input = { customerName: 'Sample Buyer', quotationDate: '2026-09-05', currency: 'USD', usdToCnyRate: '7.2', publicTerms: { Terms: 'Sample terms' }, items: [{ sortOrder: 0, nameEn: 'Sample glove', quantity: '3', unit: 'pair', unitPrice: '0.335', imageSourceIds: [], imageAssetIds: [] }] }
state.authorized = false
assert.equal((await actions.createSalesQuotation(input)).success, false)
assert.equal(state.touched, 0)
state.authorized = true
const created = await actions.createSalesQuotation(input)
assert.equal(created.success, true, JSON.stringify(created))
assert.equal(state.customers.length, 1)
assert.equal(state.revisions[0].total, '1.01')
assert.equal(state.revisions[0].templateVersion, 'jordan-ai-v1')
assert.equal(state.revisions[0].customerSnapshot.quotationCurrency.usdToCnyRate, '7.2')
assert.equal(created.data.items.length, 1)
const update = { ...input, usdToCnyRate: undefined, revisionId: created.data.revisionId, expectedVersion: 1, customerId: state.customers[0].id, customerName: 'Different Buyer', items: [{ ...input.items[0], id: created.data.items[0].id }] }
state.customers[0].contacts = [{ name: 'Old customer contact', email: 'private@old.test' }]
const saved = await actions.updateSalesQuotation(update)
assert.equal(saved.success, true, JSON.stringify(saved))
assert.equal(saved.data.version, 2)
assert.equal(state.customers[0].companyName, 'Sample Buyer')
assert.deepEqual(state.revisions[0].customerSnapshot.contacts, [])
assert.equal(state.revisions[0].customerSnapshot.companyName, 'Different Buyer')
assert.equal(state.revisions[0].customerSnapshot.quotationCurrency.usdToCnyRate, '7.2', 'old client omitting a rate preserves it')
assert.equal((await actions.updateSalesQuotation({ ...update, usdToCnyRate: '8' })).code, 'VERSION_CONFLICT')
assert.equal(state.revisions[0].customerSnapshot.quotationCurrency.usdToCnyRate, '7.2', 'stale write cannot change rate')
const foreign = await actions.updateSalesQuotation({ ...update, expectedVersion: 2, items: [{ ...update.items[0], imageAssetIds: ['c9999999999999999999999999'] }] })
assert.equal(foreign.code, 'VALIDATION_FAILED')
assert.equal(state.revisions[0].version, 2)
const sourceId = '11111111-1111-4111-8111-111111111111'
state.sources.push({ id: sourceId, salesQuotationId: null, securityStatus: 'CLEAN', contentType: 'image/png', sizeBytes: 200, sha256: 'a'.repeat(64), objectKey: 'quotation/source/sample', displayName: 'sample.png' })
const attached = await actions.updateSalesQuotation({ ...update, expectedVersion: 2, items: [{ ...update.items[0], imageSourceIds: [sourceId] }] })
assert.equal(attached.success, true, JSON.stringify(attached))
assert.equal(attached.data.items[0].assets.length, 1)
state.sources[0].salesQuotationId = 'c8888888888888888888888888'
const rejected = await actions.updateSalesQuotation({ ...update, expectedVersion: 3, items: [{ ...update.items[0], imageSourceIds: [sourceId] }] })
assert.equal(rejected.code, 'FILE_NOT_CLEAN')
assert.equal(state.revisions[0].version, 3)
assert.equal(state.assets.length, 1, 'rollback restores existing image references')
const converted = await actions.updateSalesQuotation({ ...update, expectedVersion: 3, currency: 'CNY', usdToCnyRate: '7.3', items: [{ ...update.items[0], unitPrice: '72' }] })
assert.equal(converted.success, true, JSON.stringify(converted))
assert.equal(state.revisions[0].currency, 'CNY')
assert.equal(state.revisions[0].customerSnapshot.quotationCurrency.usdToCnyRate, '7.3')
assert.equal(state.revisions[0].total, '216.00', 'server totals converted values without applying FX twice')
const legacySave = await actions.updateSalesQuotation({ ...update, expectedVersion: 4 })
assert.equal(legacySave.success, true)
assert.equal(state.revisions[0].customerSnapshot.quotationCurrency.usdToCnyRate, '7.3')
const cleared = await actions.updateSalesQuotation({ ...update, expectedVersion: 5, usdToCnyRate: null })
assert.equal(cleared.success, true)
assert.equal(state.revisions[0].customerSnapshot.quotationCurrency, undefined)
const beforeInvalid = state.touched
for (const usdToCnyRate of ['0', '-1', '1.123456789', '10000000000', '1e2']) {
  assert.equal((await actions.updateSalesQuotation({ ...update, expectedVersion: 6, usdToCnyRate })).code, 'VALIDATION_FAILED')
  assert.equal((await actions.createSalesQuotation({ ...input, usdToCnyRate })).code, 'VALIDATION_FAILED')
}
assert.equal(state.touched, beforeInvalid, 'invalid rates reject before any transaction')
state.authorized = false
assert.equal((await actions.updateSalesQuotation({ ...update, expectedVersion: 6, usdToCnyRate: '7.9' })).success, false)
assert.equal(state.touched, beforeInvalid, 'unauthorized metadata writes cannot start a transaction')
state.authorized = true
assert.equal(state.revisions[0].version, 6)
state.revisions[0].state = 'FINALIZED'
assert.equal((await actions.updateSalesQuotation({ ...update, expectedVersion: 6, usdToCnyRate: '8' })).code, 'IMMUTABLE_REVISION')
// Image order is independent of the legacy source/asset arrays and survives mixed saves.
const source = (n) => ({ id: '00000000-0000-4000-8000-' + String(n).padStart(12, '0'), salesQuotationId: null, deletedAt: null, securityStatus: 'CLEAN', contentType: 'image/png', sizeBytes: 200, sha256: n.toString(16).padStart(64, '0'), objectKey: 'quotation/source/order-' + n, displayName: 'order-' + n + '.png' })
const orderSources = [2, 3, 4, 5, 6, 7, 8].map(source)
state.sources.push(...orderSources)
const [a, b, c, d, e, f, bad] = orderSources
const tagged = (kind, id) => ({ kind, id })
const orderInput = { ...input, customerName: 'Image Order Buyer', items: [{ ...input.items[0], imageSourceIds: [a.id, b.id, c.id], imageAssetIds: [], imageOrder: [c, a, b].map((entry) => tagged('source', entry.id)) }] }
const orderedCreated = await actions.createSalesQuotation(orderInput)
assert.equal(orderedCreated.success, true, JSON.stringify(orderedCreated))
const orderItemId = orderedCreated.data.items[0].id
const orderRevisionId = orderedCreated.data.revisionId
const orderRevision = () => state.revisions.find((revision) => revision.id === orderRevisionId)
const orderedAssets = () => state.assets.filter((asset) => asset.itemId === orderItemId).sort((x, y) => x.sortOrder - y.sortOrder)
const assertSourceOrder = (ids) => assert.deepEqual(orderedAssets().map((asset) => asset.sourceFileId), ids)
assertSourceOrder([c.id, a.id, b.id])
assert.deepEqual(orderedCreated.data.items[0].assets.map((asset) => asset.displayName), [c, a, b].map((entry) => entry.displayName))
const assetFor = (sourceId) => orderedAssets().find((asset) => asset.sourceFileId === sourceId)
const saveOrder = (line, overrides = {}) => actions.updateSalesQuotation({ ...orderInput, revisionId: orderRevisionId, expectedVersion: orderRevision().version, items: [{ ...input.items[0], id: orderItemId, ...line }], ...overrides })
let orderedResult = await saveOrder({ imageSourceIds: [], imageAssetIds: [assetFor(a.id).id, assetFor(b.id).id, assetFor(c.id).id], imageOrder: [b, c, a].map((entry) => tagged('asset', assetFor(entry.id).id)) })
assert.equal(orderedResult.success, true, JSON.stringify(orderedResult))
assertSourceOrder([b.id, c.id, a.id])
assert.deepEqual(orderedAssets().map((asset) => asset.sortOrder), [0, 1, 2])
const retained = [b, c, a].map((entry) => assetFor(entry.id))
orderedResult = await saveOrder({ imageSourceIds: [e.id, d.id], imageAssetIds: retained.map((asset) => asset.id), imageOrder: [tagged('source', d.id), tagged('asset', retained[0].id), tagged('asset', retained[1].id), tagged('source', e.id), tagged('asset', retained[2].id)] })
assert.equal(orderedResult.success, true, JSON.stringify(orderedResult))
assertSourceOrder([d.id, b.id, c.id, e.id, a.id])
assert.deepEqual(orderedAssets().map((asset) => asset.sortOrder), [0, 1, 2, 3, 4])
assert.deepEqual(orderedResult.data.items[0].assets.map((asset) => asset.displayName), [d, b, c, e, a].map((entry) => entry.displayName))
orderedResult = await saveOrder({ imageSourceIds: [], imageAssetIds: [assetFor(d.id).id, assetFor(a.id).id], imageOrder: [a, d].map((entry) => tagged('asset', assetFor(entry.id).id)) })
assert.equal(orderedResult.success, true, JSON.stringify(orderedResult))
assertSourceOrder([a.id, d.id])
// Legacy append after a removal must use maximum existing index, not retained image count.
orderedResult = await saveOrder({ imageSourceIds: [f.id], imageAssetIds: [assetFor(d.id).id] })
assert.equal(orderedResult.success, true, JSON.stringify(orderedResult))
assertSourceOrder([d.id, f.id])
assert.deepEqual(orderedAssets().map((asset) => asset.sortOrder), [1, 2])
const beforeLegacyOmission = structuredClone(orderedAssets())
assert.equal((await saveOrder({ imageSourceIds: [], imageAssetIds: undefined })).success, true)
assert.deepEqual(orderedAssets(), beforeLegacyOmission, 'old caller omitting asset array preserves saved images and positions')
const currentAssets = orderedAssets()
const explicit = { imageSourceIds: [], imageAssetIds: currentAssets.map((asset) => asset.id), imageOrder: currentAssets.map((asset) => tagged('asset', asset.id)) }
const beforeMalformed = state.touched
for (const malformed of [
  { ...explicit, imageOrder: [] },
  { ...explicit, imageOrder: [explicit.imageOrder[0], explicit.imageOrder[0]] },
  { ...explicit, imageOrder: [explicit.imageOrder[0], tagged('asset', 'c9999999999999999999999999')] },
  { imageOrder: [], imageSourceIds: [], imageAssetIds: undefined },
  { imageSourceIds: [a.id, a.id], imageAssetIds: [], imageOrder: [tagged('source', a.id), tagged('source', a.id)] },
  { imageSourceIds: Array.from({ length: 9 }, (_, i) => source(i + 20).id), imageAssetIds: [], imageOrder: Array.from({ length: 9 }, (_, i) => tagged('source', source(i + 20).id)) },
]) assert.equal((await saveOrder(malformed)).code, 'VALIDATION_FAILED')
assert.equal(state.touched, beforeMalformed, 'malformed permutations reject before transaction')
const orderBeforeFailures = structuredClone(orderedAssets())
const versionBeforeFailures = orderRevision().version
const foreignAsset = 'c9999999999999999999999999'
assert.equal((await saveOrder({ imageSourceIds: [], imageAssetIds: [foreignAsset], imageOrder: [tagged('asset', foreignAsset)] })).code, 'VALIDATION_FAILED')
assert.deepEqual(orderedAssets(), orderBeforeFailures)
assert.equal((await saveOrder(explicit, { expectedVersion: versionBeforeFailures - 1 })).code, 'VERSION_CONFLICT')
state.authorized = false
assert.equal((await saveOrder(explicit)).success, false)
state.authorized = true
assert.equal(orderRevision().version, versionBeforeFailures)
// Force a late source-integrity failure after retained positions would otherwise be changed.
state.sources.find((entry) => entry.id === bad.id).sha256 = f.sha256
assert.equal((await saveOrder({ imageSourceIds: [bad.id], imageAssetIds: currentAssets.map((asset) => asset.id), imageOrder: [tagged('asset', currentAssets[1].id), tagged('source', bad.id), tagged('asset', currentAssets[0].id)] })).code, 'DUPLICATE_FILE')
assert.deepEqual(orderedAssets(), orderBeforeFailures, 'late source failure rolls back retained order and image mutation')
assert.equal(orderRevision().version, versionBeforeFailures)
const unknownSource = source(999).id
assert.equal((await saveOrder({ imageSourceIds: [unknownSource], imageAssetIds: [], imageOrder: [tagged('source', unknownSource)] })).code, 'FILE_NOT_CLEAN')
assert.deepEqual(orderedAssets(), orderBeforeFailures)
const countsBeforeCreateAsset = [state.customers.length, state.quotations.length, state.revisions.length, state.items.length]
const createAsset = await actions.createSalesQuotation({ ...orderInput, items: [{ ...input.items[0], imageSourceIds: [], imageAssetIds: [currentAssets[0].id], imageOrder: [tagged('asset', currentAssets[0].id)] }] })
assert.equal(createAsset.code, 'VALIDATION_FAILED')
assert.deepEqual([state.customers.length, state.quotations.length, state.revisions.length, state.items.length], countsBeforeCreateAsset)
assert.equal((await saveOrder({ imageSourceIds: [], imageAssetIds: [], imageOrder: [] })).success, true)
assert.deepEqual(orderedAssets(), [], 'explicit empty order clears selected images')
process.stdout.write('PASS: real-action customer/image/version and FX boundaries, new/saved/mixed image order, legacy append, invalid refs and rollback with an isolated transaction double. No database or storage contacted.\n')
