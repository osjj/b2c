// Real sales-list page/repository with isolated Prisma I/O. No .env or network.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { build } from 'esbuild'
import { renderToStaticMarkup } from 'react-dom/server'

const require = createRequire(import.meta.url)
const { Prisma } = require('@prisma/client')
const state = { rows: [], calls: [], rawCalls: [], forbiddenReads: 0, admin: true, enabled: true, malformedName: false }
const revision = (id, name, number = 1) => ({ id, revisionNumber: number, state: 'DRAFT', quotationDate: new Date('2026-11-06T00:00:00.000Z'), currency: 'USD', total: new Prisma.Decimal('1234.560000'), _count: { items: 17 }, customerSnapshot: { companyName: name, quotationBrand: { logo: { dataUrl: `data:image/png;base64,${'A'.repeat(1024 * 1024)}` } } }, publicTerms: { secret: 'not a list field' }, internalNotes: 'not a list field' })
const quotation = (id, name, number = 1) => ({ id, quotationNumber: `QT-${id}`, updatedAt: new Date(2026, 10, number), revisions: [revision(`r-${id}`, name, number)] })
const matchingRows = (where) => {
  if (!where.OR) return state.rows
  const search = where.OR[0].quotationNumber.contains.toLowerCase()
  assert.deepEqual(where.OR[1], { revisions: { some: { customerSnapshot: { path: ['companyName'], string_contains: where.OR[0].quotationNumber.contains, mode: 'insensitive' } } } })
  return state.rows.filter(row => row.quotationNumber.toLowerCase().includes(search) || row.revisions.some(item => String(item.customerSnapshot.companyName).toLowerCase().includes(search)))
}
const db = {
  salesQuotation: {
    findMany: async (args) => {
      state.calls.push({ method: 'findMany', args })
      if (!args.select || args.select.revisions.select.customerSnapshot) {
        state.forbiddenReads++
        throw new Error('List must not transfer complete customerSnapshot or revision records')
      }
      const selected = args.select.revisions.select
      assert.equal(selected.publicTerms, undefined)
      assert.equal(selected.internalNotes, undefined)
      assert.equal(args.select.customer, undefined, 'Use the immutable revision name, not the current customer name')
      assert.equal(args.select.revisions.take, 1)
      assert.deepEqual(args.select.revisions.orderBy, { revisionNumber: 'desc' })
      return matchingRows(args.where).toSorted((a, b) => b.updatedAt - a.updatedAt).slice(args.skip, args.skip + args.take).map(row => ({ id: row.id, quotationNumber: row.quotationNumber, revisions: row.revisions.toSorted((a, b) => b.revisionNumber - a.revisionNumber).slice(0, 1).map(item => Object.fromEntries(Object.keys(selected).map(key => [key, item[key]]))) }))
    },
    count: async (args) => { state.calls.push({ method: 'count', args }); return matchingRows(args.where).length },
  },
  $queryRaw: async (query) => {
    state.rawCalls.push(query)
    assert.match(query.text, /customer_snapshot\s*->>\s*'companyName'/)
    assert.match(query.text, /jsonb_typeof/)
    assert.doesNotMatch(query.text, /SELECT\s+\*/i)
    assert.ok(query.values.length <= 20)
    for (const value of query.values) assert.equal(query.text.includes(value), false, 'Revision IDs must be bound parameters')
    return state.rows.flatMap(row => row.revisions).filter(item => query.values.includes(item.id)).map(item => ({ id: item.id, companyName: state.malformedName || typeof item.customerSnapshot.companyName !== 'string' ? null : item.customerSnapshot.companyName }))
  },
}
const mocks = {
  '@/lib/prisma': 'export const prisma=require("projection-state").db',
  '@/lib/auth-utils': 'export async function requireAdmin(){if(!require("projection-state").state.admin)throw new Error("Not admin")}',
  '@/lib/quotation/feature': 'export function isQuotationWorkbenchEnabled(){return require("projection-state").state.enabled}',
  'next/navigation': 'export function notFound(){throw new Error("Not found")}',
  'next/link': 'export default function Link({children,href,...rest}){return require("react").createElement("a",{href,...rest},children)}',
  '@/components/admin/quotation/workbench-header': 'export function WorkbenchHeader({title,children}){return require("react").createElement("header",null,title,children)}',
  '@/components/admin/pagination': 'export function Pagination({page,total,totalPages}){return require("react").createElement("output",null,JSON.stringify({page,total,totalPages}))}',
  '@/components/ui/button': 'export function Button({children}){return require("react").createElement("span",null,children)}',
  '@/components/ui/input': 'export function Input(props){return require("react").createElement("input",props)}',
}
const built = await build({ entryPoints: ['src/app/admin/sales-quotations/page.tsx'], bundle: true, write: false, platform: 'node', format: 'cjs', packages: 'external', jsx: 'automatic', define: { 'process.env': '{}' }, plugins: [{ name: 'isolate', setup(plugin) {
  plugin.onResolve({ filter: /.*/ }, ({ path }) => path in mocks ? { path, namespace: 'mock' } : path === 'projection-state' ? { path, external: true } : undefined)
  plugin.onLoad({ filter: /.*/, namespace: 'mock' }, ({ path }) => ({ contents: mocks[path], loader: 'js', resolveDir: process.cwd() }))
} }] })
const pageModule = { exports: {} }
new Function('require', 'module', 'exports', built.outputFiles[0].text)((name) => name === 'projection-state' ? { state, db } : require(name), pageModule, pageModule.exports)
const render = async (searchParams = {}) => renderToStaticMarkup(await pageModule.exports.default({ searchParams: Promise.resolve(searchParams) }))
function reset(rows = []) { Object.assign(state, { rows, calls: [], rawCalls: [], forbiddenReads: 0, admin: true, enabled: true, malformedName: false }) }

