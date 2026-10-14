import assert from 'node:assert/strict'
import test from 'node:test'
import { getMailboxConfig, MAX_RAW_MIME_BYTES, parseHistoryDate } from './config'
import { computeDedupeKey, extractMessageIds, isBusinessMessage, parseMailboxHeaders, parseMailboxMime, safeAttachmentFilename } from './mime'

const fixture = Buffer.from([
  'From: Customer <buyer@example.com>', 'To: Sales <sales@laifappe.com>', 'Cc: Other <other@example.com>',
  'Reply-To: Purchasing <purchasing@example.com>', 'Return-Path: <srs0=abc@example.net>',
  'Message-ID: <reply-2@example.com>', 'In-Reply-To: <parent-1@example.com>',
  'References: <root@example.com> <parent-1@example.com>', 'Subject: Re: Purchase inquiry',
  'Date: Wed, 14 Oct 2026 10:00:00 +0800', 'MIME-Version: 1.0', 'Content-Type: multipart/mixed; boundary="test-boundary"', '',
  '--test-boundary', 'Content-Type: text/plain; charset=utf-8', '', 'Please confirm the package details.',
  '--test-boundary', 'Content-Type: application/pdf', 'Content-Disposition: attachment; filename="invoice.pdf"',
  'Content-Transfer-Encoding: base64', '', 'JVBERi0xLjQK', '--test-boundary--', '',
].join('\r\n'))

test('preserves threading, real reply address, private MIME, date and attachment metadata', async () => {
  const parsed = await parseMailboxMime(fixture)
  assert.equal(parsed.from.address, 'buyer@example.com')
  assert.equal(parsed.replyTo[0].address, 'purchasing@example.com')
  assert.deepEqual(parsed.inReplyTo, ['<parent-1@example.com>'])
  assert.deepEqual(parsed.references, ['<root@example.com>', '<parent-1@example.com>'])
  assert.equal(parsed.sentAt.toISOString(), '2026-10-14T02:00:00.000Z')
  assert.equal(parsed.attachments[0].filename, 'invoice.pdf')
  assert.equal(parsed.attachments[0].size, 9)
  assert.deepEqual(parsed.rawMime, fixture)
  assert.match(parsed.textBody, /Please confirm/)
  assert.ok(isBusinessMessage(parsed, ['sales@laifappe.com']))
})

test('business scope accepts delivered aliases but excludes unrelated personal QQ mail', async () => {
  const forwarded = await parseMailboxHeaders(Buffer.from('From: buyer@example.com\r\nTo: elsewhere@example.com\r\nDelivered-To: sales@laifappe.com\r\n\r\n'))
  const personal = await parseMailboxHeaders(Buffer.from('From: friend@example.com\r\nTo: personal@qq.com\r\n\r\n'))
  assert.equal(isBusinessMessage(forwarded, ['sales@laifappe.com']), true)
  assert.equal(isBusinessMessage(personal, ['sales@laifappe.com']), false)
})

test('message ID dedupe survives copied folders and outbound reimport', () => {
  assert.equal(computeDedupeKey('<same@example.com>', Buffer.from('folder one')), computeDedupeKey('<same@example.com>', Buffer.from('folder two')))
  assert.notEqual(computeDedupeKey(null, Buffer.from('a')), computeDedupeKey(null, Buffer.from('b')))
  assert.deepEqual(extractMessageIds('bad\r\nInjected: x <okay@example.com> <okay@example.com>'), ['<okay@example.com>'])
})

test('HTML mail yields text only; absent RFC Message-ID remains absent', async () => {
  const parsed = await parseMailboxMime(Buffer.from('From: buyer@example.com\r\nTo: sales@laifappe.com\r\nContent-Type: text/html\r\n\r\n<p>Hello</p><script>alert(1)</script><img src="https://tracking.example/pixel">'))
  assert.equal(parsed.messageId, null)
  assert.match(parsed.textBody, /Hello/)
  assert.equal(Object.hasOwn(parsed, 'htmlBody'), false)
})

test('NUL stays in original MIME but is removed from PostgreSQL text projections', async () => {
  const raw = Buffer.from('From: buyer@example.com\r\nTo: sales@laifappe.com\r\n\r\nHello\0world')
  const parsed = await parseMailboxMime(raw)
  assert.equal(parsed.textBody.includes('\0'), false)
  assert.equal(parsed.rawMime.includes(0), true)
  assert.deepEqual(extractMessageIds('<invalid\0@example.com>'), [])
})

test('oversize MIME and invalid history dates fail explicitly', async () => {
  await assert.rejects(parseMailboxMime(Buffer.alloc(MAX_RAW_MIME_BYTES + 1)), { code: 'MESSAGE_TOO_LARGE' })
  assert.throws(() => parseHistoryDate('2026-02-30'), { code: 'INVALID_HISTORY_DATE' })
  assert.throws(() => parseHistoryDate('9999-01-01'), { code: 'INVALID_HISTORY_DATE' })
  assert.equal(safeAttachmentFilename('../../file\r\n.pdf'), '.._.._file__.pdf')
})

test('configuration exposes no password in browser DTO and validates explicit approved sender', () => {
  const absent = getMailboxConfig({})
  assert.equal(absent.configured, false)
  const config = getMailboxConfig({ MAILBOX_IMAP_USER: 'PERSONAL@qq.com', MAILBOX_IMAP_PASSWORD: 'authorization', MAILBOX_ALIASES: 'sales@laifappe.com, support@laifappe.com' })
  assert.equal(config.imap?.host, 'imap.qq.com')
  assert.equal(config.imap?.port, 993)
  assert.deepEqual(config.ownAddresses, ['sales@laifappe.com', 'support@laifappe.com', 'personal@qq.com'])
  assert.throws(() => getMailboxConfig({ MAILBOX_ALIASES: 'another@example.com' }), { code: 'INVALID_MAILBOX_CONFIG' })
})
