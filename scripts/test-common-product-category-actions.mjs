// Real category schemas, save action and read service. No .env, DB or storage access.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { build } from 'esbuild'

const require = createRequire(import.meta.url)
const productId = 'c000000000000000000000001'
const createdId = 'c000000000000000000000002'
const key = `quotation.product-defaults.${productId}`
const categoryKey = `quotation.product-category.${productId}`
const timestamp = '2026-10-21T01:00:00.000Z'
const input = { id: productId, expectedUpdatedAt: timestamp, name: 'Common product', specifications: 'Cotton', description: 'Customer description', packaging: '10 per bag', unit: 'pair', unitPrice: '12.50', unitCost: '8.25', currency: 'USD', active: true }
const control = { enabled: true, admin: true, calls: [], paths: [], failAt: null }
let state
let cases = 0

function reset() {
  Object.assign(control, { enabled: true, admin: true, calls: [], paths: [], failAt: null })
  state = {
    products: [{ id: productId, nameEn: 'Before', updatedAt: new Date(timestamp), productSource: 'Private source preserved', costPriceText: 'Private cost preserved' }],
    settings: [{ key, value: { unitPrice: '2.00', currency: 'USD', description: 'Before', packaging: 'Before' } }, { key: categoryKey, value: { category: '手部防护', unknown: { nested: [null, 1, 'a'] }, retainedNull: null } }],
    audits: [], counter: 0,
  }
}

const db = {
  quotationProduct: {
    updateMany: async ({ where, data }) => {
      control.calls.push('product-guard')
      const row = state.products.find((entry) => entry.id === where.id && entry.updatedAt.getTime() === where.updatedAt.getTime())
      if (!row) return { count: 0 }
      assert.equal('category' in data, false, 'Category must stay in Settings')
      Object.assign(row, data, { updatedAt: new Date(Date.parse(timestamp) + 1000) })
      return { count: 1 }
    },
    create: async ({ data }) => {
      control.calls.push('product-create')
      assert.equal('category' in data, false)
      const row = { ...data, id: createdId, updatedAt: new Date(timestamp) }
      state.products.push(row)
      return row
    },
  },
  setting: {
    upsert: async ({ where, create, update }) => {
      const isCategory = where.key.startsWith('quotation.product-category.')
      control.calls.push(isCategory ? 'category-write' : 'defaults-write')
      assert.ok(control.calls.includes('product-guard') || control.calls.includes('product-create'))
      if (control.failAt === (isCategory ? 'category-write' : 'defaults-write')) throw new Error('PRIVATE_SECRET database write')
      const row = state.settings.find((entry) => entry.key === where.key)
      if (row) Object.assign(row, update)
      else state.settings.push(create)
    },
    findMany: async (query) => {
      control.calls.push('categories-read')
      assert.deepEqual(query, { where: { key: { startsWith: 'quotation.product-category.' } }, select: { value: true } })
      return state.settings.filter((entry) => entry.key.startsWith(query.where.key.startsWith)).map((entry) => ({ value: entry.value }))
    },
  },
  quotationNumberCounter: { upsert: async () => ({ value: ++state.counter }) },
  quotationAuditLog: { create: async ({ data }) => {
    if (control.failAt === 'audit') throw new Error('PRIVATE_SECRET audit write')
    state.audits.push(data)
  } },
  $transaction: async (work) => {
    control.calls.push('transaction')
    const previous = structuredClone(state)
    try { return await work(db) } catch (error) { state = previous; throw error }
  },
}

