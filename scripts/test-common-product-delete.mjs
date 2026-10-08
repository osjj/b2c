// Real Server Action with a transactional Prisma double; no .env, DB or storage access.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { build } from 'esbuild'
import { Prisma } from '@prisma/client'

const require = createRequire(import.meta.url)
const productId = 'c000000000000000000000001'
const otherId = 'c000000000000000000000002'
const updatedAt = new Date('2026-10-08T01:00:00.000Z')
const input = { id: productId, expectedUpdatedAt: updatedAt.toISOString() }
const control = { enabled: true, admin: true, dbCalls: 0, failAudit: false, failDefaults: false, race: null, paths: [] }
let state
let cases = 0
function reset(status = 'ACTIVE') {
  Object.assign(control, { enabled: true, admin: true, dbCalls: 0, failAudit: false, failDefaults: false, race: null, paths: [] })
  state = {
    products: [{ id: productId, productId: otherId, nameEn: 'Reusable sample', status, updatedAt: new Date(updatedAt) }, { id: otherId, status: 'ACTIVE', updatedAt: new Date(updatedAt) }],
    settings: [{ key: `quotation.product-defaults.${productId}`, value: { unitPrice: '12.50', unitCost: '8.25' } }, { key: `quotation.product-defaults.${otherId}`, value: { unitPrice: '9' } }, { key: 'quotation.workbench.v2', value: { currency: 'USD' } }],
    images: [{ id: 'image-own', quotationProductId: productId, sourceFileId: 'source' }, { id: 'image-other', quotationProductId: otherId, sourceFileId: 'source' }],
    supplierReferences: [{ id: 'supplier', quotationProductId: productId, sourceFileId: 'source' }],
    sources: [{ id: 'source', objectKey: 'private/image.png', deletedAt: null }],
    objects: [{ key: 'private/image.png', sha256: 'retained-hash' }],
    items: [{ id: 'historical-item', quotationProductId: null, nameEn: 'Saved sample', unitPrice: '12.50', specifications: ['Original description'] }],
    assets: [{ id: 'historical-asset', itemId: 'historical-item', sourceFileId: 'source', objectKey: 'private/frozen.png' }],
    documents: [{ id: 'finalized-document', sha256: 'frozen-hash' }],
    catalog: [{ id: otherId, name: 'Storefront sample', price: '15', isActive: true }],
    costs: [], audits: [],
  }
}
const matches = (row, where) => Object.entries(where).every(([key, value]) => value instanceof Date ? row[key]?.getTime() === value.getTime() : row[key] === value)
const referenceError = () => new Prisma.PrismaClientKnownRequestError('Foreign key constraint failed', { code: 'P2003', clientVersion: '6.19.1' })
const db = {
  quotationProduct: {
    findUnique: async ({ where, select }) => {
      const row = state.products.find(entry => matches(entry, where))
      return row ? Object.fromEntries(Object.keys(select).map(key => [key, row[key]])) : null
    },
    deleteMany: async ({ where }) => {
      assert.equal(where.id, productId)
      assert.ok(where.updatedAt instanceof Date, 'Delete itself must guard the expected timestamp')
      if (control.race === 'version') return { count: 0 }
      if (control.race === 'reference') throw referenceError()
      if (state.items.some(row => row.quotationProductId === where.id) || state.costs.some(row => row.quotationProductId === where.id)) throw referenceError()
      const before = state.products.length
      state.products = state.products.filter(row => !matches(row, where))
      const count = before - state.products.length
      if (count) {
        // Model only the real schema's cascaded reference rows, not source files.
        state.images = state.images.filter(row => row.quotationProductId !== where.id)
        state.supplierReferences = state.supplierReferences.filter(row => row.quotationProductId !== where.id)
      }
      return { count }
    },
  },
  salesQuotationItem: { count: async ({ where }) => state.items.filter(row => matches(row, where)).length },
  quotationProductCostRecord: { count: async ({ where }) => state.costs.filter(row => matches(row, where)).length },
  setting: { deleteMany: async ({ where }) => {
    assert.deepEqual(where, { key: `quotation.product-defaults.${productId}` })
    if (control.failDefaults) throw new Error('PRIVATE_SECRET cleanup failed')
    const before = state.settings.length
    state.settings = state.settings.filter(row => !matches(row, where))
    return { count: before - state.settings.length }
  } },
  quotationAuditLog: { create: async ({ data }) => { if (control.failAudit) throw new Error('PRIVATE_SECRET audit failed'); state.audits.push(data); return data } },
  $transaction: async (work) => {
    control.dbCalls++
    const backup = structuredClone(state)
    try { return await work(db) } catch (error) { state = backup; throw error }
  },
}
const mocks = {
  '@/lib/prisma': 'export const prisma=require("delete-state").db',
  '@/lib/auth-utils': 'export async function requireAdmin(){if(!require("delete-state").control.admin)throw new Error("Denied");return {id:"admin"}}',
  '@/lib/quotation/feature': 'import {QuotationError} from "@/lib/quotation/errors";export function assertQuotationWorkbenchEnabled(){if(!require("delete-state").control.enabled)throw new QuotationError("FEATURE_DISABLED","Disabled")}',
  'next/cache': 'export function revalidatePath(path){require("delete-state").control.paths.push(path)}',
  'next/navigation': 'export function unstable_rethrow(){}',
}
const built = await build({
  stdin: { contents: 'export {deleteCommonQuotationProduct} from "./src/actions/admin/common-quotation-products"', resolveDir: process.cwd(), loader: 'ts' },
  bundle: true, write: false, platform: 'node', format: 'cjs', packages: 'external', define: { 'process.env': '{}' },
  plugins: [{ name: 'delete-isolation', setup(plugin) {
    plugin.onResolve({ filter: /.*/ }, ({ path }) => path in mocks ? { path, namespace: 'mock' } : path === 'delete-state' ? { path, external: true } : undefined)
    plugin.onLoad({ filter: /.*/, namespace: 'mock' }, ({ path }) => ({ contents: mocks[path], loader: 'js', resolveDir: process.cwd() }))
  } }],
})
const actionModule = { exports: {} }
new Function('require', 'module', 'exports', built.outputFiles[0].text)(name => name === 'delete-state' ? { db, control } : require(name), actionModule, actionModule.exports)
const remove = actionModule.exports.deleteCommonQuotationProduct

