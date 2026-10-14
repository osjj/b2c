import assert from 'node:assert/strict'
import test from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MailboxRichFrame, mailboxRichContentSchema, mailboxRichDocument } from './mailbox-rich-content'

test('rich mail preview keeps formatting and embedded images while blocking network content by default', () => {
  const html = '<table style="background:#124477"><tr><td><img src="data:image/png;base64,AA==" alt="Logo"><b style="color:#ffcc00">Original heading</b></td></tr></table>'
  const document = mailboxRichDocument(html)
  assert.ok(document.includes(html), 'the isolated preview must retain the sanitized layout and image')
  assert.match(document, /default-src 'none'/)
  assert.match(document, /style-src 'unsafe-inline'/)
  assert.match(document, /img-src data:;/)
  assert.doesNotMatch(document, /img-src[^;]*(?:http:|https:)/)
  assert.match(document, /base-uri 'none'; form-action 'none'/)
  assert.match(document, /name="referrer" content="no-referrer"/)
})

test('explicit external-image opt in opens only the image source policy', () => {
  const document = mailboxRichDocument('<p>Original content</p>', true)
  assert.match(document, /img-src data: https: http:;/)
  assert.match(document, /default-src 'none'/)
  assert.doesNotMatch(document, /(?:script-src|connect-src|frame-src|font-src)\s+(?:https?:|\*)/)
})

test('preview links cannot be activated with a pointer or keyboard without altering sent content', () => {
  const html = '<a href="https://example.com" style="color:#0055ff">Original link</a><abbr>Info</abbr><A\nHREF="mailto:buyer@example.com">Contact</A>'
  const document = mailboxRichDocument(html)
  assert.match(document, /<a inert href="https:\/\/example.com" style="color:#0055ff">Original link<\/a>/)
  assert.match(document, /<a inert\nHREF="mailto:buyer@example.com">Contact<\/A>/)
  assert.match(document, /<abbr>Info<\/abbr>/)
  assert.doesNotMatch(html, /inert/, 'formatting the preview does not change the source sent by the backend')
})

test('rich content frame is sandboxed without script or same-origin allowances and explains blocked images', () => {
  const markup = renderToStaticMarkup(createElement(MailboxRichFrame, {
    html: '<p style="color:red">Original</p>', hasRemoteImages: true, omittedImages: 2, title: 'Original email',
  }))
  assert.match(markup, /sandbox=""/)
  assert.match(markup.toLowerCase(), /referrerpolicy="no-referrer"/)
  assert.doesNotMatch(markup, /allow-scripts|allow-same-origin|allow-top-navigation|allow-popups|allow-forms/)
  assert.match(markup, /显示外部图片/)
  assert.match(markup, /连接发件方的图片服务器/)
  assert.match(markup, /有 2 张图片无法显示/)
})

test('rich content metadata accepts a plain text fallback and rejects invalid counts', () => {
  assert.equal(mailboxRichContentSchema.parse({ html: null, hasRemoteImages: false, omittedImages: 0, inlineImageCount: 0 }).html, null)
  assert.equal(mailboxRichContentSchema.safeParse({ html: '<p>Rich</p>', hasRemoteImages: false, omittedImages: -1, inlineImageCount: 0 }).success, false)
})
