// Real RFQ persistence/delivery services with isolated DB and HTTP boundaries.
// This script does not load .env, connect Prisma, or send actual email.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { isDeepStrictEqual } from 'node:util'
import { build } from 'esbuild'

const require = createRequire(import.meta.url)
const rows = new Map()
const control = { fetches: [], failCreate: false, failCheckpoint: false, payload: null, httpStatus: 200, fetchError: null, fetchHook: null }
const baseTime = Date.parse('2026-11-12T01:00:00.000Z')
let currentTime = baseTime
let cases = 0
const originalNow = Date.now
const originalFetch = globalThis.fetch
const originalKey = process.env.SMTP2GO_API_KEY
Date.now = () => currentTime

function matches(row, where = {}) {
  if (where.AND && !where.AND.every(part => matches(row, part))) return false
  if (where.OR && !where.OR.some(part => matches(row, part))) return false
  if (typeof where.key === 'string' && row.key !== where.key) return false
  if (typeof where.key === 'object' && where.key.startsWith && !row.key.startsWith(where.key.startsWith)) return false
  if (where.value) {
    const filter = where.value
    const value = filter.path ? filter.path.reduce((obj, key) => obj?.[key], row.value) : row.value
    if ('equals' in filter && !isDeepStrictEqual(value, filter.equals)) return false
    if ('lte' in filter && !(value !== null && value <= filter.lte)) return false
  }
  return true
}
const db = { setting: {
  create: async ({ data }) => {
    if (control.failCreate) throw new Error('PRIVATE_DATABASE_ERROR')
    if (rows.has(data.key)) throw Object.assign(new Error('Unique key'), { code: 'P2002' })
    const row = structuredClone({ ...data, createdAt: data.createdAt ?? new Date(Date.now()), updatedAt: new Date(Date.now()) })
    rows.set(data.key, row)
    return structuredClone(row)
  },
  findUnique: async ({ where }) => structuredClone(rows.get(where.key) ?? null),
  updateMany: async ({ where, data }) => {
    if (control.failCheckpoint && data.value.notificationStatus === 'sent') throw new Error('PRIVATE_CHECKPOINT_ERROR')
    const row = [...rows.values()].find(item => matches(item, where))
    if (!row) return { count: 0 }
    Object.assign(row, structuredClone(data), { updatedAt: new Date(Date.now()) })
    return { count: 1 }
  },
  count: async ({ where }) => [...rows.values()].filter(row => matches(row, where)).length,
  findMany: async ({ where, skip = 0, take }) => {
    let selected = [...rows.values()].filter(row => matches(row, where))
    selected.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || b.key.localeCompare(a.key))
    return structuredClone(selected.slice(skip, take === undefined ? undefined : skip + take))
  },
} }

globalThis.fetch = async (_url, options) => {
  assert.ok([...rows.values()].some(row => row.value.notificationStatus === 'sending'), 'Persist and acquire a lease before external mail')
  control.fetches.push(JSON.parse(options.body))
  if (control.fetchHook) await control.fetchHook(JSON.parse(options.body))
  if (control.fetchError) throw control.fetchError
  return { ok: control.httpStatus >= 200 && control.httpStatus < 300, json: async () => structuredClone(control.payload) }
}

