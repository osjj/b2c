import assert from 'node:assert/strict'
import test from 'node:test'

import { simpleParser } from 'mailparser'
import MailComposer from 'nodemailer/lib/mail-composer'
import { readMailboxAttachment } from './attachments'

import { MailboxError, safeMailboxError } from './errors'
import type { ProviderFailureDiagnostics } from './provider-diagnostics'
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
      payloadHash: prepared.payloadHash, status: 'SENDING', outboundMessageId: null, providerRequestId: null, safeErrorCode: null, createdAt: now,
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
  async markOutcome(requestKey: string, status: 'FAILED' | 'UNKNOWN', code: string, requestId?: string, diagnostics?: ProviderFailureDiagnostics) {
    if (this.failMark) throw new Error('private database write error')
    const attempt = this.attempts.get(requestKey)
    assert.ok(attempt)
    Object.assign(attempt, { status, safeErrorCode: code, providerRequestId: requestId || null, diagnostics })
  }
}

function successfulFetch(inspect?: (init: RequestInit, url: string) => void): typeof fetch {
  return async (url, init) => {
    assert.ok(init)
    inspect?.(init, String(url))
    return Response.json({ request_id: 'provider-request', data: { succeeded: 1, failed: 0, failures: [] } })
  }
}
function hasCode(code: string) { return (error: unknown) => error instanceof MailboxError && error.code === code }

