// Exercise real route control flow with isolated storage/provider/Next boundaries.
// No .env, production database or real email access.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { build } from 'esbuild'

const require = createRequire(import.meta.url)
const control = { calls: [], callbacks: [], records: new Map(), saveFailure: false, afterFailure: false }
class QuoteEmailConflictError extends Error {}
const outbox = {
  QuoteEmailConflictError,
  async enqueueQuoteEmail(entry, submissionId = '11111111-1111-4111-8111-111111111111') {
    control.calls.push('save')
    if (control.saveFailure) throw new Error('PRIVATE database diagnostic')
    const existing = control.records.get(submissionId)
    if (existing && existing.submissionFingerprint !== entry.submissionFingerprint) throw new QuoteEmailConflictError('Conflict')
    const record = existing || { ...entry, id: submissionId, notificationStatus: 'pending' }
    control.records.set(submissionId, record)
    return record
  },
  async deliverQuoteEmail(id) {
    control.calls.push('deliver')
    const record = control.records.get(id)
    assert.ok(record, 'No notification before durable capture')
    record.notificationStatus = 'sent'
    return { id, status: 'sent' }
  },
}
const mocks = {
  'next/server': `export class NextRequest extends Request {}; export const NextResponse={json:(value,init)=>new Response(JSON.stringify(value),{...init,headers:{'content-type':'application/json',...init?.headers}})}; export function after(callback){const c=require('rfq-state').control;if(c.afterFailure)throw Error('PRIVATE scheduler detail');c.callbacks.push(callback)}`,
  'next/cache': `export function revalidatePath(){}`,
  '@/lib/quote-email-outbox': `const o=require('rfq-state').outbox;export const enqueueQuoteEmail=o.enqueueQuoteEmail;export const deliverQuoteEmail=o.deliverQuoteEmail;export const QuoteEmailConflictError=o.QuoteEmailConflictError`,
  '@/lib/quote-email-history': `export async function appendQuoteEmailHistory(){require('rfq-state').control.calls.push('legacy-save')}`,
}
const built = await build({
  entryPoints: ['src/app/api/quote-email/route.ts'], bundle: true, write: false,
  platform: 'node', format: 'cjs', packages: 'external',
  define: { 'process.env': JSON.stringify({ SMTP2GO_API_KEY: 'test-only-key' }) },
  plugins: [{ name: 'rfq-route-isolation', setup(plugin) {
    plugin.onResolve({ filter: /.*/ }, ({ path }) => path in mocks ? { path, namespace: 'mock' } : path === 'rfq-state' ? { path, external: true } : undefined)
    plugin.onLoad({ filter: /.*/, namespace: 'mock' }, ({ path }) => ({ contents: mocks[path], loader: 'js' }))
  } }],
})
const routeModule = { exports: {} }
new Function('require', 'module', 'exports', 'fetch', built.outputFiles[0].text)(
  name => name === 'rfq-state' ? { control, outbox } : require(name),
  routeModule, routeModule.exports,
  async () => { control.calls.push('provider'); return Response.json({ data: { succeeded: 1, failed: 0 }, request_id: 'provider-test' }) },
)
const input = { email: 'buyer@example.test', message: 'Quote 500 pairs of gloves.', submissionId: '22222222-2222-4222-8222-222222222222' }
function reset() { control.calls = []; control.callbacks = []; control.records = new Map(); control.saveFailure = false; control.afterFailure = false }
async function post(body, referrer = 'https://example.test/quote') {
  return routeModule.exports.POST(new Request('https://example.test/api/quote-email', {
    method: 'POST', headers: { 'content-type': 'application/json', referer: referrer }, body: typeof body === 'string' ? body : JSON.stringify(body),
  }))
}

reset()
control.saveFailure = true
let response = await post(input)
assert.equal(response.status, 503, 'Capture failure must fail before any email is sent')
assert.equal((await response.json()).success, false)
assert.deepEqual(control.calls, ['save'])
assert.equal(control.callbacks.length, 0)

for (const body of ['{broken', { ...input, email: 'invalid' }, { ...input, message: '' }, { ...input, submissionId: 'not-a-uuid' }]) {
  reset()
  response = await post(body)
  assert.equal(response.status, 400)
  assert.equal((await response.json()).success, false)
  assert.deepEqual(control.calls, [])
}

reset()
response = await post(input)
let data = await response.json()
assert.equal(response.status, 200)
assert.equal(data.success, true)
assert.equal(data.inquiryId, input.submissionId)
assert.equal(response.headers.get('cache-control'), 'no-store')
assert.deepEqual(control.calls, ['save'], 'Mail must wait until after durable acceptance')
assert.equal(control.callbacks.length, 1)
await control.callbacks[0]()
assert.deepEqual(control.calls, ['save', 'deliver'])

// A response lost to the browser can replay even if the Referer or mail config changes.
response = await post(input, 'https://example.test/a-different-fallback')
data = await response.json()
assert.equal(response.status, 200)
assert.equal(data.inquiryId, input.submissionId)
assert.equal(control.records.size, 1)

response = await post({ ...input, phoneCode: '', phone: '', name: '', companyName: '', source: '', entryPage: '', referrer: '' })
assert.equal(response.status, 200, 'Omitted optional fields and normalized empty values represent the same customer input')
assert.equal(control.records.size, 1)

for (const field of ['source', 'entryPage', 'referrer']) {
  response = await post({ ...input, [field]: 'changed-explicit-context' })
  assert.equal(response.status, 409, 'Nonempty explicit context changes must remain bound to the original inquiry')
}

response = await post({ ...input, message: 'Changed demand' })
assert.equal(response.status, 409)
assert.equal((await response.json()).success, false)
assert.equal(control.records.size, 1)

reset()
control.afterFailure = true
response = await post(input)
assert.equal(response.status, 200, 'Failed best-effort scheduling must not undo a saved inquiry')
assert.equal((await response.json()).success, true)
assert.equal(control.records.size, 1)

reset()
const { submissionId: omitted, ...legacyInput } = input
void omitted
response = await post(legacyInput)
assert.equal(response.status, 200, 'Existing callers without submissionId remain supported')
assert.equal((await response.json()).success, true)

process.stdout.write('Fast RFQ route: capture, validation, replay, conflict and deferred delivery checks passed.\n')
