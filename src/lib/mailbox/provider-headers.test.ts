import assert from 'node:assert/strict'
import test from 'node:test'

import { MailboxError } from './errors'
import { buildProviderReplyHeaders, SMTP2GO_MAX_CUSTOM_HEADER_VALUE_LENGTH } from './provider-headers'

function id(length: number, index = 0) {
  const suffix = '@example.test>'
  return `<${`m${index}`.padEnd(length - suffix.length - 1, 'a')}${suffix}`
}

test('short provider threading headers remain unchanged and an exact 255-character value fits', () => {
  const refs = ['<root@example.test>', '<parent@example.test>']
  assert.deepEqual(buildProviderReplyHeaders('<new@example.test>', refs[1], refs), [
    { header: 'Message-ID', value: '<new@example.test>' },
    { header: 'In-Reply-To', value: refs[1] },
    { header: 'References', value: refs.join(' ') },
  ])
  const exact = [id(126), id(128, 1)]
  const value = buildProviderReplyHeaders(id(30), exact[1], exact)[2].value
  assert.equal(value, exact.join(' '))
  assert.equal(value.length, SMTP2GO_MAX_CUSTOM_HEADER_VALUE_LENGTH)
})

test('the real 632-character chain compacts to whole root, recent and parent IDs without changing its archive input', () => {
  const refs = [61, 84, 80, 80, 80, 80, 80, 80].map((length, index) => id(length, index))
  const original = [...refs]
  assert.equal(refs.join(' ').length, 632)
  const headers = buildProviderReplyHeaders(id(30), refs[7], refs)
  assert.deepEqual(headers[2], { header: 'References', value: [refs[0], refs[6], refs[7]].join(' ') })
  assert.equal(headers[2].value.length, 223)
  assert.ok(headers.every(header => header.value.length <= 255))
  assert.deepEqual(refs, original)
  assert.equal(headers[1].value, refs[7])
})

test('parent takes priority when root cannot fit, and oversized ancestors are skipped without cutting IDs', () => {
  const refs = [id(200), id(300, 1), id(80, 2), id(80, 3)]
  assert.equal(buildProviderReplyHeaders(id(30), refs[3], refs)[2].value, [refs[2], refs[3]].join(' '))
  const parent = id(255)
  assert.equal(buildProviderReplyHeaders(id(30), parent, ['<root@example.test>', parent])[2].value, parent)
  assert.equal(buildProviderReplyHeaders(id(30), '<parent@example.test>', [
    '<root@example.test>', '<bad\r\nBcc: private@example.test>', '<root@example.test>', '<parent@example.test>',
  ])[2].value, '<root@example.test> <parent@example.test>')
})

test('required identifiers are validated as whole values instead of being silently truncated', () => {
  for (const [messageId, parent] of [[id(256), id(30)], [id(30), id(256)]]) {
    assert.throws(() => buildProviderReplyHeaders(messageId, parent, [parent]), (error: unknown) => {
      assert.ok(error instanceof MailboxError)
      assert.equal(error.code, 'THREAD_HEADER_TOO_LONG')
      assert.equal(error.status, 422)
      assert.ok(!error.message.includes(parent))
      return true
    })
  }
  assert.throws(() => buildProviderReplyHeaders(id(30), 'invalid-parent', []), { code: 'INVALID_THREAD_HEADER', status: 422 })
})