for (const status of ['ACTIVE', 'INACTIVE', 'DRAFT']) {
  reset(status)
  const retained = Object.fromEntries(['sources', 'objects', 'items', 'assets', 'documents', 'catalog', 'costs'].map(key => [key, structuredClone(state[key])]))
  const result = await remove(input)
  assert.equal(result.success, true)
  assert.deepEqual(result.data, { id: productId })
  assert.deepEqual(state.products.map(row => row.id), [otherId])
  assert.equal(state.settings.some(row => row.key.endsWith(productId)), false)
  assert.equal(state.settings.length, 2)
  assert.deepEqual(state.images.map(row => row.id), ['image-other'])
  assert.deepEqual(state.supplierReferences, [])
  for (const [key, value] of Object.entries(retained)) assert.deepEqual(state[key], value, `Retain ${key}`)
  assert.equal(state.audits.length, 1)
  assert.equal(state.audits[0].action, 'ARCHIVE')
  assert.equal(state.audits[0].entityId, productId)
  assert.equal(state.audits[0].metadata.deleted, true)
  assert.ok(control.paths.includes('/admin/quotation-products'))
  assert.ok(control.paths.includes(`/admin/quotation-products/${productId}`))
  cases++
}
reset(); state.settings = state.settings.filter(row => !row.key.endsWith(productId)); state.images = []; state.supplierReferences = []; state.products[0].productId = null
assert.equal((await remove(input)).success, true); cases++
for (const bad of [{}, { id: 'bad', expectedUpdatedAt: input.expectedUpdatedAt }, { id: productId, expectedUpdatedAt: 'bad' }, { id: productId }]) {
  reset(); const before = structuredClone(state)
  assert.equal((await remove(bad)).code, 'VALIDATION_FAILED'); assert.equal(control.dbCalls, 0); assert.deepEqual(state, before); cases++
}
for (const [setup, code] of [
  [() => { state.products = state.products.filter(row => row.id !== productId) }, 'NOT_FOUND'],
  [() => { state.products[0].updatedAt = new Date('2026-10-08T02:00:00.000Z') }, 'VERSION_CONFLICT'],
  [() => { state.items[0].quotationProductId = productId }, 'REFERENCED_RECORD'],
  [() => { state.costs.push({ id: 'cost', quotationProductId: productId, amount: '8.25' }) }, 'REFERENCED_RECORD'],
  [() => { control.race = 'version' }, 'VERSION_CONFLICT'],
  [() => { control.race = 'reference' }, 'REFERENCED_RECORD'],
  [() => { control.failAudit = true }, 'INTERNAL_ERROR'],
  [() => { control.failDefaults = true }, 'INTERNAL_ERROR'],
]) {
  reset(); setup(); const before = structuredClone(state)
  const result = await remove(input)
  assert.equal(result.code, code); assert.equal(result.success, false); assert.deepEqual(state, before); assert.deepEqual(control.paths, [])
  assert.equal(JSON.stringify(result).includes('PRIVATE_SECRET'), false); cases++
}
for (const guard of ['enabled', 'admin']) {
  reset(); control[guard] = false; const before = structuredClone(state)
  assert.equal((await remove(input)).success, false); assert.equal(control.dbCalls, 0); assert.deepEqual(state, before); cases++
}
reset(); assert.equal((await remove(input)).success, true); const after = structuredClone(state)
assert.equal((await remove(input)).code, 'NOT_FOUND'); assert.deepEqual(state, after); cases++
console.log(`PASS: ${cases} deletion cases, optimistic predicate/FK race/rollback/auth/retention verified with real action and isolated Prisma double. No live DB or storage writes.`)
