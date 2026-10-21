// Real picker action/service with isolated auth and Prisma doubles. No .env, DB or storage access.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { build } from 'esbuild'

const require = createRequire(import.meta.url)
const productId = (index) => `c${String(index).padStart(24, '0')}`
const sourceId = (index) => `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`
const control = { enabled: true, admin: true, redirect: false, failRead: null, calls: [], paths: [] }
let state
let cases = 0

function image(index, overrides = {}) {
  return {
    sourceFileId: sourceId(index), displayName: `Image ${index}`, sortOrder: index,
    contentType: 'image/png', isCustomerVisible: true, objectKey: 'PRIVATE_SECRET/image.png',
    sourceFile: { securityStatus: 'CLEAN', deletedAt: null, salesQuotationId: null, contentType: 'image/png', sizeBytes: 50 },
    ...overrides,
  }
}

function reset(count = 1) {
  Object.assign(control, { enabled: true, admin: true, redirect: false, failRead: null, calls: [], paths: [] })
  state = {
    products: Array.from({ length: count }, (_, index) => ({
      id: productId(index + 1), nameEn: `Product ${index + 1}`, nameZh: `产品 ${index + 1}`,
      internalNumber: `QP-${index + 1}`, model: `Model-${index + 1}`, sku: `SKU-${index + 1}`,
      unit: 'pair', specifications: ['Specification A', 'Specification B'], status: 'ACTIVE',
      updatedAt: new Date(Date.UTC(2026, 9, 21, 0, 0, index)), images: [],
      productSource: 'PRIVATE_SECRET supplier', costPriceText: 'PRIVATE_SECRET costs',
      internalNotes: 'PRIVATE_SECRET notes',
    })),
    settings: [{ key: `quotation.product-defaults.${productId(1)}`, value: { unitPrice: '12.50', currency: 'EUR', unitCost: '8.25', description: 'Customer description', packaging: 'Carton', productSource: 'PRIVATE_SECRET nested supplier' } }],
  }
}

function matches(row, where) {
  if (!row) return false
  return Object.entries(where).every(([key, value]) => {
    if (value && typeof value === 'object') {
      if ('not' in value) return row[key] !== value.not
      if ('in' in value) return value.in.includes(row[key])
      if ('gt' in value || 'lte' in value) return row[key] > value.gt && row[key] <= value.lte
      return matches(row[key], value)
    }
    return row[key] === value
  })
}

function selected(row, select) {
  return Object.fromEntries(Object.entries(select).map(([key, value]) => {
    if (value === true) return [key, row[key]]
    const rows = row[key].filter((entry) => matches(entry, value.where))
    const [sortKey, direction] = Object.entries(value.orderBy)[0]
    rows.sort((a, b) => (a[sortKey] > b[sortKey] ? 1 : -1) * (direction === 'asc' ? 1 : -1))
    return [key, rows.slice(0, value.take).map((entry) => selected(entry, value.select))]
  }))
}

const db = {
  quotationProduct: { findMany: async (query) => {
    control.calls.push('products')
    if (control.failRead === 'products') throw new Error('PRIVATE_SECRET database hostname/password')
    assert.equal(query.take, undefined, 'The complete collection must not be capped')
    assert.equal(query.include, undefined, 'Use explicit safe projections')
    assert.deepEqual(query.where, { status: { not: 'INACTIVE' } })
    assert.deepEqual(query.orderBy, { updatedAt: 'desc' })
    assert.deepEqual(Object.keys(query.select).sort(), ['id', 'images', 'internalNumber', 'model', 'nameEn', 'nameZh', 'sku', 'specifications', 'unit'].sort())
    assert.deepEqual(query.select.images.select, { sourceFileId: true, displayName: true })
    assert.equal(query.select.images.take, 8)
    assert.deepEqual(query.select.images.orderBy, { sortOrder: 'asc' })
    return state.products.filter((entry) => matches(entry, query.where)).sort((a, b) => b.updatedAt - a.updatedAt).map((entry) => selected(entry, query.select))
  } },
  setting: { findMany: async (query) => {
    control.calls.push('defaults')
    if (control.failRead === 'defaults') throw new Error('PRIVATE_SECRET setting read error')
    assert.deepEqual(query.select, { key: true, value: true })
    assert.ok(query.where.key.in.every((key) => key.startsWith('quotation.product-defaults.')))
    assert.equal(new Set(query.where.key.in).size, query.where.key.in.length)
    return state.settings.filter((entry) => matches(entry, query.where)).map((entry) => selected(entry, query.select))
  } },
}