const mocks = {
  '@/lib/prisma': 'export const prisma=require("category-state").db',
  '@/lib/auth-utils': 'export async function requireAdmin(){const c=require("category-state").control;c.calls.push("admin");if(!c.admin)throw new Error("PRIVATE_SECRET denied");return {id:"admin"}}',
  '@/lib/quotation/feature': 'import {QuotationError} from "@/lib/quotation/errors";export function assertQuotationWorkbenchEnabled(){const c=require("category-state").control;c.calls.push("gate");if(!c.enabled)throw new QuotationError("FEATURE_DISABLED","Disabled")}',
  'next/cache': 'export function revalidatePath(path){require("category-state").control.paths.push(path)}',
  'next/navigation': 'export function unstable_rethrow(){}',
}
const built = await build({
  stdin: { contents: 'export {saveCommonQuotationProduct} from "./src/actions/admin/common-quotation-products";export {commonProductDefaultsSchema,commonProductSchema,commonProductDescription} from "./src/lib/quotation/simple-input";export * from "./src/lib/quotation/common-product-category";export {readCommonProductCategories} from "./src/lib/quotation/services/common-product-categories"', resolveDir: process.cwd(), loader: 'ts' },
  bundle: true, write: false, platform: 'node', format: 'cjs', packages: 'external', define: { 'process.env': '{}' },
  plugins: [{ name: 'category-isolation', setup(plugin) {
    plugin.onResolve({ filter: /.*/ }, ({ path }) => path in mocks ? { path, namespace: 'mock' } : path === 'category-state' ? { path, external: true } : undefined)
    plugin.onLoad({ filter: /.*/, namespace: 'mock' }, ({ path }) => ({ contents: mocks[path], loader: 'js', resolveDir: process.cwd() }))
  } }],
})
const actionModule = { exports: {} }
new Function('require', 'module', 'exports', built.outputFiles[0].text)(name => name === 'category-state' ? { db, control } : require(name), actionModule, actionModule.exports)
const { saveCommonQuotationProduct: save, commonProductDefaultsSchema, commonProductSchema, commonProductDescription, commonProductCategorySchema, COMMON_PRODUCT_CATEGORIES, readCommonProductCategory, readCommonProductCategories } = actionModule.exports

assert.deepEqual(COMMON_PRODUCT_CATEGORIES, ['头部防护', '眼面防护', '听力防护', '呼吸防护', '手部防护', '足部防护', '身体防护', '雨衣雨具', '防坠落防护', '消防装备', '其他用品'])
assert.equal('category' in commonProductSchema.parse(input), false, 'Omitted input must remain distinguishable from an explicit clear')
assert.equal('category' in commonProductDefaultsSchema.parse({ category: 'Ignored legacy field' }), false)
assert.equal(readCommonProductCategory(undefined), '')
assert.equal(commonProductCategorySchema.parse(`  ${'a'.repeat(80)}  `), 'a'.repeat(80))
assert.equal(commonProductDescription({ ...input, category: 'Internal group' }), commonProductDescription(input), 'Grouping must not enter quotation descriptions')
cases++

for (const category of [undefined, '', '   ', ' 足部防护 ', '  Custom industrial supplies  ']) {
  reset()
  const originalCategory = structuredClone(state.settings[1])
  const result = await save({ ...input, ...(category === undefined ? {} : { category }) })
  assert.equal(result.success, true)
  assert.equal(state.settings[1].value.category, category === undefined ? '手部防护' : category.trim())
  if (category === undefined) {
    assert.deepEqual(state.settings[1], originalCategory, 'Old callers must preserve the entire separate category Setting')
    assert.equal(control.calls.includes('category-write'), false)
  }
  assert.deepEqual(state.settings[0].value, { unitPrice: '12.50', currency: 'USD', unitCost: '8.25', description: input.description, packaging: input.packaging }, 'Category must not change the existing price-defaults contract')
  assert.equal(state.settings[0].value.unitPrice, '12.50')
  assert.equal(state.settings[0].value.description, input.description)
  assert.equal(state.settings[0].value.packaging, input.packaging)
  assert.equal(state.products[0].productSource, 'Private source preserved')
  assert.equal(state.products[0].costPriceText, 'Private cost preserved')
  assert.equal(state.audits.length, 1)
  assert.equal(state.audits[0].action, 'UPDATE')
  cases++
}

