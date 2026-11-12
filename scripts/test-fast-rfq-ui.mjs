// Real form handlers and ADMIN actions, with isolated hooks/auth/provider doubles.
// No environment files, production database or outbound mail are used.
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { createRequire } from 'node:module'
import { build } from 'esbuild'

const nodeRequire = createRequire(import.meta.url)
const state = { authorized: true, reads: 0, deliveries: [], outboxLoads: 0, revalidations: 0, cacheFailure: false, deliveryStatus: 'sent', deliveryError: false, analyticsError: false, events: [] }
let slots = []
let hookIndex = 0
const jsx = (type, props, key) => ({ type, props: props ?? {}, key })
const react = {
  useId: () => 'fixture-id',
  useState(initial) {
    const index = hookIndex++
    if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial
    return [slots[index], (next) => { slots[index] = typeof next === 'function' ? next(slots[index]) : next }]
  },
  useRef(initial) {
    const index = hookIndex++
    if (!(index in slots)) slots[index] = { current: initial }
    return slots[index]
  },
  useEffect() {},
  useMemo: (work) => work(),
}
const mocks = {
  react: 'const r=require("rfq-test-state").react; export const useId=r.useId,useState=r.useState,useRef=r.useRef,useEffect=r.useEffect,useMemo=r.useMemo;',
  'react/jsx-runtime': 'export const jsx=require("rfq-test-state").jsx,jsxs=jsx,Fragment="fragment";',
  '@radix-ui/react-dialog': 'export const Root="dialog",Trigger="trigger",Portal="portal",Overlay="overlay",Content="content",Title="title",Description="description",Close="close";',
  '@/lib/analytics-events': 'export function pushDataLayerEvent(event){const state=require("rfq-test-state").state;if(state.analyticsError)throw new Error("Broken dataLayer");state.events.push(event)}',
  '@/lib/seo-links': 'export function readRecentAttributionSource(){return "procurement-checklist"}; export function clearRecentAttributionSource(){}',
  './useAnimatedDialog': 'export function useAnimatedDialog(){return {}}',
  './pointerPress': 'export const pointerPressHandlers={}',
  '@/lib/auth-utils': 'export async function requireAdmin(){if(!require("rfq-test-state").state.authorized)throw new Error("TEST_UNAUTHORIZED")}',
  '@/lib/quote-email-history': 'export const DEFAULT_QUOTE_EMAIL_HISTORY_PAGE_SIZE=20; export async function getQuoteEmailHistory(){require("rfq-test-state").state.reads++;return {items:[],pagination:{page:1,limit:20,total:0,totalPages:0}}}',
  '@/lib/quote-email-outbox': 'require("rfq-test-state").state.outboxLoads++; export async function deliverQuoteEmail(id,options){const state=require("rfq-test-state").state;state.deliveries.push({id,options});if(state.deliveryError)throw new Error("SECRET database/provider detail");return {id,status:state.deliveryStatus}}',
  'next/cache': 'export function revalidatePath(){const state=require("rfq-test-state").state;state.revalidations++;if(state.cacheFailure)throw new Error("SECRET cache detail")}',
  'next/navigation': 'export function useRouter(){return {refresh(){}}}',
  'lucide-react': 'export const Eye="eye",RefreshCw="refresh";',
  '@/components/ui/badge': 'export const Badge="badge";',
  '@/components/ui/button': 'export const Button="button";',
  '@/components/ui/card': 'export const Card="card",CardContent="card-content",CardDescription="card-description",CardHeader="card-header",CardTitle="card-title";',
  '@/components/ui/dialog': 'export const Dialog="dialog",DialogContent="dialog-content",DialogDescription="dialog-description",DialogHeader="dialog-header",DialogTitle="dialog-title";',
  '@/components/ui/table': 'export const Table="table",TableBody="tbody",TableCell="td",TableHead="th",TableHeader="thead",TableRow="tr";',
  '@/components/ui/tabs': 'export const Tabs="tabs",TabsContent="tabs-content",TabsList="tabs-list",TabsTrigger="tabs-trigger";',
}
const built = await build({
  stdin: { contents: 'export { QuoteRequestForm } from "./src/modules/home-new/components/QuoteRequestForm";export * from "./src/actions/admin/quote-email-history";export { canRetryQuoteEmailNotification, quoteEmailNotificationLabel } from "./src/components/admin/quote-email-history-table";', resolveDir: process.cwd(), loader: 'ts' },
  bundle: true, write: false, platform: 'node', format: 'cjs', packages: 'external', external: ['rfq-test-state'], jsx: 'automatic',
  plugins: [{ name: 'rfq-isolation', setup(plugin) {
    plugin.onResolve({ filter: /.*/ }, ({ path }) => path in mocks ? { path, namespace: 'mock' } : path.endsWith('.css') ? { path: 'css', namespace: 'mock' } : undefined)
    plugin.onLoad({ filter: /.*/, namespace: 'mock' }, ({ path }) => ({ contents: path === 'css' ? 'export default {}' : mocks[path], loader: 'js', resolveDir: process.cwd() }))
  } }],
})
const fixtureModule = { exports: {} }
new Function('require', 'module', 'exports', built.outputFiles[0].text)((name) => name === 'rfq-test-state' ? { state, react, jsx } : nodeRequire(name), fixtureModule, fixtureModule.exports)
const { QuoteRequestForm, getQuoteEmailHistory, retryQuoteEmailNotification, canRetryQuoteEmailNotification, quoteEmailNotificationLabel } = fixtureModule.exports
globalThis.window = { location: { href: 'https://www.laifappe.com/quote' } }
globalThis.document = { referrer: 'https://www.laifappe.com/blog/procurement-checklist' }
Object.defineProperty(globalThis, 'crypto', { configurable: true, value: { randomUUID } })