const mocks = {
  '@/lib/prisma': 'export const prisma=require("picker-state").db',
  '@/lib/auth-utils': 'export async function requireAdmin(){const c=require("picker-state").control;c.calls.push("admin");if(c.redirect)throw Object.assign(new Error("Redirect"),{digest:"NEXT_REDIRECT;replace;/login"});if(!c.admin)throw new Error("PRIVATE_SECRET auth denied");return {id:"admin"}}',
  '@/lib/quotation/feature': 'import {QuotationError} from "@/lib/quotation/errors";export function assertQuotationWorkbenchEnabled(){const c=require("picker-state").control;c.calls.push("gate");if(!c.enabled)throw new QuotationError("FEATURE_DISABLED","Quotation workbench is disabled")}',
  'next/cache': 'export function revalidatePath(path){require("picker-state").control.paths.push(path)}',
  'next/navigation': 'export function unstable_rethrow(error){if(error?.digest?.startsWith("NEXT_REDIRECT"))throw error}',
}
const built = await build({
  stdin: { contents: 'export {loadCommonQuotationProducts} from "./src/actions/admin/common-quotation-products"; export {commonProductOptionSchema,commonProductOptionsSchema} from "./src/lib/quotation/simple-input"', resolveDir: process.cwd(), loader: 'ts' },
  bundle: true, write: false, platform: 'node', format: 'cjs', packages: 'external', define: { 'process.env': '{}' },
  plugins: [{ name: 'picker-isolation', setup(plugin) {
    plugin.onResolve({ filter: /.*/ }, ({ path }) => path in mocks ? { path, namespace: 'mock' } : path === 'picker-state' ? { path, external: true } : undefined)
    plugin.onLoad({ filter: /.*/, namespace: 'mock' }, ({ path }) => ({ contents: mocks[path], loader: 'js', resolveDir: process.cwd() }))
  } }],
})
const actionModule = { exports: {} }
new Function('require', 'module', 'exports', built.outputFiles[0].text)(name => name === 'picker-state' ? { db, control } : require(name), actionModule, actionModule.exports)
const { loadCommonQuotationProducts: load, commonProductOptionSchema, commonProductOptionsSchema } = actionModule.exports

function noPrivateData(result) {
  assert.equal(JSON.stringify(result).includes('PRIVATE_SECRET'), false)
  assert.deepEqual(control.paths, [], 'Loading is read-only and must not revalidate pages')
}

reset(505)
state.products.slice(500).forEach((product) => { product.status = 'DRAFT' })
state.products.push({ ...state.products[0], id: productId(999), status: 'INACTIVE' })
const before = structuredClone(state)
const all = await load()
assert.equal(all.success, true)
assert.equal(all.data.length, 505, 'Products after the former 500 cap and DRAFT products remain selectable')
assert.equal(all.data[0].id, productId(505))
assert.equal(all.data.at(-1).id, productId(1))
assert.deepEqual(control.calls, ['gate', 'admin', 'products', 'defaults'])
assert.deepEqual(state, before, 'No source/default/product mutation')
assert.equal(commonProductOptionsSchema.safeParse(all.data).success, true)
noPrivateData(all); cases++

reset(2)
state.products[1].nameEn = null
state.products[1].model = null
state.products[1].sku = null
state.products[1].specifications = { unstructured: true }
state.settings.push({ key: `quotation.product-defaults.${productId(2)}`, value: {} })
state.settings.reverse()
const defaults = await load()
assert.equal(defaults.success, true)
assert.deepEqual(defaults.data[0], { id: productId(2), name: '产品 2', nameEn: null, nameZh: '产品 2', internalNumber: 'QP-2', model: null, sku: null, specifications: '', description: '', unit: 'pair', unitPrice: '0', currency: 'USD', active: true, images: [] })
assert.equal(defaults.data[1].unitPrice, '12.50')
assert.equal(defaults.data[1].unitCost, '8.25')
assert.equal(defaults.data[1].currency, 'EUR')
assert.equal(defaults.data[1].description, 'Customer description')
assert.equal(defaults.data[1].packaging, 'Carton')
assert.equal(defaults.data[1].specifications, 'Specification A\nSpecification B')
noPrivateData(defaults); cases++

