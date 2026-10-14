import assert from 'node:assert/strict'
import test from 'node:test'
import { getMailboxConfig } from './config'
import { getMailboxStatus, resolveMailboxThreadKey } from './store'

test('conversation keys are account scoped and follow references rather than shared subjects', () => {
  const original = { messageId: '<root@example.com>', references: [], inReplyTo: [], dedupeKey: 'id:root' }
  const reply = { messageId: '<reply@example.com>', references: ['<root@example.com>'], inReplyTo: ['<root@example.com>'], dedupeKey: 'id:reply' }
  assert.equal(resolveMailboxThreadKey('one@qq.com', original, []), resolveMailboxThreadKey('one@qq.com', reply, []))
  assert.notEqual(resolveMailboxThreadKey('one@qq.com', original, []), resolveMailboxThreadKey('two@qq.com', original, []))
  assert.notEqual(resolveMailboxThreadKey('one@qq.com', original, []), resolveMailboxThreadKey('one@qq.com', { ...original, messageId: '<unrelated@example.com>' }, []))
  assert.equal(resolveMailboxThreadKey('one@qq.com', reply, [{ threadKey: 'already-persisted' }]), 'already-persisted')
})

test('unconfigured mailbox returns setup metadata without touching the database or exposing secrets', async () => {
  const config = getMailboxConfig({ MAILBOX_IMAP_USER: 'one@qq.com' })
  const status = await getMailboxStatus(config)
  assert.equal(status.configured, false)
  assert.equal(status.lastSyncedAt, null)
  assert.match(status.syncSince, /^\d{4}-\d{2}-\d{2}$/)
  assert.equal(Object.hasOwn(status, 'imap'), false)
  assert.equal(Object.hasOwn(status, 'password'), false)
})
