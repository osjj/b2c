import assert from 'node:assert/strict'
import test from 'node:test'
import MailComposer from 'nodemailer/lib/mail-composer'

import { readMailboxAttachment } from './attachments'
import { MAX_RAW_MIME_BYTES } from './config'

const account = 'mailbox@qq.com'
const outboundId = 'eb91e9cc-5527-4977-b490-6587ad2fc9ac'
const inboundId = 'cmgpa8b460001kkkf91vncccf'

test('private attachment retrieval accepts imported CUIDs and sent UUIDs and preserves exact bytes', async () => {
  const content = Buffer.from([0, 1, 255, 31, 64])
  const rawMime = await new MailComposer({
    from: 'sales@business.test', to: 'customer@example.com', text: 'Reply body',
    attachments: [{ filename: 'quote.pdf', contentType: 'application/pdf', content }],
  }).compile().build()
  for (const id of [inboundId, outboundId]) {
    const attachment = await readMailboxAttachment(account, id, '0', {
      async getRawMime(requestAccount, requestId) {
        assert.equal(requestAccount, account)
        assert.equal(requestId, id)
        return rawMime
      },
    })
    assert.equal(attachment.filename, 'quote.pdf')
    assert.deepEqual(Buffer.from(attachment.content), content)
  }
})

test('invalid attachment paths never read storage; account mismatch and missing index never disclose data', async () => {
  let reads = 0
  const repository = { async getRawMime() { reads++; return null } }
  await assert.rejects(readMailboxAttachment(account, '../mail', '0', repository), { code: 'VALIDATION_FAILED' })
  await assert.rejects(readMailboxAttachment(account, outboundId, '-1', repository), { code: 'VALIDATION_FAILED' })
  assert.equal(reads, 0)
  await assert.rejects(readMailboxAttachment('another@qq.com', outboundId, '0', {
    async getRawMime(requestAccount) { return requestAccount === account ? Buffer.from('private') : null },
  }), { code: 'NOT_FOUND', status: 404 })
  const rawMime = await new MailComposer({ from: 'sales@business.test', to: 'customer@example.com', text: 'No attachments' }).compile().build()
  await assert.rejects(readMailboxAttachment(account, outboundId, '0', { async getRawMime() { return rawMime } }), { code: 'NOT_FOUND' })
})

test('oversize stored MIME is rejected before parsing', async () => {
  await assert.rejects(readMailboxAttachment(account, outboundId, '0', {
    async getRawMime() { return new Uint8Array(MAX_RAW_MIME_BYTES + 1) },
  }), { code: 'MESSAGE_TOO_LARGE', status: 413 })
})
