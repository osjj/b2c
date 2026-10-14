import assert from 'node:assert/strict'
import test from 'node:test'

import { simpleParser } from 'mailparser'

import { MailboxError } from './errors'
import {
  classifyProviderResponse, getReplyAttemptStatus, parseReplyForm, prepareReply, readReplyForm, sendMailboxReply,
  type PreparedReply, type ReplyAttempt, type ReplyConfig, type ReplyInput, type ReplyParent, type ReplyRepository,
} from './reply'
import type { MailboxMessage } from './types'

const now = new Date('2026-10-14T08:00:00.000Z')
const config: ReplyConfig = {
  account: 'account@qq.com', defaultSender: 'sales@enterprise.test', aliases: ['sales@enterprise.test'],
  ownAddresses: ['sales@enterprise.test', 'account@qq.com'], apiKey: 'test-secret-never-sent',
}
const parent: ReplyParent = {
  id: 'parent-1', threadKey: 'thread-1', direction: 'INBOUND', messageId: '<parent@customer.test>',
  from: { address: 'customer@customer.test', name: 'Customer' }, replyTo: [],
  to: [{ address: 'sales@enterprise.test' }], cc: [{ address: 'copy@customer.test' }],
  subject: 'Original request', textBody: 'Please confirm.\nOriginal history.', sentAt: '2026-10-13T08:00:00.000Z', attachments: [],
  references: ['<root@customer.test>'], inReplyTo: ['<root@customer.test>'],
}
function input(overrides: Partial<ReplyInput> = {}): ReplyInput {
  return {
    parentId: parent.id, requestKey: '563512f6-8a7b-425e-a077-8d14e64e8071', mode: 'replyAll',
    to: 'customer@customer.test', cc: 'copy@customer.test', text: 'Confirmed.', includeQuote: true, attachments: [], ...overrides,
  }
}

class MemoryRepository implements ReplyRepository {
  attempts = new Map<string, ReplyAttempt>()
  prepared = new Map<string, PreparedReply>()
  messages = new Map<string, MailboxMessage>()
  finishError: Error | null = null
  failMark = false
  currentParent: ReplyParent | null = parent
  async getParent(account: string, id: string) { return account === config.account && id === this.currentParent?.id ? this.currentParent : null }
  async getAttempt(requestKey: string) { return this.attempts.get(requestKey) || null }
  async reserve(prepared: PreparedReply) {
    const existing = this.attempts.get(prepared.requestKey)
    if (existing) return { created: false, attempt: existing }
    const attempt: ReplyAttempt = {
      requestKey: prepared.requestKey, account: prepared.account, parentId: prepared.parentId,
      payloadHash: prepared.payloadHash, status: 'SENDING', outboundMessageId: null, providerRequestId: null, createdAt: now,
    }
    this.attempts.set(prepared.requestKey, attempt)
    this.prepared.set(prepared.requestKey, prepared)
    return { created: true, attempt }
  }
  async getSentMessage(account: string, id: string) { return account === config.account ? this.messages.get(id) || null : null }
  async finish(prepared: PreparedReply, requestId?: string) {
    if (this.finishError) throw this.finishError
    const attempt = this.attempts.get(prepared.requestKey)
    assert.ok(attempt)
    this.messages.set(prepared.message.id, prepared.message)
    Object.assign(attempt, { status: 'SENT', outboundMessageId: prepared.message.id, providerRequestId: requestId || null })
    return prepared.message
  }
  async markOutcome(requestKey: string, status: 'FAILED' | 'UNKNOWN', _code: string, requestId?: string) {
    if (this.failMark) throw new Error('private database write error')
    const attempt = this.attempts.get(requestKey)
    assert.ok(attempt)
    Object.assign(attempt, { status, providerRequestId: requestId || null })
  }
}

function successfulFetch(inspect?: (init: RequestInit) => void): typeof fetch {
  return async (_url, init) => {
    assert.ok(init)
    inspect?.(init)
    return Response.json({ request_id: 'provider-request', data: { succeeded: 1, failed: 0, failures: [] } })
  }
}
function hasCode(code: string) { return (error: unknown) => error instanceof MailboxError && error.code === code }

test('MIME roundtrip preserves enterprise sender, original thread headers, visible Cc, quoted text and private attachment bytes', async () => {
  const buffer = Buffer.from('private attachment bytes')
  const prepared = await prepareReply(input({ attachments: [{ filename: 'quote.pdf', contentType: 'application/pdf', buffer }] }), parent, config, now)
  const parsed = await simpleParser(prepared.rawMime)
  assert.equal(parsed.from?.value[0]?.address, config.defaultSender)
  assert.equal(parsed.messageId, prepared.message.messageId)
  assert.equal(parsed.inReplyTo, parent.messageId)
  assert.deepEqual(parsed.references, ['<root@customer.test>', '<parent@customer.test>'])
  assert.equal(parsed.subject, 'Re: Original request')
  assert.match(parsed.text || '', /Confirmed\.[\s\S]*> Please confirm\./)
  assert.equal(Array.isArray(parsed.cc) ? parsed.cc[0].value[0].address : parsed.cc?.value[0].address, 'copy@customer.test')
  assert.equal(parsed.attachments.length, 1)
  assert.deepEqual(parsed.attachments[0].content, buffer)
  assert.equal(prepared.message.threadKey, parent.threadKey)
})