reset(1)
state.settings = []
const missingDefaults = await load()
assert.equal(missingDefaults.success, true)
assert.equal(missingDefaults.data[0].unitPrice, '0')
assert.equal(missingDefaults.data[0].currency, 'USD')
assert.equal(missingDefaults.data[0].description, '')
cases++

reset()
const validImages = Array.from({ length: 10 }, (_, index) => image(index + 20))
state.products[0].images = [
  image(1, { sourceFile: null }),
  image(2, { isCustomerVisible: false }),
  image(3, { contentType: 'application/pdf' }),
  ...[
    { securityStatus: 'PENDING' }, { deletedAt: new Date() }, { salesQuotationId: productId(1) },
    { contentType: 'image/webp' }, { sizeBytes: 0 }, { sizeBytes: 5 * 1024 * 1024 + 1 },
  ].map((source, index) => image(index + 4, { sourceFile: { ...image(index + 4).sourceFile, ...source } })),
  ...validImages.reverse(),
]
state.products[0].images.find((entry) => entry.sourceFileId === sourceId(20)).displayName = null
const images = await load()
assert.equal(images.success, true)
assert.deepEqual(images.data[0].images.map((entry) => entry.id), Array.from({ length: 8 }, (_, index) => sourceId(index + 20)))
assert.equal(images.data[0].images[0].name, '产品图片')
assert.ok(images.data[0].images.every((entry) => entry.kind === 'source'))
assert.deepEqual(Object.keys(images.data[0].images[0]).sort(), ['id', 'kind', 'name'])
noPrivateData(images); cases++

reset(0)
const empty = await load()
assert.equal(empty.success, true)
assert.deepEqual(empty.data, [])
assert.deepEqual(control.calls, ['gate', 'admin', 'products'])
noPrivateData(empty); cases++

for (const [guard, expectedCalls] of [['enabled', ['gate']], ['admin', ['gate', 'admin']]]) {
  reset(); control[guard] = false
  const denied = await load()
  assert.equal(denied.success, false)
  assert.deepEqual(control.calls, expectedCalls)
  if (guard === 'enabled') assert.equal(denied.code, 'FEATURE_DISABLED')
  noPrivateData(denied); cases++
}

reset(); control.redirect = true
await assert.rejects(load, (error) => error.digest.startsWith('NEXT_REDIRECT'))
assert.deepEqual(control.calls, ['gate', 'admin']); cases++

for (const table of ['products', 'defaults']) {
  reset(); control.failRead = table
  const failed = await load()
  assert.equal(failed.success, false)
  assert.equal(failed.code, 'INTERNAL_ERROR')
  assert.equal(failed.reason, 'The quotation operation could not be completed')
  assert.equal('data' in failed, false)
  noPrivateData(failed); cases++
}

for (const corrupt of ['defaults', 'product']) {
  reset()
  if (corrupt === 'defaults') state.settings[0].value.unitPrice = 'PRIVATE_SECRET broken decimal'
  else state.products[0].nameEn = state.products[0].nameZh = null
  const invalid = await load()
  assert.equal(invalid.success, false)
  assert.equal(invalid.code, 'VALIDATION_FAILED')
  assert.equal('data' in invalid, false)
  noPrivateData(invalid); cases++
}

reset()
const original = (await load()).data[0]
const stripped = commonProductOptionSchema.parse({ ...original, productSource: 'PRIVATE_SECRET', costPriceText: 'PRIVATE_SECRET', internalNotes: 'PRIVATE_SECRET', objectKey: 'PRIVATE_SECRET', images: [{ id: sourceId(1), kind: 'source', name: 'Safe image', objectKey: 'PRIVATE_SECRET' }] })
noPrivateData(stripped)
const optionalFacts = { ...original }
for (const field of ['nameEn', 'nameZh', 'internalNumber', 'model', 'sku']) delete optionalFacts[field]
assert.equal(commonProductOptionSchema.safeParse(optionalFacts).success, true)
assert.equal(commonProductOptionSchema.safeParse({ ...original, unitCost: null }).success, true)
cases++

process.stdout.write(`PASS: ${cases} picker cases; complete collection, safe projection, defaults, ordered clean images, auth/gate and safe failures verified with real action/service and isolated Prisma double. No live DB or storage access.\n`)
