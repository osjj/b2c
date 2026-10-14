import assert from 'node:assert/strict'
import test from 'node:test'

import { MailboxError } from './errors'
import { buildReplyReferences, defaultReplyRecipients, isRfcMessageId, parseReplyRecipients, replySubject } from './threading'

test('reply references retain the original root and immediate parent without duplicating the parent', () => {
  const result = buildReplyReferences({
    messageId: '<parent@customer.test>', references: ['<root@customer.test>', '<parent@customer.test>', '<bad\r\nBcc: theft@example.com>'],
    inReplyTo: ['<unused@customer.test>'],
  })
  assert.deepEqual(result, { inReplyTo: '<parent@customer.test>', references: ['<root@customer.test>', '<parent@customer.test>'] })
  assert.deepEqual(buildReplyReferences({ messageId: '<p@customer.test>', references: [], inReplyTo: ['<r@customer.test>'] }).references, ['<r@customer.test>', '<p@customer.test>'])
  assert.throws(() => buildReplyReferences({ messageId: 'internal-uuid', references: [], inReplyTo: [] }), MailboxError)
  assert.equal(isRfcMessageId('<bad\r\n@example.com>'), false)
})

test('reply-all uses original Reply-To and external To/Cc while excluding aliases, QQ identity, SRS and duplicates', () => {
  const parent = {
    direction: 'INBOUND' as const, from: { address: 'sender@customer.test' },
    replyTo: [{ address: 'reply@customer.test' }],
    to: [{ address: 'sales@enterprise.test' }, { address: 'buyer@customer.test' }],
    cc: [{ address: 'buyer@customer.test' }, { address: 'account@qq.com' }, { address: 'srs0=abc@enterprise.test' }, { address: 'copy@customer.test' }],
  }
  assert.deepEqual(defaultReplyRecipients(parent, ['sales@enterprise.test', 'account@qq.com'], 'replyAll'), {
    to: [{ address: 'reply@customer.test' }, { address: 'buyer@customer.test' }], cc: [{ address: 'copy@customer.test' }],
  })
  assert.deepEqual(defaultReplyRecipients(parent, ['sales@enterprise.test'], 'reply').to, [{ address: 'reply@customer.test' }])
  assert.deepEqual(defaultReplyRecipients({ ...parent, direction: 'OUTBOUND', from: { address: 'sales@enterprise.test' }, replyTo: [] }, ['sales@enterprise.test'], 'reply').to, [{ address: 'buyer@customer.test' }])
})

test('explicit recipients are validated, deduplicated and never add hidden recipients', () => {
  assert.deepEqual(parseReplyRecipients('CUSTOMER@example.com', 'customer@example.com;cc@example.com', []), {
    to: [{ address: 'customer@example.com' }], cc: [{ address: 'cc@example.com' }],
  })
  for (const value of ['good@example.com\r\nBcc:evil@example.com', 'srs0=abc@enterprise.test', 'invalid-address']) {
    assert.throws(() => parseReplyRecipients(value, '', []), MailboxError)
  }
  assert.throws(() => parseReplyRecipients('sales@enterprise.test', '', ['sales@enterprise.test']), /own mailbox/)
  assert.throws(() => parseReplyRecipients(Array.from({ length: 51 }, (_, i) => `c${i}@example.com`).join(','), '', []), /at most 50/)
  assert.equal(replySubject('Order\r\nBcc: malicious@example.com'), 'Re: Order  Bcc: malicious@example.com')
  assert.equal(replySubject('Re: Original subject'), 'Re: Original subject')
})
