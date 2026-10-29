// Run the actual read actions with an in-memory Prisma double; no env or database access.
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'

const records = [
  { id: 'assigned', name: 'Safety Gloves', sku: 'GL-1', categoryId: 'other-supplies', isActive: true },
  { id: 'unassigned', name: 'Safety Goggles', sku: 'EG-2', categoryId: null, isActive: true },
  { id: 'hidden', name: 'Safety Gloves Hidden', sku: 'GL-0', categoryId: null, isActive: false },
  { id: 'other', name: 'Safety Helmet', sku: 'HH-1', categoryId: 'head', isActive: true },
  { id: 'different-search', name: 'Work Jacket', sku: 'WJ-1', categoryId: null, isActive: true },
].map((record) => ({ ...record, price: '2.50', comparePrice: null, cost: null, weight: null, priceTiers: [] }))

function matches(record, where) {
  return Object.entries(where).every(([key, condition]) => {
    if (key === 'OR') return condition.some((item) => matches(record, item))
    if (key === 'AND') return condition.every((item) => matches(record, item))
    if (condition && typeof condition === 'object') {
      if ('in' in condition) return condition.in.includes(record[key])
      if ('contains' in condition) return record[key].toLowerCase().includes(condition.contains.toLowerCase())
    }
    return record[key] === condition
  })
}

let selectedWhere
const categories = [
  { id: 'other-supplies', slug: 'other-supplies' },
  { id: 'head', slug: 'head-protection' },
  { id: 'legacy', slug: 'uncategorized' },
]
const prisma = {
  category: { findMany: async () => categories },
  product: {
    findMany: async ({ where, skip, take }) => {
      selectedWhere = where
      return records.filter((record) => matches(record, where)).slice(skip, skip + take)
    },
    count: async ({ where }) => records.filter((record) => matches(record, where)).length,
  },
}

async function action(file, start, end, scope) {
  const source = await readFile(new URL(file, import.meta.url), 'utf8')
  const body = source.slice(source.indexOf(start), source.indexOf(end))
  assert.ok(body.startsWith(start), `Missing real action in ${file}`)
  const compiled = ts.transpile(body.replace('export async function', 'async function'), {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.None,
  })
  return new Function(...Object.keys(scope), `${compiled}\nreturn ${start.match(/function (\w+)/)[1]};`)(...Object.values(scope))
}

const getProducts = await action('../src/actions/products.ts', 'export async function getProducts(', '// Get single product by ID', { prisma })
const getCategories = await action('../src/actions/categories.ts', 'export async function getCategories(', '// Get category tree (hierarchical)', {
  prisma,
  getCategorySubtreeIds: async (id) => [id],
})

async function ids(options) {
  const result = await getProducts(options)
  assert.equal(result.pagination.total, records.filter((record) => matches(record, selectedWhere)).length)
  return result.products.map(({ id }) => id)
}

assert.deepEqual(await ids({ categoryIds: ['other-supplies'], includeUncategorized: true, activeOnly: true }), ['assigned', 'unassigned', 'different-search'])
assert.deepEqual(await ids({ categoryIds: ['other-supplies'], includeUncategorized: true, search: 'safety', activeOnly: true }), ['assigned', 'unassigned'])
assert.deepEqual(await ids({ categoryIds: ['other-supplies'], includeUncategorized: true, search: 'eg-2', activeOnly: true }), ['unassigned'])
assert.deepEqual(await ids({ categoryIds: ['other-supplies'], includeUncategorized: true, search: 'helmet', activeOnly: true }), [])
assert.deepEqual(await ids({ categoryId: 'other-supplies', includeUncategorized: true, activeOnly: true }), ['assigned', 'unassigned', 'different-search'])
assert.deepEqual(await ids({ categoryId: 'head', categoryIds: ['other-supplies'], includeUncategorized: true, activeOnly: true }), ['assigned', 'unassigned', 'different-search'])
assert.deepEqual(await ids({ categoryIds: ['other-supplies'], activeOnly: true }), ['assigned'])
assert.deepEqual(await ids({ categoryId: 'head', includeUncategorized: false, activeOnly: true }), ['other'])
assert.deepEqual(await ids({ includeUncategorized: true, activeOnly: true }), ['assigned', 'unassigned', 'other', 'different-search'])
assert.deepEqual(await ids({ categoryIds: ['other-supplies'], includeUncategorized: true, isActive: false, activeOnly: true }), ['hidden'])
assert.deepEqual(await ids({ categoryIds: ['other-supplies'], includeUncategorized: true }), ['assigned', 'unassigned', 'hidden', 'different-search'])

const counts = await getCategories({ includeProductRollupCount: true })
assert.equal(counts.find(({ slug }) => slug === 'other-supplies').productRollupCount, 3)
assert.equal(counts.find(({ slug }) => slug === 'head-protection').productRollupCount, 1)
assert.equal(counts.find(({ slug }) => slug === 'uncategorized').productRollupCount, 0)

console.log('Other Supplies filtering, search intersection, active boundaries, category priority and rollup counts passed (14 checks).')
