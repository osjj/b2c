import assert from 'node:assert/strict'
import test from 'node:test'
import { canApplyMailboxAttempt, subscribeMailboxDraft, writeMailboxDraft } from './mailbox-draft-cache'

test('a remounted editor observes a send completed by the old editor without altering another parent', () => {
  const drafts = new Map<string, { requestKey: string; status: string }>()
  writeMailboxDraft(drafts, 'parent-a', { requestKey: 'attempt-a', status: 'sending' })
  writeMailboxDraft(drafts, 'parent-b', { requestKey: 'attempt-b', status: 'draft' })
  let oldNotifications = 0
  const unmountOldEditor = subscribeMailboxDraft(drafts, 'parent-a', () => { oldNotifications++ })
  unmountOldEditor()
  let remountedSnapshot = drafts.get('parent-a')
  const unmountNewEditor = subscribeMailboxDraft(drafts, 'parent-a', () => { remountedSnapshot = drafts.get('parent-a') })
  let otherNotifications = 0
  const unmountOtherEditor = subscribeMailboxDraft(drafts, 'parent-b', () => { otherNotifications++ })
  writeMailboxDraft(drafts, 'parent-a', { requestKey: 'attempt-a', status: 'sent' })
  assert.equal(remountedSnapshot?.status, 'sent')
  assert.equal(oldNotifications, 0)
  assert.equal(otherNotifications, 0)
  assert.equal(drafts.get('parent-b')?.status, 'draft')
  unmountNewEditor()
  unmountOtherEditor()
})

test('late responses cannot replace a newer draft or downgrade a confirmed sent attempt', () => {
  assert.equal(canApplyMailboxAttempt({ requestKey: 'new-key', status: 'draft' }, { requestKey: 'old-key', status: 'sent' }), false)
  assert.equal(canApplyMailboxAttempt({ requestKey: 'same-key', status: 'sent' }, { requestKey: 'same-key', status: 'unknown' }), false)
  assert.equal(canApplyMailboxAttempt({ requestKey: 'same-key', status: 'sending' }, { requestKey: 'same-key', status: 'sent' }), true)
})