function render() { hookIndex = 0; return QuoteRequestForm({ source: 'Quote page' }) }
function find(tree, predicate) {
  if (Array.isArray(tree)) return tree.flatMap((child) => find(child, predicate))
  if (!tree || typeof tree !== 'object') return []
  return [...(predicate(tree) ? [tree] : []), ...find(tree.props?.children, predicate)]
}
function change(name, value) {
  const [input] = find(render(), (node) => node.props.name === name)
  assert.ok(input, `Field ${name} exists`)
  input.props.onChange({ target: { value } })
}
const submit = () => render().props.onSubmit({ preventDefault() {} })
const calls = []
let nextResponse = 'lost'
globalThis.fetch = async (_url, options) => {
  calls.push(JSON.parse(options.body))
  if (nextResponse === 'lost') throw new Error('Simulated lost response after a potential save')
  if (nextResponse === 'invalid-json') return { ok: true, json: async () => { throw new Error('Invalid JSON') } }
  if (nextResponse === 'failure') return { ok: false, json: async () => ({ success: false, reason: 'Please retry.' }) }
  return { ok: true, json: async () => ({ success: true, inquiryId: calls.at(-1).submissionId, notificationStatus: 'pending' }) }
}

await submit()
assert.equal(calls.length, 0, 'Invalid/empty form does not attempt capture')
change('email', 'buyer@example.test')
change('message', 'Please quote 500 pairs of gloves.')
await submit()
assert.match(calls[0].submissionId, /^[0-9a-f-]{36}$/)
await submit()
assert.equal(calls[1].submissionId, calls[0].submissionId, 'Unknown outcome retries the same saved submission')
nextResponse = 'invalid-json'
await submit()
assert.equal(calls[2].submissionId, calls[0].submissionId, 'Malformed response preserves retry identity')
nextResponse = 'failure'
change('message', 'Please quote 1,000 pairs of gloves.')
await submit()
assert.notEqual(calls[3].submissionId, calls[0].submissionId, 'Changed content starts a new submission')
await submit()
assert.equal(calls[4].submissionId, calls[3].submissionId, 'Explicit error still preserves unchanged retry identity')
nextResponse = 'success'
await submit()
assert.equal(calls[5].submissionId, calls[3].submissionId)
assert.equal(state.events.length, 1, 'Persisted acceptance emits the existing successful inquiry event')
assert.equal(state.events[0].event, 'quote_submit')
assert.equal(state.events[0].inquiry_id, calls[5].submissionId)
assert.equal(state.events[0].source, 'procurement-checklist', 'Existing internal attribution is preserved')
assert.ok(find(render(), (node) => node.props.children === 'Your request has been received. Our team will follow up with you.').length)
change('email', 'buyer@example.test')
change('message', 'Please quote 1,000 pairs of gloves.')
await submit()
assert.notEqual(calls[6].submissionId, calls[5].submissionId, 'A new inquiry after success receives a fresh ID')
state.analyticsError = true
change('email', 'buyer@example.test')
change('message', 'Please quote workwear.')
await submit()
assert.ok(find(render(), (node) => node.props.children === 'Your request has been received. Our team will follow up with you.').length, 'Broken analytics must preserve saved acceptance')
assert.equal(find(render(), (node) => typeof node.props.children === 'string' && node.props.children.includes('could not confirm receipt')).length, 0)
state.analyticsError = false