reset([quotation('one', 'Historical customer')])
const first = await render()
assert.ok(first.includes('Historical customer'))
assert.ok(first.includes('1234.56'))
assert.ok(first.includes('17'))
assert.ok(first.includes('2026-11-06'))
assert.ok(!first.includes('data:image') && !first.includes('quotationBrand'))
assert.equal(state.forbiddenReads, 0)
assert.equal(state.rawCalls.length, 1)
assert.ok(first.length < 10_000, 'A one-megabyte image snapshot must not enlarge the list response')

reset(Array.from({ length: 25 }, (_, index) => quotation(`q${index}`, `History ${index}`, index + 1)))
const paginated = await render({ page: '2' })
assert.ok(paginated.includes('History 0') && !paginated.includes('History 24'))
assert.equal(state.calls.find(call => call.method === 'findMany').args.take, 20)
assert.equal(state.calls.find(call => call.method === 'findMany').args.skip, 20)
assert.equal(state.rawCalls[0].values.length, 5)
assert.ok(paginated.includes('&quot;total&quot;:25'))

const oldName = "Former O'Reilly %_ \\ customer"
const versioned = quotation('versioned', 'Current quotation name', 2)
versioned.revisions.push(revision('r-old', oldName, 1))
reset([versioned])
const searched = await render({ search: oldName.toLowerCase() })
assert.ok(searched.includes('Current quotation name'), 'An old revision match must display the latest revision')
assert.ok(!searched.includes('data:image'))
assert.deepEqual(state.rawCalls[0].values, ['r-versioned'])

reset([quotation('bound', 'Bound revision')])
state.rows[0].revisions[0].id = "revision'); DROP TABLE sales_quotations; --"
assert.ok((await render()).includes('Bound revision'))
assert.deepEqual(state.rawCalls[0].values, [state.rows[0].revisions[0].id])

reset()
assert.ok((await render()).includes('开始你的第一份报价'))
assert.equal(state.rawCalls.length, 0)
reset([{ ...quotation('empty', 'Unused'), revisions: [] }])
await render()
assert.equal(state.rawCalls.length, 0)

reset([quotation('bad', 42)])
await assert.rejects(render(), /companyName/)
reset([quotation('missing', 'Present')])
db.$queryRaw = async () => []
await assert.rejects(render(), /companyName|snapshot|customer/i)

reset()
state.admin = false
await assert.rejects(render(), /Not admin/)
assert.equal(state.calls.length, 0)
reset()
state.enabled = false
await assert.rejects(render(), /Not found/)
assert.equal(state.calls.length, 0)
console.log('PASS sales-list projection: lean historical names, pagination, any-revision search, bound IDs, empty/malformed data and access gates')