test('form validates attachment count, byte limits, text and recipient payload types', async () => {
  const form = new FormData()
  Object.entries(input()).filter(([key]) => key !== 'attachments').forEach(([key, value]) => form.set(key, String(value)))
  form.append('attachments', new Blob(['abc'], { type: 'text/plain' }), '../file\r\n.txt')
  const parsed = await parseReplyForm(form)
  assert.equal(parsed.attachments[0].filename, '.._file__.txt')
  form.append('attachments', 'not a file')
  await assert.rejects(parseReplyForm(form), hasCode('INVALID_ATTACHMENTS'))
  form.delete('attachments')
  form.set('parentId', 'made-up\r\nheader')
  await assert.rejects(parseReplyForm(form), hasCode('INVALID_REPLY'))
  form.set('parentId', 'parent-1')
  for (let i = 0; i < 6; i++) form.append('attachments', new Blob(['abc']), `a${i}.pdf`)
  await assert.rejects(parseReplyForm(form), hasCode('INVALID_ATTACHMENTS'))
  form.delete('attachments')
  form.append('attachments', new Blob([new Uint8Array(25 * 1024 * 1024 + 1)]), 'too-large.pdf')
  await assert.rejects(parseReplyForm(form), hasCode('ATTACHMENTS_TOO_LARGE'))
})

test('multipart stream is bounded even when Content-Length is omitted', async () => {
  const request = new Request('http://local/reply', { method: 'POST', body: new Uint8Array(27 * 1024 * 1024), headers: { 'Content-Type': 'multipart/form-data; boundary=test' } })
  await assert.rejects(readReplyForm(request), hasCode('REPLY_TOO_LARGE'))
})

test('provider classifier requires clean MIME acceptance, treats mixed counts and malformed results as unknown', () => {
  assert.equal(classifyProviderResponse(200, { data: { succeeded: 1, failed: 0, failures: [] } }).state, 'accepted')
  assert.equal(classifyProviderResponse(200, { data: { succeeded: 1, failed: 0 } }).state, 'accepted')
  assert.equal(classifyProviderResponse(200, { data: { succeeded: 0, failed: 1, failures: ['private provider error'] } }).state, 'rejected')
  assert.equal(classifyProviderResponse(400, { data: { error: 'secret', error_code: 'E_API' } }).state, 'rejected')
  for (const response of [null, {}, { data: { succeeded: 1, failed: 1, failures: [] } }, { data: { succeeded: 1, failed: 0, failures: ['failed cc'] } }, { data: { succeeded: 2, failed: 0, failures: [] } }, { data: { succeeded: 1 } }]) {
    assert.equal(classifyProviderResponse(200, response).state, 'unknown')
  }
  assert.equal(classifyProviderResponse(500, { data: { error: 'secret' } }).state, 'unknown')
})

test('accepted reply stores outbound and a replay cannot call the provider twice', async () => {
  const repository = new MemoryRepository()
  let calls = 0
  const fetcher = successfulFetch(init => {
    calls++
    assert.equal(repository.attempts.size, 1, 'attempt must exist before external call')
    assert.equal(repository.prepared.size, 1, 'exact MIME must be durable before external call')
    const body = JSON.parse(String(init.body)) as { mime_email: string; fastaccept: boolean }
    assert.equal(body.fastaccept, false)
    assert.match(Buffer.from(body.mime_email, 'base64').toString(), /In-Reply-To: <parent@customer.test>/)
  })
  const result = await sendMailboxReply(input(), config, { repository, fetch: fetcher, now: () => now })
  const replay = await sendMailboxReply(input(), config, { repository, fetch: fetcher, now: () => now })
  assert.equal(result.message.id, replay.message.id)
  assert.equal(calls, 1)
  assert.equal((await getReplyAttemptStatus(input().requestKey, config.account || '', repository, now)).status, 'SENT')
  await assert.rejects(sendMailboxReply(input({ text: 'Different payload' }), config, { repository, fetch: fetcher }), hasCode('REQUEST_KEY_CONFLICT'))
  assert.equal(calls, 1)
})

test('concurrent duplicate requests reserve once and report in-progress without duplicate send', async () => {
  const repository = new MemoryRepository()
  let release: (() => void) | undefined
  const hold = new Promise<void>(resolve => { release = resolve })
  let entered: (() => void) | undefined
  const started = new Promise<void>(resolve => { entered = resolve })
  let calls = 0
  const fetcher: typeof fetch = async () => { calls++; entered?.(); await hold; return Response.json({ data: { succeeded: 1, failed: 0, failures: [] } }) }
  const first = sendMailboxReply(input(), config, { repository, fetch: fetcher, now: () => now })
  await started
  await assert.rejects(sendMailboxReply(input(), config, { repository, fetch: fetcher, now: () => now }), hasCode('SEND_IN_PROGRESS'))
  release?.()
  await first
  assert.equal(calls, 1)
})

