import assert from 'node:assert/strict'
import test from 'node:test'
import { mailboxScopeHash, needsHistoryReconciliation, scanUidRange } from './sync'
import { MAX_RAW_MIME_BYTES } from './config'
import { isScopedMailboxMessage, parseMailboxHeaders } from './mime'

const history = new Date('2026-01-01T00:00:00Z')
const header = { headers: Buffer.from('business'), size: 100, internalDate: history }

test('bounded UID scan resumes from last processed UID and counts duplicates', async () => {
  const checkpoints: number[] = []
  const consumed: number[] = []
  const result = await scanUidRange({ start: 1, end: 20, since: history, maxRelevant: 2, maxScanned: 10 }, {
    search: async () => [8, 2, 4, 6], readHeaders: async () => header, relevant: async () => true,
    consume: async uid => { consumed.push(uid); return uid !== 4 },
    checkpoint: async uid => { checkpoints.push(uid) }, shouldStop: () => false,
  })
  assert.deepEqual(consumed, [2, 4])
  assert.deepEqual(checkpoints, [4])
  assert.deepEqual(result, { imported: 1, skipped: 1, relevant: 2, complete: false })
})

test('transient failure never advances over unprocessed message', async () => {
  const checkpoints: number[] = []
  await assert.rejects(scanUidRange({ start: 1, end: 10, since: history, maxRelevant: 50, maxScanned: 100 }, {
    search: async () => [2, 4, 6], readHeaders: async () => header, relevant: async () => true,
    consume: async uid => { if (uid === 4) throw new Error('temporary'); return true },
    checkpoint: async uid => { checkpoints.push(uid) }, shouldStop: () => false,
  }), /temporary/)
  assert.deepEqual(checkpoints, [2])
})

test('unrelated mail is not downloaded or persisted and empty gaps advance safely', async () => {
  const checkpoints: { uid: number; complete: boolean }[] = []
  const result = await scanUidRange({ start: 1, end: 10, since: history, maxRelevant: 50, maxScanned: 100 }, {
    search: async () => [2, 4], readHeaders: async () => header, relevant: async () => false,
    consume: async () => { throw new Error('unrelated mail must never download') },
    checkpoint: async (uid, complete) => { checkpoints.push({ uid, complete }) }, shouldStop: () => false,
  })
  assert.equal(result.complete, true)
  assert.equal(result.skipped, 2)
  assert.deepEqual(checkpoints.at(-1), { uid: 10, complete: true })
})

test('oversize relevant mail blocks the cursor; a stopped run remains resumable', async () => {
  let checkpoints = 0
  const deps = {
    search: async () => [2], readHeaders: async () => ({ ...header, size: MAX_RAW_MIME_BYTES + 1 }), relevant: async () => true,
    consume: async () => true, checkpoint: async () => { checkpoints++ }, shouldStop: () => false,
  }
  const input = { start: 1, end: 10, since: history, maxRelevant: 50, maxScanned: 100 }
  await assert.rejects(scanUidRange(input, deps), { code: 'MESSAGE_TOO_LARGE' })
  assert.equal(checkpoints, 0)
  assert.equal((await scanUidRange(input, { ...deps, shouldStop: () => true })).complete, false)
  assert.equal(checkpoints, 0)
})

test('bounded folder rounds recover a direct QQ reply whose only parent arrives from Sent later', async () => {
  const knownReferences = new Set<string>()
  const imported = new Set<string>()
  const raw = (id: string, recipient: string, parent?: string) => Buffer.from(`From: buyer@example.com\r\nTo: ${recipient}\r\nMessage-ID: <${id}@example.com>\r\n${parent ? `In-Reply-To: <${parent}@example.com>\r\n` : ''}\r\n`)
  const folders = [[raw('root', 'sales@laifappe.com'), raw('qq-reply', 'personal@qq.com', 'qq-sent')], [raw('qq-sent', 'personal@qq.com', 'root')]]
  let rounds = 0
  let needsAnotherRound = true
  while (needsAnotherRound && rounds < 5) {
    let roundImported = 0
    for (const folder of folders) {
      const result = await scanUidRange({ start: 1, end: folder.length, since: history, maxRelevant: 50, maxScanned: 100 }, {
        search: async () => folder.map((_, index) => index + 1),
        readHeaders: async uid => ({ ...header, headers: folder[uid - 1] }),
        relevant: async headers => isScopedMailboxMessage(await parseMailboxHeaders(headers), ['sales@laifappe.com'], knownReferences),
        consume: async (_uid, message) => {
          const metadata = await parseMailboxHeaders(message.headers)
          if (!metadata.messageId || imported.has(metadata.messageId)) return false
          imported.add(metadata.messageId)
          for (const id of [metadata.messageId, ...metadata.references, ...metadata.inReplyTo]) knownReferences.add(id)
          return true
        },
        checkpoint: async () => {}, shouldStop: () => false,
      })
      roundImported += result.imported
    }
    rounds++
    needsAnotherRound = needsHistoryReconciliation(false, roundImported)
  }
  assert.deepEqual([...imported].sort(), ['<qq-reply@example.com>', '<qq-sent@example.com>', '<root@example.com>'])
  assert.equal(rounds, 3)
  assert.equal(needsAnotherRound, false)
})

test('scope changes reset a generation while mere ordering differences do not', () => {
  assert.equal(mailboxScopeHash(['sales@laifappe.com', 'help@laifappe.com'], ['INBOX', 'Sent']), mailboxScopeHash(['HELP@laifappe.com', 'sales@laifappe.com'], ['Sent', 'INBOX']))
  assert.notEqual(mailboxScopeHash(['sales@laifappe.com'], ['INBOX', 'Sent']), mailboxScopeHash(['sales@laifappe.com', 'help@laifappe.com'], ['INBOX', 'Sent']))
  assert.equal(needsHistoryReconciliation(true, 2), false)
  assert.equal(needsHistoryReconciliation(false, 2), true)
  assert.equal(needsHistoryReconciliation(false, 0), false)
})

test('referenced QQ sent root without its own References is recovered by Message-ID', async () => {
  const root = await parseMailboxHeaders(Buffer.from('From: personal@qq.com\r\nTo: buyer@example.com\r\nMessage-ID: <qq-root@example.com>\r\n\r\n'))
  assert.equal(isScopedMailboxMessage(root, ['sales@laifappe.com'], new Set()), false)
  assert.equal(isScopedMailboxMessage(root, ['sales@laifappe.com'], new Set(['<qq-root@example.com>'])), true)
})
