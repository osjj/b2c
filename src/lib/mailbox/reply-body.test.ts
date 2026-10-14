import assert from 'node:assert/strict'
import test from 'node:test'

import { buildReplyBodies } from './reply-body'

const parent = {
  from: { name: 'Customer', address: 'customer@example.test' },
  sentAt: '2026-10-13T01:19:14.000Z',
  textBody: 'Please confirm.\n\nThank you.',
}

test('HTML reply separates new text from quoted history and preserves paragraphs with a readable zoned date', () => {
  const bodies = buildReplyBodies({ text: 'Confirmed.\r\n\r\nBest regards,\nSales', includeQuote: true }, parent)
  assert.match(bodies.htmlBody, /font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1\.6/)
  assert.match(bodies.htmlBody, /Confirmed\.<br><br>Best regards,<br>Sales/)
  assert.match(bodies.htmlBody, /<blockquote[^>]*border-left:2px solid #d1d5db/)
  assert.match(bodies.htmlBody, /Please confirm\.<br><br>Thank you\./)
  assert.match(bodies.htmlBody, /On Tue, Oct 13, 2026 at 09:19 \(UTC\+08:00\), Customer &lt;customer@example\.test&gt; wrote:/)
  assert.ok(!bodies.htmlBody.includes('&gt; Please confirm.'))
  assert.match(bodies.textBody, /On Tue, Oct 13, 2026 at 09:19 \(UTC\+08:00\)/)
  assert.match(bodies.textBody, /> Please confirm\.\n> \n> Thank you\./)
  assert.ok(!bodies.textBody.includes('2026-10-13T01:19:14.000Z'))
})

test('new text, sender fields and original text are escaped and cannot produce active HTML or remote requests', () => {
  const bodies = buildReplyBodies({ text: '<script>alert("reply")</script> & \'new\'', includeQuote: true }, {
    ...parent,
    from: { name: '<img src="https://tracking.example.test/a" onerror="alert(1)">', address: '<iframe src="javascript:alert(2)">' },
    textBody: '<style>@import "https://tracking.example.test/style"</style>\n<a href="javascript:alert(3)">old & text</a>',
  })
  assert.ok(!/<(?:script|img|style|iframe|a)(?:\s|>)/i.test(bodies.htmlBody))
  assert.match(bodies.htmlBody, /&lt;script&gt;alert\(&quot;reply&quot;\)&lt;\/script&gt; &amp; &#39;new&#39;/)
  assert.match(bodies.htmlBody, /&lt;img src=&quot;https:\/\/tracking\.example\.test\/a&quot;/)
  assert.match(bodies.htmlBody, /&lt;style&gt;@import &quot;https:\/\/tracking\.example\.test\/style&quot;&lt;\/style&gt;/)
  assert.match(bodies.htmlBody, /old &amp; text/)
  assert.ok(bodies.textBody.includes('<script>alert("reply")</script>'))
})

test('quote-free replies contain only the escaped new body', () => {
  const bodies = buildReplyBodies({ text: 'Only my text.\n<a>literal</a>', includeQuote: false }, parent)
  assert.equal(bodies.textBody, 'Only my text.\n<a>literal</a>')
  assert.match(bodies.htmlBody, /Only my text\.<br>&lt;a&gt;literal&lt;\/a&gt;/)
  assert.ok(!bodies.htmlBody.includes('<blockquote'))
  assert.ok(!bodies.htmlBody.includes('Please confirm.'))
  assert.ok(!bodies.htmlBody.includes('wrote:'))
})

test('unknown dates cannot throw and absent or identical sender names do not duplicate the email address', () => {
  for (const from of [{ address: 'customer@example.test' }, { name: 'customer@example.test', address: 'customer@example.test' }]) {
    const bodies = buildReplyBodies({ text: 'Reply', includeQuote: true }, { ...parent, from, sentAt: 'invalid date' })
    assert.match(bodies.textBody, /On an unknown date, customer@example\.test wrote:/)
    assert.equal((bodies.textBody.match(/customer@example\.test/g) || []).length, 1)
    assert.ok(!bodies.htmlBody.includes('Invalid Date'))
  }
  const midnight = buildReplyBodies({ text: 'Reply', includeQuote: true }, { ...parent, sentAt: '2026-10-13T16:00:00.000Z' })
  assert.match(midnight.textBody, /Wed, Oct 14, 2026 at 00:00 \(UTC\+08:00\)/)
})

test('historical quote prefixes become bounded nested blockquotes without dropping content or quoting comparisons', () => {
  const bodies = buildReplyBodies({ text: 'Latest', includeQuote: true }, {
    ...parent, textBody: 'Earlier reply\n> First quoted line\n> \n>> Deeper history\n> > Next deeper line\n>>>>>>>>>> Oldest history\n>100 units remain\nLast line',
  })
  assert.match(bodies.htmlBody, /First quoted line/)
  assert.match(bodies.htmlBody, /Deeper history/)
  assert.match(bodies.htmlBody, /Next deeper line/)
  assert.match(bodies.htmlBody, /Oldest history/)
  assert.match(bodies.htmlBody, /&gt;100 units remain/)
  assert.ok(!bodies.htmlBody.includes('&gt; First quoted line'))
  let depth = 0
  let maximum = 0
  for (const match of bodies.htmlBody.matchAll(/<blockquote\b|<\/blockquote>/g)) {
    depth += match[0] === '</blockquote>' ? -1 : 1
    maximum = Math.max(maximum, depth)
    assert.ok(depth >= 0)
  }
  assert.equal(maximum, 5)
  assert.equal(depth, 0)
  assert.match(bodies.textBody, /> > First quoted line/)
  assert.match(bodies.textBody, /> >100 units remain/)
})

test('quoted history keeps the existing size limit and explicit truncation notice while long URLs can wrap', () => {
  const longUrl = `https://example.test/verify?token=${'a'.repeat(500)}`
  const original = `${longUrl}\n${'x'.repeat(200000)}`
  const bodies = buildReplyBodies({ text: 'Reply', includeQuote: true }, { ...parent, textBody: original })
  assert.ok(bodies.htmlBody.includes(longUrl))
  assert.match(bodies.htmlBody, /overflow-wrap:anywhere;word-wrap:break-word;word-break:break-word/)
  assert.match(bodies.htmlBody, /\[Earlier quoted content omitted due to size\.\]/)
  assert.match(bodies.textBody, /\n> \[Earlier quoted content omitted due to size\.\]$/)
  const quotedLines = bodies.textBody.split(' wrote:\n')[1].split('\n')
  assert.equal(quotedLines.slice(0, -1).map(line => line.slice(2)).join('\n'), original.slice(0, 200000))
  const boundary = buildReplyBodies({ text: 'Reply', includeQuote: true }, { ...parent, textBody: 'x'.repeat(200000) })
  assert.ok(!boundary.htmlBody.includes('omitted due to size'))
})