for (const category of [undefined, '眼面防护', '自定义分类']) {
  reset()
  const createInput = { ...input, id: undefined, expectedUpdatedAt: undefined, ...(category === undefined ? {} : { category }) }
  const result = await save(createInput)
  assert.equal(result.success, true)
  const categorySetting = state.settings.find((entry) => entry.key === `quotation.product-category.${createdId}`)
  assert.equal(readCommonProductCategory(categorySetting?.value), category ?? '')
  if (category === undefined) assert.equal(categorySetting, undefined)
  assert.equal(state.audits[0].action, 'CREATE')
  cases++
}

for (const existing of [undefined, {}, { unknown: [1, 2], category: '' }]) {
  reset()
  if (existing === undefined) state.settings = state.settings.filter((entry) => entry.key !== categoryKey)
  else state.settings[1].value = existing
  const beforeCategory = structuredClone(state.settings.find((entry) => entry.key === categoryKey))
  assert.equal((await save(input)).success, true)
  assert.deepEqual(state.settings.find((entry) => entry.key === categoryKey), beforeCategory)
  assert.equal(control.calls.includes('category-write'), false)
  cases++
}

for (const category of [null, 123, ['手部防护'], 'a'.repeat(81)]) {
  reset(); const before = structuredClone(state)
  const result = await save({ ...input, category })
  assert.equal(result.code, 'VALIDATION_FAILED')
  assert.deepEqual(state, before)
  assert.deepEqual(control.calls, ['gate', 'admin'])
  assert.deepEqual(control.paths, [])
  cases++
}

reset(); const beforeStale = structuredClone(state)
assert.equal((await save({ ...input, expectedUpdatedAt: '2026-10-20T01:00:00.000Z', category: 'Changed' })).code, 'VERSION_CONFLICT')
assert.deepEqual(state, beforeStale)
assert.equal(control.calls.includes('defaults-write'), false)
assert.equal(control.calls.includes('category-write'), false)
assert.deepEqual(control.paths, []); cases++

for (const failure of ['defaults-write', 'category-write', 'audit']) {
  reset(); control.failAt = failure; const before = structuredClone(state)
  const result = await save({ ...input, category: 'Changed' })
  assert.equal(result.code, 'INTERNAL_ERROR')
  assert.equal(JSON.stringify(result).includes('PRIVATE_SECRET'), false)
  assert.deepEqual(state, before, 'All category/default/product changes must roll back')
  assert.deepEqual(control.paths, []); cases++
}

for (const guard of ['enabled', 'admin']) {
  reset(); control[guard] = false; const before = structuredClone(state)
  assert.equal((await save({ ...input, category: 'Changed' })).success, false)
  assert.equal(control.calls.includes('transaction'), false)
  assert.deepEqual(state, before); cases++
}

reset()
state.settings = [
  ...[' 手部防护 ', '手部防护', '自定义分类', '', '   ', null, 123, 'a'.repeat(81)].map((category, index) => ({ key: `quotation.product-category.${index}`, value: { category } })),
  { key: 'quotation.workbench.v2', value: { category: 'DO NOT READ' } },
  { key: 'quotation.product-defaults.legacy', value: { category: 'DO NOT READ' } },
  { key: 'quotation.product-category.null', value: null },
  { key: 'quotation.product-category.array', value: [] },
  { key: 'quotation.product-category.legacy', value: { currency: 'USD' } },
]
const beforeRead = structuredClone(state)
assert.deepEqual(new Set(await readCommonProductCategories()), new Set(['手部防护', '自定义分类']))
assert.deepEqual(control.calls, ['categories-read'])
assert.deepEqual(state, beforeRead)
for (const value of [null, [], '', 3, {}, { category: null }, { category: 'x'.repeat(81) }]) assert.equal(readCommonProductCategory(value), '')
assert.equal(readCommonProductCategory({ category: '  自定义分类  ' }), '自定义分类')
cases++

process.stdout.write(`PASS: ${cases} category cases; optional input, custom/create/clear, legacy category-Setting retention, separate price defaults, optimistic guards, rollback/auth, and saved category suggestions. Real actions/services with isolated doubles; no live DB or storage access.\n`)