// A second same-frame click must not start a parallel request or duplicate analytics.
change('email', 'buyer@example.test')
change('message', 'Please quote rainwear.')
let release
globalThis.fetch = async (_url, options) => {
  calls.push(JSON.parse(options.body))
  await new Promise((resolve) => { release = resolve })
  return { ok: true, json: async () => ({ success: true }) }
}
const previousCalls = calls.length
const pending = submit()
await submit()
assert.equal(calls.length, previousCalls + 1)
release()
await pending

const inquiryId = randomUUID()
state.authorized = false
await assert.rejects(getQuoteEmailHistory(), /TEST_UNAUTHORIZED/)
await assert.rejects(retryQuoteEmailNotification(inquiryId), /TEST_UNAUTHORIZED/)
assert.equal(state.reads, 0, 'Unauthorized listing cannot read customer records')
assert.equal(state.outboxLoads, 0, 'Authorization precedes loading and accessing the outbox')
assert.equal(state.deliveries.length, 0)
state.authorized = true
assert.equal((await retryQuoteEmailNotification('legacy-id')).success, false)
assert.equal(state.deliveries.length, 0, 'Invalid IDs cannot call provider/outbox')
assert.equal((await retryQuoteEmailNotification(inquiryId)).success, true)
assert.deepEqual(state.deliveries[0], { id: inquiryId, options: { force: true } })
state.cacheFailure = true
assert.equal((await retryQuoteEmailNotification(inquiryId)).success, true, 'Cache failure does not erase a successful durable delivery result')
state.deliveryStatus = 'skipped'
assert.match((await retryQuoteEmailNotification(inquiryId)).reason, /already sent or is being processed/)
state.deliveryStatus = 'failed'
assert.equal((await retryQuoteEmailNotification(inquiryId)).success, false)
state.deliveryStatus = 'pending'
assert.equal((await retryQuoteEmailNotification(inquiryId)).success, false, 'An unsent notification must not report manual retry success')
state.deliveryError = true
assert.doesNotMatch(JSON.stringify(await retryQuoteEmailNotification(inquiryId)), /SECRET/)

const checkedAt = Date.parse('2026-11-12T04:00:00.000Z')
assert.equal(quoteEmailNotificationLabel({ notificationStatus: 'pending' }), 'Notification not sent')
assert.equal(quoteEmailNotificationLabel({ notificationStatus: 'failed' }), 'Notification failed; inquiry saved')
assert.equal(canRetryQuoteEmailNotification({ notificationStatus: 'pending' }, checkedAt), true)
assert.equal(canRetryQuoteEmailNotification({ notificationStatus: 'failed' }, checkedAt), true)
assert.equal(canRetryQuoteEmailNotification({ notificationStatus: 'sent' }, checkedAt), false)
assert.equal(canRetryQuoteEmailNotification({}, checkedAt), false, 'Legacy records have no resend control')
assert.equal(canRetryQuoteEmailNotification({ notificationStatus: 'sending', leaseUntil: '2026-11-12T04:05:00.000Z' }, checkedAt), false, 'An active notification lease cannot be manually interrupted')
assert.equal(canRetryQuoteEmailNotification({ notificationStatus: 'sending', leaseUntil: '2026-11-12T03:55:00.000Z' }, checkedAt), true, 'An expired notification lease permits explicit ADMIN retry')
assert.equal(canRetryQuoteEmailNotification({ notificationStatus: 'sending', leaseUntil: 'invalid' }, checkedAt), false)
process.stdout.write('Fast RFQ UI/action checks passed: replay identity, saved acceptance, duplicate-click protection, ADMIN authorization, safe manual retries and expired-lease controls.\n')