const built = await build({
  stdin: { contents: 'export * from "./src/lib/quote-email-outbox"; export {getQuoteEmailHistory} from "./src/lib/quote-email-history"', resolveDir: process.cwd(), loader: 'ts' },
  bundle: true, write: false, platform: 'node', format: 'cjs', packages: 'external',
  plugins: [{ name: 'rfq-isolation', setup(plugin) {
    plugin.onResolve({ filter: /^rfq-state$/ }, () => ({ path: 'rfq-state', external: true }))
    plugin.onResolve({ filter: /^@\/lib\/prisma$/ }, () => ({ path: 'prisma', namespace: 'mock' }))
    plugin.onResolve({ filter: /^next\/cache$/ }, () => ({ path: 'cache', namespace: 'mock' }))
    plugin.onLoad({ filter: /.*/, namespace: 'mock' }, ({ path }) => ({ contents: path === 'prisma' ? 'export const prisma = require("rfq-state").db' : 'export function revalidatePath(){}', loader: 'js' }))
  } }],
})
const serviceModule = { exports: {} }
new Function('require', 'module', 'exports', built.outputFiles[0].text)(name => name === 'rfq-state' ? { db } : require(name), serviceModule, serviceModule.exports)
const { enqueueQuoteEmail, deliverQuoteEmail, QuoteEmailConflictError, getQuoteEmailHistory } = serviceModule.exports
const input = {
  sender: 'sales@example.test', recipient: 'sales@example.test', subject: 'New quote request',
  customerEmail: 'buyer@example.test', phone: '', name: '', companyName: '', source: 'Quote page',
  entryPage: 'https://example.test/quote', referrer: '', message: '500 work gloves',
  textBody: '500 work gloves', htmlBody: '<p>500 work gloves</p>',
  submissionFingerprint: 'a'.repeat(64),
}
function reset() {
  rows.clear()
  currentTime = baseTime
  Object.assign(control, { fetches: [], failCreate: false, failCheckpoint: false, payload: { request_id: 'provider-request', data: { succeeded: 1, failed: 0, email_id: 'email-1' } }, httpStatus: 200, fetchError: null, fetchHook: null })
  process.env.SMTP2GO_API_KEY = 'isolated-test-key'
}
async function check(name, run) {
  reset()
  await run()
  cases++
  process.stdout.write(`PASS ${name}\n`)
}