test('original HTML styles and referenced CID bytes survive reply send, archive and private attachment indexing', async () => {
  const image = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZlFQAAAAASUVORK5CYII=', 'base64')
  const rawMime = await new MailComposer({
    from: 'customer@customer.test', to: config.defaultSender, subject: parent.subject,
    html: '<html><head><style>.note{color:#006633;background-color:#ffeeaa}</style></head><body><table><tr><td class="note">Original styled content<img src="cid:original-image"></td></tr></table></body></html>',
    attachments: [
      { filename: 'old-logo.png', contentType: 'image/png', content: image, cid: 'original-image' },
      { filename: 'original-private.pdf', content: Buffer.from('Do not attach this original file') },
    ],
  }).compile().build()
  const repository = new MemoryRepository()
  repository.currentParent = { ...parent, rawMime }
  const newFile = Buffer.from('newly supplied document')
  const replyInput = input({ attachments: [{ filename: 'new-document.txt', contentType: 'text/plain', buffer: newFile }] })
  const fetcher = successfulFetch(init => {
    const payload = JSON.parse(String(init.body)) as { html_body: string; inlines: { filename: string; mimetype: string; fileblob: string }[]; attachments: { filename: string }[] }
    assert.match(payload.html_body, /color:\s*#006633/)
    assert.match(payload.html_body, /<table/)
    assert.equal(payload.inlines.length, 1)
    assert.ok(payload.html_body.includes(`src="cid:${payload.inlines[0].filename}"`))
    assert.equal(payload.inlines[0].mimetype, 'image/png')
    assert.deepEqual(Buffer.from(payload.inlines[0].fileblob, 'base64'), image)
    assert.deepEqual(payload.attachments.map(file => file.filename), ['new-document.txt'])
  })
  const sent = await sendMailboxReply(replyInput, config, { repository, fetch: fetcher, now: () => now })
  const prepared = repository.prepared.get(replyInput.requestKey)
  assert.ok(prepared)
  const archived = await simpleParser(prepared.rawMime, { skipImageLinks: true })
  assert.equal(archived.html, prepared.htmlBody)
  assert.equal(archived.inReplyTo, parent.messageId)
  assert.equal(archived.attachments.length, 2)
  for (const metadata of sent.message.attachments) {
    const downloaded = await readMailboxAttachment(config.account || '', sent.message.id, String(metadata.index), { getRawMime: async () => prepared.rawMime })
    assert.equal(downloaded.filename, metadata.filename)
    assert.deepEqual(Buffer.from(downloaded.content), metadata.filename === 'new-document.txt' ? newFile : image)
  }
  const noQuote = await prepareReply(input({ includeQuote: false }), { ...parent, rawMime }, config, now)
  assert.equal(noQuote.inlineImages.length, 0)
  assert.ok(!noQuote.htmlBody.includes('Original styled content'))
})

test('local MIME archive preserves enterprise sender, original thread headers, visible Cc, quoted text and private attachment bytes', async () => {
  const buffer = Buffer.from('private attachment bytes')
  const prepared = await prepareReply(input({ text: 'Confirmed.\n测试内容 & <tag>', attachments: [{ filename: 'quote.pdf', contentType: 'application/pdf', buffer }] }), parent, config, now)
  const parsed = await simpleParser(prepared.rawMime)
  assert.equal(parsed.from?.value[0]?.address, config.defaultSender)
  assert.equal(parsed.messageId, prepared.message.messageId)
  assert.equal(parsed.inReplyTo, parent.messageId)
  assert.deepEqual(parsed.references, ['<root@customer.test>', '<parent@customer.test>'])
  assert.equal(parsed.subject, 'Re: Original request')
  assert.match(parsed.text || '', /Confirmed\.[\s\S]*> Please confirm\./)
  assert.equal(parsed.html, prepared.htmlBody)
  assert.match(String(parsed.html), /<blockquote/)
  assert.match(String(parsed.html), /Please confirm\.<br>Original history\./)
  assert.match(String(parsed.html), /测试内容 &amp; &lt;tag&gt;/)
  assert.ok(parsed.text?.includes('测试内容 & <tag>'))
  assert.ok(prepared.rawMime.toString().includes('multipart/alternative'))
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

test('provider classifier requires clean single-email acceptance, treats mixed counts and malformed results as unknown', () => {
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
  const fetcher = successfulFetch((init, url) => {
    calls++
    assert.equal(url, 'https://api.smtp2go.com/v3/email/send')
    assert.equal(repository.attempts.size, 1, 'attempt must exist before external call')
    assert.equal(repository.prepared.size, 1, 'private MIME archive must be durable before external call')
    const body = JSON.parse(String(init.body)) as { custom_headers: { header: string; value: string }[]; fastaccept: boolean }
    assert.equal(body.fastaccept, false)
    assert.deepEqual(body.custom_headers.find(header => header.header === 'In-Reply-To'), { header: 'In-Reply-To', value: parent.messageId })
  })
  const result = await sendMailboxReply(input(), config, { repository, fetch: fetcher, now: () => now })
  const replay = await sendMailboxReply(input(), config, { repository, fetch: fetcher, now: () => now })
  assert.equal(result.message.id, replay.message.id)
  assert.equal(calls, 1)
  assert.equal((await getReplyAttemptStatus(input().requestKey, config.account || '', repository, now)).status, 'SENT')
  await assert.rejects(sendMailboxReply(input({ text: 'Different payload' }), config, { repository, fetch: fetcher }), hasCode('REQUEST_KEY_CONFLICT'))
  assert.equal(calls, 1)
})

test('standard send includes original conversation headers, reply-all recipients and lossless private attachments', async () => {
  const repository = new MemoryRepository()
  const buffer = Buffer.from([0, 255, 3, 13, 10, 128, 42])
  const attachment = { filename: '报价单_图片.png', contentType: 'image/png', buffer }
  const fetcher = successfulFetch((init, url) => {
    assert.equal(url, 'https://api.smtp2go.com/v3/email/send')
    const body = JSON.parse(String(init.body)) as {
      sender: string; to: string[]; cc: string[]; subject: string; text_body: string; html_body: string;
      custom_headers: { header: string; value: string }[];
      attachments: { filename: string; mimetype: string; fileblob: string }[]; fastaccept: boolean;
    }
    const prepared = repository.prepared.get(input().requestKey)
    assert.ok(prepared)
    assert.equal(body.sender, config.defaultSender)
    assert.deepEqual(body.to, ['customer@customer.test', 'another@customer.test'])
    assert.deepEqual(body.cc, ['copy@customer.test'])
    assert.equal(body.subject, 'Re: Original request')
    assert.equal(body.text_body, prepared.message.textBody)
    assert.equal(body.html_body, prepared.htmlBody)
    assert.match(body.html_body, /<blockquote/)
    assert.deepEqual(body.custom_headers, [
      { header: 'Message-ID', value: prepared.message.messageId },
      { header: 'In-Reply-To', value: parent.messageId },
      { header: 'References', value: '<root@customer.test> <parent@customer.test>' },
    ])
    assert.equal(body.attachments[0].filename, attachment.filename)
    assert.equal(body.attachments[0].mimetype, attachment.contentType)
    assert.deepEqual(Buffer.from(body.attachments[0].fileblob, 'base64'), buffer)
    assert.equal(body.fastaccept, false)
    assert.ok(!('mime_email' in body))
    assert.ok(!('api_key' in body))
    assert.equal(new Headers(init.headers).get('X-Smtp2go-Api-Key'), config.apiKey)
  })
  const result = await sendMailboxReply(input({ to: 'customer@customer.test, another@customer.test', attachments: [attachment] }), config, { repository, fetch: fetcher, now: () => now })
  assert.equal(result.message.direction, 'OUTBOUND', 'one accepted email can include several recipients')
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

test('format-only upgrades keep the legacy payload hash and never resend an uncertain old attempt', async () => {
  const repository = new MemoryRepository()
  const prepared = await prepareReply(input(), parent, config, now)
  assert.equal(prepared.payloadHash, '93a6dc28ae721a87b21214c2299c221762ba98161ad611a68938fcbb74cf5abb')
  repository.attempts.set(input().requestKey, {
    requestKey: input().requestKey, account: config.account || '', parentId: parent.id,
    // Captured from the pre-HTML reply contract for this unchanged input.
    payloadHash: '93a6dc28ae721a87b21214c2299c221762ba98161ad611a68938fcbb74cf5abb',
    status: 'UNKNOWN', outboundMessageId: null, providerRequestId: 'legacy-provider-id',
    safeErrorCode: 'DELIVERY_UNKNOWN', createdAt: now,
  })
  let calls = 0
  const fetcher = successfulFetch(() => { calls++ })
  await assert.rejects(sendMailboxReply(input(), config, { repository, fetch: fetcher, now: () => now }), hasCode('DELIVERY_UNKNOWN'))
  assert.equal(calls, 0)
  assert.equal(repository.prepared.size, 0)
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

test('real permission rejection stores a safe cause and status remains useful after reloading without exposing raw errors', async () => {
  const repository = new MemoryRepository()
  const secretDetail = 'private-recipient@example.test secret-api-key customer message body'
  let calls = 0
  const fetcher: typeof fetch = async () => {
    calls++
    return Response.json({
      request_id: 'request-safe-123',
      data: { error: secretDetail, error_code: 'E_ApiResponseCodes.ENDPOINT_PERMISSION_DENIED' },
    }, { status: 400 })
  }
  await assert.rejects(sendMailboxReply(input(), config, { repository, fetch: fetcher }), (error: unknown) => {
    assert.ok(error instanceof MailboxError)
    assert.equal(error.code, 'PROVIDER_REJECTED')
    assert.match(error.message, /API 密钥.*权限/)
    assert.ok(!error.message.includes(secretDetail))
    return true
  })
  const attempt = repository.attempts.get(input().requestKey)
  assert.equal(attempt?.safeErrorCode, 'PROVIDER_PERMISSION_DENIED')
  const status = await getReplyAttemptStatus(input().requestKey, config.account || '', repository)
  assert.equal(status.status, 'FAILED')
  if (status.status !== 'FAILED') assert.fail('expected failed status')
  assert.equal(status.errorCode, 'PROVIDER_PERMISSION_DENIED')
  assert.equal(status.requestId, 'request-safe-123')
  assert.match(status.reason, /\/email\/send/)
  assert.ok(!JSON.stringify({ attempt, status }).includes(secretDetail))
  await assert.rejects(sendMailboxReply(input(), config, { repository, fetch: fetcher }), hasCode('SEND_ALREADY_FAILED'))
  assert.equal(calls, 1)
})

test('old failures provide generic advice and stored non-allowlisted codes never leak into status', async () => {
  const repository = new MemoryRepository()
  const prepared = await prepareReply(input(), parent, config, now)
  const { attempt } = await repository.reserve(prepared)
  attempt.status = 'FAILED'
  for (const code of [null, 'PROVIDER_REJECTED', 'sensitive unexpected database value']) {
    attempt.safeErrorCode = code
    const result = await getReplyAttemptStatus(input().requestKey, config.account || '', repository)
    if (result.status !== 'FAILED') assert.fail('expected failed status')
    assert.equal(result.errorCode, 'PROVIDER_REJECTED')
    assert.match(result.reason, /未保存可识别的具体原因/)
    assert.ok(!result.reason.includes('sensitive'))
  }
})

test('parameter failure details survive immediate rejection, persisted status and replay without another send', async () => {
  const repository = new MemoryRepository()
  const privateValue = 'customer-private@example.test api-secret-private message-private'
  let calls = 0
  const fetcher: typeof fetch = async () => {
    calls++
    return Response.json({
      request_id: 'parameter-request-123',
      data: {
        error: privateValue, error_code: 'E_ApiResponseCodes.NON_VALIDATING_IN_PAYLOAD',
        field_validation_errors: {
          fieldname: 'sender',
          message: `The field 'sender' was expecting a valid RFC-822 formatted email field but found '${privateValue}', Please correct your JSON payload and try again.`,
        },
      },
    }, { status: 400 })
  }
  const expected: ProviderFailureDiagnostics = {
    httpStatus: 400, validationErrors: [{ field: 'sender', reason: 'invalid_email' }],
  }
  for (const code of ['PROVIDER_REJECTED', 'SEND_ALREADY_FAILED']) {
    await assert.rejects(sendMailboxReply(input(), config, { repository, fetch: fetcher }), (error: unknown) => {
      assert.ok(error instanceof MailboxError)
      const safe = safeMailboxError(error)
      assert.equal(safe.code, code)
      assert.equal(safe.requestId, 'parameter-request-123')
      assert.deepEqual(safe.diagnostics, expected)
      assert.ok(!JSON.stringify(safe).includes(privateValue))
      return true
    })
    const status = await getReplyAttemptStatus(input().requestKey, config.account || '', repository)
    assert.equal(status.status, 'FAILED')
    if (status.status !== 'FAILED') assert.fail('expected failed status')
    assert.equal(status.errorCode, 'PROVIDER_INVALID_REQUEST')
    assert.deepEqual(status.diagnostics, expected)
  }
  assert.equal(calls, 1)
  assert.deepEqual(repository.attempts.get(input().requestKey)?.diagnostics, expected)
})

test('validation details never appear as a definitive cause for server errors or partial delivery', () => {
  const validation = { fieldname: 'sender', message: 'must be a valid email address' }
  for (const [status, data] of [
    [500, { error_code: 'E_ApiResponseCodes.NON_VALIDATING_IN_PAYLOAD', succeeded: 0, field_validation_errors: validation }],
    [200, { error_code: 'E_ApiResponseCodes.NON_VALIDATING_IN_PAYLOAD', succeeded: 1, failed: 1, field_validation_errors: validation }],
  ] as const) {
    assert.deepEqual(classifyProviderResponse(status, { request_id: 'unknown-request', data }), {
      state: 'unknown', requestId: 'unknown-request',
    })
  }
})

test('timeout, malformed JSON, server errors and partial acceptance stay unknown and cannot be blindly retried', async () => {
  const providers: (typeof fetch)[] = [
    async () => { throw new DOMException('sensitive timeout detail', 'AbortError') },
    async () => new Response('not json', { status: 200 }),
    async () => Response.json({ data: { succeeded: 1, failed: 1, failures: ['private rejection'] } }),
    async () => Response.json({ data: { succeeded: 0, failed: 1, error_code: 'E_ApiResponseCodes.ENDPOINT_PERMISSION_DENIED' } }, { status: 500 }),
    async () => Response.json({ data: { succeeded: 1, failed: 0 } }, { status: 503 }),
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
