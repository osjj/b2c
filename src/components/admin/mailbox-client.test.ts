import assert from 'node:assert/strict'
import test from 'node:test'
import { z } from 'zod'
import { MailboxRequestError, mailboxAttemptSchema, mailboxFailedAttemptNotice, mailboxReplyDraftSchema, mailboxRequest } from './mailbox-client'

const providerDiagnostics = {
  httpStatus: 400,
  validationErrors: [
    { field: 'sender', reason: 'invalid_email' as const },
    { field: 'attachments[0].fileblob', reason: 'invalid_base64' as const },
  ],
}

test('mailbox browser mutations add CSRF header while preserving multipart boundaries and JSON headers', async (context) => {
  const observed: Headers[] = []
  context.mock.method(globalThis, 'fetch', async (_url: string, init: RequestInit) => {
    observed.push(new Headers(init.headers))
    return Response.json({ success: true, reason: 'Fixture result.', data: { ok: true } })
  })
  const schema = z.object({ ok: z.boolean() })
  await mailboxRequest('/api/admin/mailbox/sync', schema, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
  await mailboxRequest('/api/admin/mailbox/reply', schema, { method: 'POST', body: new FormData() })
  await mailboxRequest('/api/admin/mailbox', schema)
  assert.equal(observed[0].get('x-mailbox-request'), '1')
  assert.equal(observed[0].get('content-type'), 'application/json')
  assert.equal(observed[1].get('x-mailbox-request'), '1')
  assert.equal(observed[1].get('content-type'), null, 'browser must generate the multipart boundary')
  assert.equal(observed[2].get('x-mailbox-request'), null)
})

test('a rejected send preserves the safe server reason and request error code', async (context) => {
  const reason = '发信服务拒绝了请求：当前 API Key 没有此接口的调用权限。请检查服务器发信配置。'
  context.mock.method(globalThis, 'fetch', async () => Response.json({
    success: false, code: 'PROVIDER_REJECTED', reason,
  }, { status: 502 }))
  await assert.rejects(mailboxRequest('/api/admin/mailbox/reply', z.object({}), { method: 'POST', body: new FormData() }), (error) => {
    assert.ok(error instanceof MailboxRequestError)
    assert.equal(error.code, 'PROVIDER_REJECTED')
    assert.equal(error.message, reason)
    assert.equal(error.status, 502)
    return true
  })
})

test('a rejected send carries safe parameter diagnostics and provider request ID immediately', async (context) => {
  context.mock.method(globalThis, 'fetch', async () => Response.json({
    success: false, code: 'PROVIDER_REJECTED', reason: '邮件参数被拒绝。',
    requestId: 'provider-fixture-parameters', diagnostics: providerDiagnostics,
  }, { status: 502 }))
  await assert.rejects(mailboxRequest('/api/admin/mailbox/reply', z.object({}), { method: 'POST', body: new FormData() }), (error) => {
    assert.ok(error instanceof MailboxRequestError)
    assert.equal(error.code, 'PROVIDER_REJECTED')
    assert.equal(error.status, 502)
    assert.equal(error.requestId, 'provider-fixture-parameters')
    assert.deepEqual(error.diagnostics, providerDiagnostics)
    return true
  })
})

test('malformed optional POST diagnostics do not obscure a confirmed provider rejection', async (context) => {
  context.mock.method(globalThis, 'fetch', async () => Response.json({
    success: false, code: 'PROVIDER_REJECTED', reason: '邮件参数被拒绝。',
    requestId: 'provider-fixture-parameters', diagnostics: { httpStatus: '400', validationErrors: [] },
  }, { status: 502 }))
  await assert.rejects(mailboxRequest('/api/admin/mailbox/reply', z.object({}), { method: 'POST', body: new FormData() }), (error) => {
    assert.ok(error instanceof MailboxRequestError)
    assert.equal(error.code, 'PROVIDER_REJECTED')
    assert.equal(error.message, '邮件参数被拒绝。')
    assert.equal(error.requestId, 'provider-fixture-parameters')
    assert.equal(error.diagnostics, undefined)
    return true
  })
})

test('failed status returns a useful reason and diagnostic identifiers without sending again', async (context) => {
  const observed: { url: string; method: string | undefined }[] = []
  const reason = '当前 API Key 没有发信接口调用权限，请检查服务器发信配置。'
  context.mock.method(globalThis, 'fetch', async (url: string, init: RequestInit) => {
    observed.push({ url, method: init.method })
    return Response.json({ success: true, reason: 'Loaded.', data: {
      status: 'FAILED', requestId: 'provider-fixture-request', errorCode: 'PROVIDER_ENDPOINT_FORBIDDEN', reason,
    } })
  })
  const attempt = await mailboxRequest('/api/admin/mailbox/reply?requestKey=existing-attempt', mailboxAttemptSchema)
  assert.equal(mailboxFailedAttemptNotice(attempt), reason)
  assert.equal(attempt.errorCode, 'PROVIDER_ENDPOINT_FORBIDDEN')
  assert.equal(attempt.requestId, 'provider-fixture-request')
  assert.deepEqual(observed, [{ url: '/api/admin/mailbox/reply?requestKey=existing-attempt', method: undefined }])
})

test('read-only failed status restores the same parameter diagnostics', async (context) => {
  const observed: (string | undefined)[] = []
  context.mock.method(globalThis, 'fetch', async (_url: string, init: RequestInit) => {
    observed.push(init.method)
    return Response.json({ success: true, reason: 'Loaded.', data: {
      status: 'FAILED', requestId: 'provider-fixture-parameters', errorCode: 'PROVIDER_INVALID_REQUEST',
      reason: '邮件参数被拒绝。', diagnostics: providerDiagnostics,
    } })
  })
  const attempt = await mailboxRequest('/api/admin/mailbox/reply?requestKey=existing-attempt', mailboxAttemptSchema)
  assert.equal(attempt.status, 'FAILED')
  assert.equal(attempt.errorCode, 'PROVIDER_INVALID_REQUEST')
  assert.equal(attempt.requestId, 'provider-fixture-parameters')
  assert.deepEqual(attempt.diagnostics, providerDiagnostics)
  assert.deepEqual(observed, [undefined])
})

test('malformed optional GET diagnostics retain the FAILED category and safe reason', async (context) => {
  context.mock.method(globalThis, 'fetch', async () => Response.json({ success: true, reason: 'Loaded.', data: {
    status: 'FAILED', errorCode: 'PROVIDER_INVALID_REQUEST', reason: '邮件参数被拒绝。',
    diagnostics: { httpStatus: 400, validationErrors: [{ field: 'sender', reason: 'arbitrary raw text' }] },
  } }))
  const attempt = await mailboxRequest('/api/admin/mailbox/reply?requestKey=existing-attempt', mailboxAttemptSchema)
  assert.equal(attempt.status, 'FAILED')
  assert.equal(attempt.errorCode, 'PROVIDER_INVALID_REQUEST')
  assert.equal(mailboxFailedAttemptNotice(attempt), '邮件参数被拒绝。')
  assert.equal(attempt.diagnostics, undefined)
})

test('old failed status responses remain readable without claiming a guessed cause', () => {
  const attempt = mailboxAttemptSchema.parse({ status: 'FAILED' })
  assert.match(mailboxFailedAttemptNotice(attempt), /未提供具体原因/)
  assert.doesNotMatch(mailboxFailedAttemptNotice(attempt), /没有.*权限/)
  assert.equal(attempt.errorCode, undefined)
})

test('draft serialization keeps failure diagnostics and accepts earlier saved drafts', () => {
  const earlier = {
    parentId: 'parent-fixture', mode: 'reply', to: 'buyer@example.com', cc: '',
    text: 'Retain this reply.', includeQuote: true, requestKey: '3c03e212-e9f4-4702-8487-013a482629fa',
    status: 'failed', notice: 'Already failed.', attachmentNames: ['attachment.png'],
  }
  assert.equal(mailboxReplyDraftSchema.parse(earlier).status, 'failed')
  const saved = mailboxReplyDraftSchema.parse(JSON.parse(JSON.stringify({
    ...earlier, errorCode: 'PROVIDER_ENDPOINT_FORBIDDEN', providerRequestId: 'provider-fixture-request',
    diagnostics: providerDiagnostics,
  })))
  assert.equal(saved.errorCode, 'PROVIDER_ENDPOINT_FORBIDDEN')
  assert.equal(saved.providerRequestId, 'provider-fixture-request')
  assert.equal(saved.requestKey, earlier.requestKey)
  assert.equal(saved.text, earlier.text)
  assert.deepEqual(saved.attachmentNames, earlier.attachmentNames)
  assert.deepEqual(saved.diagnostics, providerDiagnostics)
  const malformed = mailboxReplyDraftSchema.parse({ ...saved, diagnostics: { httpStatus: 400, validationErrors: 'invalid' } })
  assert.equal(malformed.status, 'failed')
  assert.equal(malformed.requestKey, earlier.requestKey)
  assert.equal(malformed.text, earlier.text)
  assert.equal(malformed.diagnostics, undefined)
})
