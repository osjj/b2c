import assert from 'node:assert/strict'
import test from 'node:test'
import { MailboxError, requireMailboxAdmin, requireMailboxMutationRequest, safeMailboxError } from './errors'

test('mailbox authorization rejects absent sessions with 401 without loading real auth or database', async () => {
  for (const session of [null, undefined]) {
    await assert.rejects(requireMailboxAdmin(async () => session), { code: 'UNAUTHORIZED', status: 401 })
  }
})

test('mailbox authorization rejects signed-in customers and missing or unrecognized roles with 403', async () => {
  for (const role of ['CUSTOMER', 'USER', 'STAFF', 'admin', 'ADMIN ', undefined]) {
    await assert.rejects(requireMailboxAdmin(async () => ({ role })), { code: 'FORBIDDEN', status: 403 })
  }
})

test('mailbox authorization accepts the resolved administrator identity and fails closed on resolver failure', async () => {
  const administrator = { id: 'admin-fixture', role: 'ADMIN' }
  let resolutions = 0
  assert.equal(await requireMailboxAdmin(async () => { resolutions++; return administrator }), administrator)
  assert.equal(resolutions, 1)
  const privateError = new Error('private session backend failure')
  await assert.rejects(requireMailboxAdmin(async () => { throw privateError }), (error: unknown) => {
    assert.equal(error, privateError)
    const safe = safeMailboxError(error)
    assert.equal(safe.status, 503)
    assert.equal(safe.reason.includes('private session'), false)
    return true
  })
})

test('mailbox POSTs require the same-origin browser client header and reject sibling origins', () => {
  const request = (headers: Record<string, string>) => new Request('https://www.business.test/api/admin/mailbox/reply', { method: 'POST', headers })
  assert.doesNotThrow(() => requireMailboxMutationRequest(request({ 'X-Mailbox-Request': '1', 'Sec-Fetch-Site': 'same-origin' })))
  assert.doesNotThrow(() => requireMailboxMutationRequest(request({ 'X-Mailbox-Request': '1' })))
  const rejectedHeaders: Record<string, string>[] = [
    {}, { 'Sec-Fetch-Site': 'same-origin' }, { 'X-Mailbox-Request': '1', 'Sec-Fetch-Site': 'same-site' },
    { 'X-Mailbox-Request': '1', 'Sec-Fetch-Site': 'cross-site' },
  ]
  for (const headers of rejectedHeaders) {
    assert.throws(() => requireMailboxMutationRequest(request(headers)), { code: 'INVALID_REQUEST_ORIGIN', status: 403 })
  }
})

test('unexpected provider or database errors never disclose raw details', () => {
  const result = safeMailboxError(new Error('password=private-token customer@example.com'))
  assert.equal(result.status, 503)
  assert.equal(JSON.stringify(result).includes('private-token'), false)
  const unauthorized = safeMailboxError(new MailboxError('UNAUTHORIZED', 'Sign in to access the mailbox.', 401))
  assert.equal(unauthorized.status, 401)
})
