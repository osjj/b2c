import assert from 'node:assert/strict'
import test from 'node:test'
import { MAX_RAW_MIME_BYTES } from './config'
import { readRichMailboxContent } from './rich-content'

const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jf9kAAAAASUVORK5CYII=', 'base64')
type FixtureImage = { cid: string; content?: Buffer; contentType?: string }

function mime(html: string, images: FixtureImage[] = []) {
  return Buffer.from([
    'From: Buyer <buyer@example.com>', 'To: sales@example.com', 'MIME-Version: 1.0',
    'Content-Type: multipart/related; boundary="rich-fixture"', '',
    '--rich-fixture', 'Content-Type: text/html; charset=utf-8', 'Content-Transfer-Encoding: base64', '', Buffer.from(html).toString('base64'),
    ...images.flatMap(image => [
      '--rich-fixture', `Content-Type: ${image.contentType || 'image/png'}`, `Content-ID: <${image.cid}>`,
      'Content-Disposition: inline; filename="original.png"', 'Content-Transfer-Encoding: base64', '', (image.content || png).toString('base64'),
    ]), '--rich-fixture--', '',
  ].join('\r\n'))
}

test('preserves class styling, table layout, colors and inherited document styles', async () => {
  const result = await readRichMailboxContent(mime(`<!doctype html><html style="font-family:Arial;color:#123456"><head><style>
    body { background-color: #f2f4f8; } .header { background-color:#0055aa; color:white; padding:12px; }
    .cell { border:1px solid #cccccc; text-align:center; font-weight:bold; }
  </style></head><body><table width="600" cellpadding="4"><tr><td class="header">Company</td></tr><tr><td class="cell"><b>Price</b> $12</td></tr></table></body></html>`))
  assert.ok(result.html)
  assert.match(result.html, /font-family:Arial/)
  assert.match(result.html, /color:#123456/)
  assert.match(result.html, /background-color:#f2f4f8/)
  assert.match(result.html, /background-color:#0055aa/)
  assert.match(result.html, /border:1px solid #cccccc/)
  assert.match(result.html, /<table width="600" cellpadding="4">/)
  assert.doesNotMatch(result.html, /class=|<style|<html|<body/)
  assert.doesNotMatch(result.html, /white-space:pre-wrap/)
  assert.equal(result.previewHtml, result.html)
})

test('strips active HTML, CSS URLs and expressions while retaining safe links and content', async () => {
  const result = await readRichMailboxContent(mime(`<html><head><style>@import url("https://tracker.example/style.css");</style></head><body background="https://tracker.example/background">
    <script>alert(1)</script><iframe src="https://tracker.example/frame"></iframe><object data="file:///private"></object>
    <svg><image href="https://tracker.example/svg" /></svg><form action="https://tracker.example/post"><input value="secret"></form>
    <p onclick="alert(1)" style="color: red; background-image:url('https://tracker.example/pixel'); width:expression(alert(1)); position:fixed; left:0; behavior:url(x); --x:url(y)">Safe text</p>
    <a href="javascript:alert(1)">Bad link</a><a href="https://example.com/path">Website</a><a href="mailto:person@example.com">Email</a><a href="tel:+1234">Call</a>
    <img src="file:///private"><img src="data:image/svg+xml;base64,PHN2Zz4="><img src="javascript:alert(1)">
    <table background="https://tracker.example/bg" width="expression(x)"><tr><td bgcolor="red;position:fixed" colspan="oops">Table</td></tr></table>
  </body></html>`))
  assert.ok(result.html)
  assert.match(result.html, /color:red/)
  assert.match(result.html, /Safe text/)
  assert.match(result.html, /href="https:\/\/example.com\/path"/)
  assert.match(result.html, /href="mailto:person@example.com"/)
  assert.match(result.html, /href="tel:\+1234"/)
  assert.doesNotMatch(result.html, /<script|<iframe|<object|<svg|<form|<input|onclick|background=|background-image|position:|expression|javascript:|file:|tracker\.example|colspan=|width=/)
  assert.equal(result.omittedImages, 3)
  assert.equal(result.hasRemoteImages, false)
})

test('keeps common email preheaders hidden after class CSS is inlined and sanitized', async () => {
  const result = await readRichMailboxContent(mime('<html><head><style>.preheader { display:none !important; font-size:1px; line-height:1px; max-height:0; }</style></head><body><div class="preheader">Inbox summary only</div><div style="display:none">Secondary hidden text</div><p>Visible email body</p></body></html>'))
  assert.ok(result.html)
  assert.match(result.html, /<div style="[^"]*display:none(?:\s*!important)?[^"]*">Inbox summary only<\/div>/)
  assert.match(result.html, /<div style="display:none">Secondary hidden text<\/div>/)
  assert.match(result.html, /<p>Visible email body<\/p>/)
  assert.equal(result.previewHtml, result.html)
})

test('embeds only referenced valid raster CID images with deterministic IDs and exact preview bytes', async () => {
  const source = mime('<p>Hello<img src="cid:logo%40example" alt="Logo" width="20"><img src="cid:logo@example"></p>', [{ cid: 'logo@example' }, { cid: 'unused@example' }])
  const result = await readRichMailboxContent(source)
  const image = result.inlineImages[0]
  assert.ok(image)
  assert.equal(result.inlineImages.length, 1)
  assert.equal(image.cid, image.filename)
  assert.match(image.cid, /^quote-[a-f0-9]{64}\.png$/)
  assert.deepEqual(image.buffer, png)
  assert.equal(result.html?.split(`src="cid:${image.cid}"`).length, 3)
  assert.equal(result.previewHtml?.split(`src="data:image/png;base64,${png.toString('base64')}"`).length, 3)
  assert.equal(result.previewHtml?.includes('cid:'), false)
  assert.equal(result.omittedImages, 0)
  assert.deepEqual((await readRichMailboxContent(source)).inlineImages[0], image)
})

test('removes missing, ambiguous, unsupported and mislabeled CID images without guessing', async () => {
  const result = await readRichMailboxContent(mime('<img src="cid:duplicate"><img src="cid:missing"><img src="cid:fake"><img src="cid:vector"><img src="cid:%zz">', [
    { cid: 'duplicate' }, { cid: 'duplicate' }, { cid: 'fake', content: Buffer.from('not a PNG') },
    { cid: 'vector', content: Buffer.from('<svg></svg>'), contentType: 'image/svg+xml' },
  ]))
  assert.equal(result.inlineImages.length, 0)
  assert.equal(result.omittedImages, 5)
  assert.doesNotMatch(result.html || '', /<img/)
})

test('keeps absolute external image URLs without fetching and strips all other image sources', async () => {
  const previousFetch = globalThis.fetch
  let requests = 0
  globalThis.fetch = async () => { requests += 1; throw new Error('External fetch must not happen') }
  try {
    const result = await readRichMailboxContent(mime('<img src="https://example.com/hero.png" srcset="https://tracker.example/x 2x" onerror="bad()"><img src="//example.com/logo.png"><img src="/relative.png"><img src="https://user:password@example.com/private.png">'))
    assert.ok(result.html)
    assert.match(result.html, /src="https:\/\/example.com\/hero.png"/)
    assert.match(result.html, /src="https:\/\/example.com\/logo.png"/)
    assert.doesNotMatch(result.html, /srcset|onerror|relative|password|tracker/)
    assert.equal(result.hasRemoteImages, true)
    assert.equal(result.omittedImages, 2)
    assert.equal(result.inlineImages.length, 0)
    assert.equal(requests, 0)
  } finally { globalThis.fetch = previousFetch }
})

test('plain text and absent raw MIME return an explicit plain text fallback', async () => {
  const empty = { html: null, previewHtml: null, inlineImages: [], hasRemoteImages: false, omittedImages: 0 }
  assert.deepEqual(await readRichMailboxContent(null), empty)
  assert.deepEqual(await readRichMailboxContent(Buffer.from('From: buyer@example.com\r\nContent-Type: text/plain\r\n\r\nHello')), empty)
})

test('rejects oversized raw MIME, HTML and referenced inline data with safe fixed errors', async () => {
  await assert.rejects(readRichMailboxContent(Buffer.alloc(MAX_RAW_MIME_BYTES + 1)), { code: 'MESSAGE_TOO_LARGE', status: 413 })
  await assert.rejects(readRichMailboxContent(mime(`<p>${'x'.repeat(1024 * 1024)}</p>`)), { code: 'MAILBOX_HTML_TOO_LARGE', status: 413 })
  const largeImage = Buffer.alloc(18 * 1024 * 1024 + 1)
  png.copy(largeImage)
  const source = mime('<img src="cid:large">', [{ cid: 'large', content: largeImage }])
  assert.ok(source.length < MAX_RAW_MIME_BYTES)
  await assert.rejects(readRichMailboxContent(source), { code: 'MAILBOX_INLINE_IMAGES_TOO_LARGE', status: 413 })
})

test('caps distinct inline images while deduplicating repeated references and exact bytes', async () => {
  const images = Array.from({ length: 101 }, (_, index) => ({ cid: `image-${index}`, content: Buffer.concat([png, Buffer.from([index])]) }))
  const hundred = await readRichMailboxContent(mime(images.slice(0, 100).map(image => `<img src="cid:${image.cid}">`).join(''), images))
  assert.equal(hundred.inlineImages.length, 100)
  await assert.rejects(readRichMailboxContent(mime(images.map(image => `<img src="cid:${image.cid}">`).join(''), images)), { code: 'MAILBOX_INLINE_IMAGE_LIMIT', status: 413 })
  const repeated = await readRichMailboxContent(mime('<img src="cid:same">'.repeat(101), [{ cid: 'same' }]))
  assert.equal(repeated.inlineImages.length, 1)
})

test('caps expanded preview before repeating large inline data and excludes blocked-container images', async () => {
  const largeImage = Buffer.alloc(1024 * 1024)
  png.copy(largeImage)
  await assert.rejects(readRichMailboxContent(mime('<img src="cid:repeated">'.repeat(25), [{ cid: 'repeated', content: largeImage }])), { code: 'MAILBOX_PREVIEW_TOO_LARGE', status: 413 })
  const inactive = await readRichMailboxContent(mime('<form><img src="cid:private"></form><p>Visible</p>', [{ cid: 'private' }]))
  assert.equal(inactive.inlineImages.length, 0)
  assert.doesNotMatch(inactive.html || '', /<img|<form/)
  assert.match(inactive.html || '', /Visible/)
})