test('provider rejection is persisted without leaking provider detail and replay stays rejected', async () => {
  const repository = new MemoryRepository()
  let calls = 0
  const fetcher: typeof fetch = async () => { calls++; return Response.json({ data: { succeeded: 0, failed: 1, failures: ['sensitive account detail'] } }) }
  await assert.rejects(sendMailboxReply(input(), config, { repository, fetch: fetcher }), hasCode('PROVIDER_REJECTED'))
  assert.equal(repository.attempts.get(input().requestKey)?.status, 'FAILED')
  await assert.rejects(sendMailboxReply(input(), config, { repository, fetch: fetcher }), hasCode('SEND_ALREADY_FAILED'))
  assert.equal(calls, 1)
})

test('timeout, malformed JSON and partial acceptance are unknown and cannot be blindly retried', async () => {
  const providers: (typeof fetch)[] = [
    async () => { throw new DOMException('sensitive timeout detail', 'AbortError') },
    async () => new Response('not json', { status: 200 }),
    async () => Response.json({ data: { succeeded: 1, failed: 1, failures: ['private rejection'] } }),
  ]
  for (const fetcher of providers) {
    const repository = new MemoryRepository()
    let calls = 0
    const counted: typeof fetch = (...args) => { calls++; return fetcher(...args) }
    await assert.rejects(sendMailboxReply(input(), config, { repository, fetch: counted }), hasCode('DELIVERY_UNKNOWN'))
    assert.equal(repository.attempts.get(input().requestKey)?.status, 'UNKNOWN')
    assert.ok(repository.prepared.get(input().requestKey)?.rawMime.length)
    await assert.rejects(sendMailboxReply(input(), config, { repository, fetch: counted }), hasCode('DELIVERY_UNKNOWN'))
    assert.equal(calls, 1)
  }
})

test('accepted send followed by a simulated Prisma transaction timeout retains MIME and cannot resend', async () => {
  const repository = new MemoryRepository()
  repository.finishError = Object.assign(new Error('Transaction already closed after remote database delay'), { code: 'P2028' })
  let calls = 0
  const fetcher = successfulFetch(() => { calls++ })
  await assert.rejects(sendMailboxReply(input(), config, { repository, fetch: fetcher }), hasCode('DELIVERY_UNKNOWN'))
  assert.equal(repository.attempts.get(input().requestKey)?.status, 'UNKNOWN')
  assert.equal(repository.messages.size, 0)
  assert.ok(repository.prepared.get(input().requestKey)?.rawMime.length)
  repository.finishError = null
  await assert.rejects(sendMailboxReply(input(), config, { repository, fetch: fetcher }), hasCode('DELIVERY_UNKNOWN'))
  assert.equal(calls, 1, 'database recovery must not resend an already accepted reply')
  assert.equal((await getReplyAttemptStatus(input().requestKey, config.account || '', repository)).status, 'UNKNOWN')
})

test('a DB outage after attempted send leaves a reserved non-retryable attempt', async () => {
  const repository = new MemoryRepository()
  repository.failMark = true
  let calls = 0
  const fetcher: typeof fetch = async () => { calls++; throw new Error('network problem') }
  await assert.rejects(sendMailboxReply(input(), config, { repository, fetch: fetcher, now: () => now }), hasCode('DELIVERY_UNKNOWN'))
  assert.equal(repository.attempts.get(input().requestKey)?.status, 'SENDING')
  await assert.rejects(sendMailboxReply(input(), config, { repository, fetch: fetcher, now: () => new Date(now.getTime() + 100000) }), hasCode('DELIVERY_UNKNOWN'))
  assert.equal(calls, 1)
  assert.equal((await getReplyAttemptStatus(input().requestKey, config.account || '', repository, new Date(now.getTime() + 100000))).status, 'UNKNOWN')
  await assert.rejects(getReplyAttemptStatus(input().requestKey, 'different@qq.com', repository), hasCode('ATTEMPT_NOT_FOUND'))
})

test('missing parent and missing original Message-ID fail before creating an attempt or sending', async () => {
  const repository = new MemoryRepository()
  let calls = 0
  const fetcher = successfulFetch(() => { calls++ })
  await assert.rejects(sendMailboxReply(input({ parentId: 'fabricated' }), config, { repository, fetch: fetcher }), hasCode('PARENT_NOT_FOUND'))
  repository.currentParent = { ...parent, messageId: null }
  await assert.rejects(sendMailboxReply(input(), config, { repository, fetch: fetcher }), hasCode('PARENT_MESSAGE_ID_MISSING'))
  assert.equal(calls, 0)
  assert.equal(repository.attempts.size, 0)
})