try {
  await check('storage failure never calls provider', async () => {
    control.failCreate = true
    await assert.rejects(enqueueQuoteEmail(input))
    assert.equal(control.fetches.length, 0)
    assert.equal(rows.size, 0)
  })
  await check('durable capture precedes accepted notification', async () => {
    const saved = await enqueueQuoteEmail(input)
    assert.equal(saved.notificationStatus, 'pending')
    assert.equal(control.fetches.length, 0)
    const result = await deliverQuoteEmail(saved.id)
    assert.equal(result.status, 'sent')
    assert.equal(rows.get(`quote_email_request.${saved.id}`).value.notificationStatus, 'sent')
    assert.ok(control.fetches[0].subject.includes(saved.id))
    assert.ok(control.fetches[0].text_body.includes(saved.id))
    assert.ok(control.fetches[0].html_body.includes(saved.id))
  })
  await check('same ID replays saved record despite transport/header changes', async () => {
    const id = '11111111-1111-4111-8111-111111111111'
    const saved = await enqueueQuoteEmail(input, id)
    const replay = await enqueueQuoteEmail({ ...input, recipient: 'changed@example.test', entryPage: 'https://fallback.example.test/' }, id)
    assert.equal(replay.id, saved.id)
    assert.equal(rows.size, 1)
    await deliverQuoteEmail(id)
    await deliverQuoteEmail(id)
    assert.equal(control.fetches.length, 1)
  })
  await check('changed input for same ID conflicts and preserves original', async () => {
    const id = '22222222-2222-4222-8222-222222222222'
    await enqueueQuoteEmail(input, id)
    await assert.rejects(enqueueQuoteEmail({ ...input, message: 'Changed', submissionFingerprint: 'b'.repeat(64) }, id), QuoteEmailConflictError)
    assert.equal(rows.get(`quote_email_request.${id}`).value.message, input.message)
    assert.equal(control.fetches.length, 0)
  })
  await check('missing mail configuration retains failed notification for manual attention', async () => {
    const saved = await enqueueQuoteEmail(input)
    delete process.env.SMTP2GO_API_KEY
    assert.equal((await deliverQuoteEmail(saved.id)).status, 'failed')
    const row = rows.get(`quote_email_request.${saved.id}`).value
    assert.equal(row.attempts, 1)
    assert.equal(row.nextAttemptAt, null)
    assert.equal(control.fetches.length, 0)
    assert.equal(row.lastError, 'MAIL_CONFIGURATION_MISSING')
  })
  await check('HTTP and nested provider errors and false success never mark sent', async () => {
    const invalid = [null, {}, { data: {} }, { data: { succeeded: 0, failed: 1 } }, { data: { succeeded: 1, failed: 0, error: 'PRIVATE_PROVIDER_DETAIL' } }, { error: 'PRIVATE_PROVIDER_DETAIL', data: { succeeded: 1, failed: 0 } }]
    for (const payload of invalid) {
      control.payload = payload
      const saved = await enqueueQuoteEmail(input)
      assert.equal((await deliverQuoteEmail(saved.id)).status, 'failed')
      const row = rows.get(`quote_email_request.${saved.id}`).value
      assert.equal(row.notificationStatus, 'failed')
      assert.equal(JSON.stringify(row).includes('PRIVATE_PROVIDER_DETAIL'), false)
    }
    control.httpStatus = 503
    const saved = await enqueueQuoteEmail(input)
    assert.equal((await deliverQuoteEmail(saved.id)).status, 'failed')
  })
  await check('concurrent workers normally send one notification', async () => {
    const saved = await enqueueQuoteEmail(input)
    const results = await Promise.all([deliverQuoteEmail(saved.id), deliverQuoteEmail(saved.id)])
    assert.equal(control.fetches.length, 1)
    assert.deepEqual(results.map(item => item.status).sort(), ['sent', 'skipped'])
  })
  await check('failed notification never retries automatically but ADMIN can retry the same saved inquiry', async () => {
    control.payload = { data: { succeeded: 0, failed: 1 } }
    const saved = await enqueueQuoteEmail(input)
    assert.equal((await deliverQuoteEmail(saved.id)).status, 'failed')
    assert.equal(control.fetches.length, 1)
    currentTime += 24 * 60 * 60_000
    assert.equal((await deliverQuoteEmail(saved.id)).status, 'skipped')
    assert.equal(control.fetches.length, 1, 'Elapsed time and POST replay must not trigger an automatic retry')
    assert.equal(rows.get(`quote_email_request.${saved.id}`).value.nextAttemptAt, null)
    control.payload = { data: { succeeded: 1, failed: 0 } }
    assert.equal((await deliverQuoteEmail(saved.id, { force: true })).status, 'sent')
    assert.equal(rows.get(`quote_email_request.${saved.id}`).value.attempts, 2)
    assert.equal(control.fetches.length, 2)
    assert.equal(rows.size, 1)
  })
  await check('checkpoint failure retains lease and only ADMIN can recover after expiry', async () => {
    const saved = await enqueueQuoteEmail(input)
    control.failCheckpoint = true
    await assert.rejects(deliverQuoteEmail(saved.id))
    assert.equal(rows.get(`quote_email_request.${saved.id}`).value.notificationStatus, 'sending')
    assert.equal((await deliverQuoteEmail(saved.id, { force: true })).status, 'skipped')
    currentTime += 300_001
    control.failCheckpoint = false
    assert.equal((await deliverQuoteEmail(saved.id)).status, 'skipped')
    assert.equal(control.fetches.length, 1)
    assert.equal((await deliverQuoteEmail(saved.id, { force: true })).status, 'sent')
    assert.equal(control.fetches.length, 2)
  })
  await check('malformed stored records fail visibly without mail or erasing content', async () => {
    const saved = await enqueueQuoteEmail(input)
    rows.get(`quote_email_request.${saved.id}`).value.message = 42
    await assert.rejects(deliverQuoteEmail(saved.id), /saved inquiry/)
    await assert.rejects(getQuoteEmailHistory(), /saved inquiry/)
    assert.equal(rows.get(`quote_email_request.${saved.id}`).value.message, 42)
    assert.equal(control.fetches.length, 0)
  })
  await check('saved inquiry and legacy history pagination stays intact without a background worker', async () => {
    for (let index = 0; index < 25; index++) { currentTime++; await enqueueQuoteEmail({ ...input, submissionFingerprint: undefined }) }
    assert.equal(control.fetches.length, 0)
    const legacy = { ...input, id: 'legacy-id', createdAt: new Date(baseTime - 1).toISOString() }
    rows.set('quote_email_history', { key: 'quote_email_history', value: [legacy], createdAt: new Date(baseTime - 1) })
    const first = await getQuoteEmailHistory({ page: 1, limit: 20 })
    const second = await getQuoteEmailHistory({ page: 2, limit: 20 })
    assert.equal(first.pagination.total, 26)
    assert.equal(first.items.length, 20)
    assert.equal(second.items.length, 6)
    assert.equal(second.items.at(-1).id, 'legacy-id')
    assert.equal(second.items.at(-1).notificationStatus, 'sent')
    assert.equal(new Set([...first.items, ...second.items].map(item => item.id)).size, 26)
  })
  process.stdout.write(`Verified ${cases} RFQ outbox scenarios with isolated I/O.\n`)
} finally {
  Date.now = originalNow
  globalThis.fetch = originalFetch
  if (originalKey === undefined) delete process.env.SMTP2GO_API_KEY
  else process.env.SMTP2GO_API_KEY = originalKey
}
