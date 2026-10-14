import assert from 'node:assert/strict'
import test from 'node:test'
import { z } from 'zod'
import { mailboxRequest } from './mailbox-client'

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
