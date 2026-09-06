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
    findMany: async ({ where }) => state.items.filter((item) => item.revisionId === where.revisionId).sort((a, b) => a.sortOrder - b.sortOrder).map((item) => ({ ...item, assets: state.assets.filter((asset) => asset.itemId === item.id) })),
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
const input = { customerName: 'Sample Buyer', quotationDate: '2026-09-05', currency: 'USD', publicTerms: { Terms: 'Sample terms' }, items: [{ sortOrder: 0, nameEn: 'Sample glove', quantity: '3', unit: 'pair', unitPrice: '0.335', imageSourceIds: [], imageAssetIds: [] }] }
state.authorized = false
assert.equal((await actions.createSalesQuotation(input)).success, false)
assert.equal(state.touched, 0)
state.authorized = true
const created = await actions.createSalesQuotation(input)
assert.equal(created.success, true, JSON.stringify(created))
assert.equal(state.customers.length, 1)
assert.equal(state.revisions[0].total, '1.01')
assert.equal(state.revisions[0].templateVersion, 'jordan-ai-v1')
assert.equal(created.data.items.length, 1)
const update = { ...input, revisionId: created.data.revisionId, expectedVersion: 1, customerId: state.customers[0].id, customerName: 'Different Buyer', items: [{ ...input.items[0], id: created.data.items[0].id }] }
state.customers[0].contacts = [{ name: 'Old customer contact', email: 'private@old.test' }]
const saved = await actions.updateSalesQuotation(update)
assert.equal(saved.success, true, JSON.stringify(saved))
assert.equal(saved.data.version, 2)
assert.equal(state.customers[0].companyName, 'Sample Buyer')
assert.deepEqual(state.revisions[0].customerSnapshot.contacts, [])
assert.equal(state.revisions[0].customerSnapshot.companyName, 'Different Buyer')
assert.equal((await actions.updateSalesQuotation(update)).code, 'VERSION_CONFLICT')
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
state.revisions[0].state = 'FINALIZED'
assert.equal((await actions.updateSalesQuotation({ ...update, expectedVersion: 3 })).code, 'IMMUTABLE_REVISION')
process.stdout.write('PASS: 8 real-action boundary cases with an isolated transaction double. No database or storage contacted.\n')
