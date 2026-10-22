// Real browser Canvas/File + React integration. All HTTP/actions are local fixtures; no DB/R2.
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { build } from 'esbuild'
import postcss from 'postcss'
import tailwind from '@tailwindcss/postcss'
import sharp from 'sharp'
import { chromium } from 'playwright'

const output = resolve('output/playwright/common-product-image-compression')
await mkdir(output, { recursive: true })
const MiB = 1024 * 1024
const fixtureWidth = 3200
const fixtureHeight = 2000
const noise = Buffer.alloc(fixtureWidth * fixtureHeight * 3)
let seed = 20261022
for (let index = 0; index < noise.length; index++) {
  seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5
  noise[index] = seed & 255
}
const labels = Buffer.from(`<svg width="3200" height="2000" xmlns="http://www.w3.org/2000/svg"><rect x="100" y="100" width="3000" height="720" rx="32" fill="#fff"/><text x="180" y="240" font-family="Arial" font-size="80" fill="#134e4a">PRODUCT IMAGE COMPRESSION CHECK</text><text x="180" y="350" font-family="Arial" font-size="56" fill="#111827">Cotton work glove | Size L | Item 1234567890</text><text x="180" y="440" font-family="Arial" font-size="36" fill="#111827">Fine label 36px: ABCDEFGHIJKLMNOPQRSTUVWXYZ 0123456789</text><text x="180" y="510" font-family="Arial" font-size="24" fill="#111827">Fine label 24px: abcdefghijklmnopqrstuvwxyz 0123456789</text><text x="180" y="570" font-family="Arial" font-size="18" fill="#111827">Small label 18px: ABC abc 0123456789 - retained detail at reduced dimensions</text><path d="M180 650H3000 M180 665H3000 M180 680H3000" stroke="#111827" stroke-width="2"/><rect x="100" y="1000" width="400" height="400" fill="#ef4444"/><rect x="2700" y="1000" width="400" height="400" fill="#2563eb"/></svg>`)
const rawFixture = sharp(noise, { raw: { width: fixtureWidth, height: fixtureHeight, channels: 3 } }).composite([{ input: labels }])
const png = await rawFixture.clone().png().toBuffer()
const jpeg = await rawFixture.clone().jpeg({ quality: 100, chromaSubsampling: '4:4:4' }).toBuffer()
const oriented = await rawFixture.clone().jpeg({ quality: 100, chromaSubsampling: '4:4:4' }).withMetadata({ orientation: 6 }).toBuffer()
const alpha = await sharp({ create: { width: 2800, height: 1800, channels: 4, background: '#00000000' } }).composite([{ input: Buffer.from('<svg width="2800" height="1800" xmlns="http://www.w3.org/2000/svg"><rect x="400" y="200" width="2000" height="1400" rx="160" fill="#0f766e"/><circle cx="1400" cy="900" r="550" fill="#2dd4bf" fill-opacity=".5"/><text x="620" y="800" font-size="100" font-family="Arial" fill="white">TRANSPARENT PNG</text><text x="660" y="980" font-size="56" font-family="Arial" fill="white">Edge alpha and fine label 0123456789</text></svg>') }]).png().toBuffer()
const alphaLarge = await sharp(png).extend({ top: 100, bottom: 100, left: 100, right: 100, background: '#00000000' }).png().toBuffer()
const small = await sharp({ create: { width: 320, height: 200, channels: 4, background: '#0f766e80' } }).png().toBuffer()
const overPixels = await sharp({ create: { width: 6401, height: 6250, channels: 3, background: '#0f766e' } }).png().toBuffer()
const fixtures = new Map([
  ['large.jpg', { bytes: jpeg, type: 'image/jpeg' }],
  ['opaque.png', { bytes: png, type: 'image/png' }],
  ['orientation.jpg', { bytes: oriented, type: 'image/jpeg' }],
  ['transparent.png', { bytes: alpha, type: 'image/png' }],
  ['transparent-large.png', { bytes: alphaLarge, type: 'image/png' }],
  ['small.png', { bytes: small, type: 'image/png' }],
  ['over-pixels.png', { bytes: overPixels, type: 'image/png' }],
])
assert.ok(jpeg.length > 5 * MiB && jpeg.length <= 20 * MiB, 'Valid large JPEG exercises relaxed input limit')
assert.ok(png.length > 5 * MiB && png.length <= 20 * MiB, 'Valid opaque PNG exercises relaxed input limit')
await Promise.all([...fixtures.entries()].filter(([name]) => !name.startsWith('over-')).map(([name, { bytes }]) => writeFile(resolve(output, `before-${name}`), bytes)))

const mocks = `
export const unstable_rethrow=()=>{};
export const useRouter=()=>({push:url=>{window.__route=url},refresh:()=>{}});
export async function saveCommonQuotationProduct(input){window.__saves.push(input);return {success:true,reason:'已保存',data:{id:'c000000000000000000000001'}}}
export async function saveCommonProductImages(input){window.__saves.push(input);return {success:true,reason:'已保存'}}
export async function reimportCommonProductImages(){throw new Error('Not used')}
`
const source = `
import React,{useState} from 'react';import {createRoot} from 'react-dom/client';
import {CommonProductForm} from './src/components/admin/quotation/common-product-form';
import {CommonProductImages} from './src/components/admin/quotation/common-product-images';
import {SimpleImagePicker} from './src/components/admin/quotation/simple-image-picker';
import {prepareCommonProductImage,MAX_COMMON_PRODUCT_IMAGE_INPUT_BYTES} from './src/lib/quotation/image-compression';
window.__prepare=prepareCommonProductImage;window.__inputMax=MAX_COMMON_PRODUCT_IMAGE_INPUT_BYTES;
window.__file=async(name,override={})=>{const response=await fetch('/fixtures/'+name);return new File([await response.blob()],override.name||name,{type:override.type||response.headers.get('content-type'),lastModified:1234567890000})};
const root=createRoot(document.getElementById('root'));let version=0;
function Plain(){const [images,setImages]=useState([]);return <SimpleImagePicker images={images} onChange={setImages}/>}
window.__reset=(mode='new')=>{window.__saves=[];window.__route='';root.render(<main key={++version} className="mx-auto max-w-5xl p-6"><h1 className="mb-6 text-2xl font-semibold">常用产品图片自动压缩</h1>{mode==='new'?<CommonProductForm/>:mode==='edit'?<CommonProductImages catalogLinked={false} productId="c000000000000000000000001" updatedAt="2026-10-22T00:00:00.000Z" images={[]}/>:<Plain/>}</main>)};
window.__reset();
`
const bundle = await build({ stdin: { contents: source, resolveDir: process.cwd(), loader: 'tsx' }, bundle: true, write: false, platform: 'browser', format: 'iife', jsx: 'automatic', define: { 'process.env.NODE_ENV': '"development"' }, plugins: [{ name: 'compression-ui-fixture', setup(plugin) {
  plugin.onResolve({ filter: /^(next\/navigation|@\/actions\/admin\/(common-quotation-products|quotation-catalog))$/ }, () => ({ path: 'mock', namespace: 'fixture' }))
  plugin.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: mocks, loader: 'js', resolveDir: process.cwd() }))
  plugin.onResolve({ filter: /^next\/(link|image)$/ }, ({ path }) => ({ path, namespace: 'next-fixture' }))
  plugin.onLoad({ filter: /.*/, namespace: 'next-fixture' }, ({ path }) => ({ contents: path.endsWith('link') ? 'import React from "react";export default function Link(props){return <a {...props}/>}' : 'import React from "react";export default function Image({unoptimized,...props}){return <img {...props}/>} ', loader: 'jsx', resolveDir: process.cwd() }))
} }] })
const css = await postcss([tailwind()]).process(await readFile('src/app/globals.css', 'utf8'), { from: resolve('src/app/globals.css') })
const uploads = []
const prepared = new Map()
let activeUploads = 0
let maxActiveUploads = 0
const server = createServer(async (request, response) => {
  try {
    if (request.url === '/app.js') { response.setHeader('Content-Type', 'application/javascript'); response.end(bundle.outputFiles[0].contents) }
    else if (request.url === '/app.css') { response.setHeader('Content-Type', 'text/css'); response.end(css.css) }
    else if (request.url?.startsWith('/fixtures/')) { const fixture = fixtures.get(request.url.slice('/fixtures/'.length)); if (!fixture) { response.statusCode = 404; response.end(); return }; response.setHeader('Content-Type', fixture.type); response.end(fixture.bytes) }
    else if (request.url?.startsWith('/prepared/')) { const chunks = []; for await (const chunk of request) chunks.push(chunk); prepared.set(decodeURIComponent(request.url.slice('/prepared/'.length)), Buffer.concat(chunks)); response.end('ok') }
    else if (request.url === '/api/admin/quotation-files/upload') {
      activeUploads++; maxActiveUploads = Math.max(maxActiveUploads, activeUploads)
      try {
        const chunks = []; for await (const chunk of request) chunks.push(chunk)
        const form = await new Response(Buffer.concat(chunks), { headers: { 'content-type': request.headers['content-type'] } }).formData()
        const file = form.get('file'); const id = `11111111-1111-4111-8111-${String(uploads.length + 1).padStart(12, '0')}`
        uploads.push({ id, name: file.name, type: file.type, size: file.size, bytes: Buffer.from(await file.arrayBuffer()) })
        await new Promise(resolve => setTimeout(resolve, 40))
        response.setHeader('Content-Type', 'application/json'); response.end(JSON.stringify({ success: true, reason: 'Fixture only', data: { id, securityStatus: 'CLEAN' } }))
      } finally { activeUploads-- }
    } else if (request.url?.startsWith('/api/admin/quotation-images/')) { const id = request.url.split('/').at(-1).split('?')[0]; const upload = uploads.find(file => file.id === id); response.setHeader('Content-Type', upload?.type || 'image/png'); response.end(upload?.bytes || small) }
    else { response.setHeader('Content-Type', 'text/html; charset=utf-8'); response.end('<!doctype html><html lang="zh"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/app.css"><body style="background:#f1f5f7;font-family:Arial,Microsoft YaHei,sans-serif"><div id="root"></div><script src="/app.js"></script></body></html>') }
  } catch (error) { response.statusCode = 500; response.end(String(error)) }
})
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
const origin = `http://127.0.0.1:${server.address().port}`
const report = { helper: [], entries: [], checks: [] }
let browser
try {
  browser = await chromium.launch({ channel: 'msedge', headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } })
  const errors = []; page.on('pageerror', error => errors.push(error.message))
  await page.route('**/*', route => route.request().url().startsWith(origin) ? route.continue() : route.abort())
  await page.goto(origin)
  await page.getByLabel('产品名称', { exact: true }).waitFor()
  assert.equal(await page.evaluate(() => window.__inputMax), 20 * MiB)
  for (const name of ['large.jpg', 'opaque.png', 'transparent.png', 'transparent-large.png', 'small.png', 'orientation.jpg']) {
    const result = await page.evaluate(async name => {
      const input = await window.__file(name); const result = await window.__prepare(input)
      await fetch('/prepared/' + encodeURIComponent(name), { method: 'POST', body: result })
      const bitmap = await createImageBitmap(result)
      const info = { input: name, name: result.name, type: result.type, before: input.size, after: result.size, width: bitmap.width, height: bitmap.height, lastModified: result.lastModified }
      bitmap.close(); return info
    }, name)
    assert.ok(result.after <= 5 * MiB && result.after <= result.before)
    assert.equal(result.lastModified, 1234567890000)
    const bytes = prepared.get(name); const metadata = await sharp(bytes).metadata()
    const originalMetadata = await sharp(fixtures.get(name).bytes).metadata()
    assert.ok(Math.max(result.width, result.height) <= Math.max(originalMetadata.width, originalMetadata.height), 'Never enlarge input')
    if (!bytes.equals(fixtures.get(name).bytes)) assert.ok(Math.max(result.width, result.height) <= 2560, 'Rewritten output respects maximum starting edge')
    assert.equal(metadata.format, result.type === 'image/jpeg' ? 'jpeg' : 'png')
    assert.match(result.name, result.type === 'image/jpeg' ? /\.jpe?g$/i : /\.png$/i)
    if (name === 'small.png') { assert.deepEqual(bytes, small); assert.equal(result.width, 320); assert.equal(result.height, 200) }
    if (name === 'large.jpg' || name === 'opaque.png') assert.ok(result.after < result.before * .65, `${name}: meaningful reduction`)
    if (name === 'opaque.png') assert.equal(result.type, 'image/jpeg', 'Opaque noisy PNG should benefit from high quality JPEG')
    if (name.startsWith('transparent')) {
      assert.equal(result.type, 'image/png'); assert.equal(metadata.hasAlpha, true)
      const { data } = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
      assert.equal(data[3], 0, 'Transparent corner remains transparent')
      assert.ok(data.some((value, index) => index % 4 === 3 && value > 0 && value < 255), 'Antialiased edge alpha remains')
      if (name === 'transparent-large.png') assert.ok(result.after < result.before * .65, 'Large transparent PNG really rewrites pixels with alpha')
    }
    if (name === 'orientation.jpg') { assert.equal(result.width, 1600); assert.equal(result.height, 2560); assert.ok(!metadata.orientation || metadata.orientation === 1, 'Orientation baked into rewritten pixels') }
    await writeFile(resolve(output, `after-${name.replace(/\.[^.]+$/, '')}.${result.type === 'image/jpeg' ? 'jpg' : 'png'}`), bytes)
    report.helper.push(result)
  }
  assert.deepEqual(await page.evaluate(async () => {
    const result = await window.__prepare(await window.__file('small.png', { name: 'wrong-extension.jpg' }))
    return { name: result.name, type: result.type, size: result.size }
  }), { name: 'wrong-extension.png', type: 'image/png', size: small.length })

  const fallback = await page.evaluate(async () => {
    const originalDecode = window.createImageBitmap; const originalCreateUrl = URL.createObjectURL; const originalRevokeUrl = URL.revokeObjectURL
    const created = []; const revoked = []
    window.createImageBitmap = undefined
    URL.createObjectURL = (...args) => { const url = originalCreateUrl(...args); created.push(url); return url }
    URL.revokeObjectURL = url => { revoked.push(url); originalRevokeUrl(url) }
    try {
      const result = await window.__prepare(await window.__file('orientation.jpg')); const bitmap = await originalDecode(result)
      const info = { width: bitmap.width, height: bitmap.height, size: result.size, created, revoked }; bitmap.close(); return info
    } finally { window.createImageBitmap = originalDecode; URL.createObjectURL = originalCreateUrl; URL.revokeObjectURL = originalRevokeUrl }
  })
  assert.equal(fallback.width, 1600); assert.equal(fallback.height, 2560); assert.ok(fallback.size <= 5 * MiB)
  assert.equal(fallback.created.length, 1); assert.deepEqual(fallback.revoked, fallback.created)
  report.checks.push('Image-element fallback preserves EXIF orientation and revokes its object URL')

  for (const kind of ['empty', 'unsupported', 'oversize', 'corrupt', 'pixels']) {
    const error = await page.evaluate(async kind => {
      const file = kind === 'pixels' ? await window.__file('over-pixels.png') : new File([kind === 'corrupt' ? new Uint8Array([137,80,78,71,13,10,26,10,0,0,0,0]) : new Uint8Array(kind === 'empty' ? 0 : kind === 'oversize' ? 20 * 1024 * 1024 + 1 : 64)], 'invalid.png', { type: kind === 'unsupported' ? 'image/gif' : 'image/png' })
      try { await window.__prepare(file); return null } catch (error) { return error.message }
    }, kind)
    assert.ok(error, `${kind} rejected`); report.checks.push({ kind, error })
  }
  for (const mode of ['null', 'oversize']) {
    const result = await page.evaluate(async mode => {
      const original = HTMLCanvasElement.prototype.toBlob
      HTMLCanvasElement.prototype.toBlob = function (callback, type) { callback(mode === 'null' ? null : new Blob([new Uint8Array(6 * 1024 * 1024)], { type: type || 'image/png' })) }
      try { await window.__prepare(await window.__file('large.jpg')); return null } catch (error) { return error.message } finally { HTMLCanvasElement.prototype.toBlob = original }
    }, mode)
    assert.ok(result, `${mode} encoder result rejected`); report.checks.push({ kind: `encode-${mode}`, error: result })
  }

  const reset = async (mode = 'new') => {
    await page.evaluate(mode => window.__reset(mode), mode)
    await page.locator('[data-image-picker]').waitFor()
    if (mode === 'new') await page.getByLabel('产品名称', { exact: true }).fill('自动压缩测试产品')
  }
  const save = () => page.getByRole('button', { name: '保存常用产品', exact: true })
  const cards = page.locator('[data-image-key]')
  const order = () => cards.evaluateAll(nodes => nodes.map(node => node.dataset.imageKey))
  const emit = async (type, names, duplicate = false) => page.locator('[data-image-picker]').evaluate(async (node, { type, names, duplicate }) => {
    const transfer = new DataTransfer()
    for (const name of names) transfer.items.add(name === 'corrupt.png' ? new File([new Uint8Array([137,80,78,71,13,10,26,10,0,0,0,0])], name, { type: 'image/png' }) : await window.__file(name))
    const event = type === 'paste' ? new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: transfer }) : new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: transfer })
    node.dispatchEvent(event)
    if (duplicate) node.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: transfer }))
    return event.defaultPrevented
  }, { type, names, duplicate })
  await reset()
  const firstUpload = uploads.length
  await page.locator('input[type=file]').setInputFiles({ name: 'selected-large.jpg', mimeType: 'image/jpeg', buffer: jpeg })
  await page.waitForFunction(() => document.querySelectorAll('[data-image-key]').length === 1)
  assert.equal(uploads.length, firstUpload + 1)
  assert.ok(uploads.at(-1).size < jpeg.length * .65)
  report.entries.push({ entry: 'select', inputBytes: jpeg.length, outputBytes: uploads.at(-1).size })

  // Hold browser decoding to inspect the true processing stage, before any HTTP upload.
  await page.evaluate(() => {
    window.__realCreateImageBitmap = window.createImageBitmap
    window.createImageBitmap = async (...args) => { await new Promise(resolve => { window.__releaseDecode = resolve }); return window.__realCreateImageBitmap(...args) }
  })
  const beforeBusy = uploads.length
  await emit('paste', ['opaque.png'], true)
  await page.waitForFunction(() => Boolean(window.__releaseDecode))
  await page.getByRole('status').filter({ hasText: /处理|压缩|优化/ }).waitFor()
  assert.equal(uploads.length, beforeBusy, 'No upload before compression ends')
  assert.equal(await save().isDisabled(), true)
  assert.equal(await page.locator('input[type=file]').isDisabled(), true)
  assert.equal(await page.getByRole('button', { name: '移除图片 1', exact: true }).isDisabled(), true)
  assert.equal(await page.getByRole('button', { name: '后移图片 1', exact: true }).isDisabled(), true)
  assert.equal(await cards.first().evaluate(node => node.draggable), false)
  await page.locator('form').evaluate(node => { node.requestSubmit(); node.requestSubmit() })
  assert.deepEqual(await page.evaluate(() => window.__saves), [])
  await page.screenshot({ path: resolve(output, 'processing-desktop.png'), fullPage: true, animations: 'disabled' })
  await page.evaluate(() => { window.createImageBitmap = window.__realCreateImageBitmap; window.__releaseDecode() })
  await page.waitForFunction(() => document.querySelectorAll('[data-image-key]').length === 2)
  assert.equal(uploads.length, beforeBusy + 1, 'Overlapping paste and drop produce one upload')
  assert.ok(uploads.at(-1).size < png.length * .65)
  report.entries.push({ entry: 'paste', inputBytes: png.length, outputBytes: uploads.at(-1).size })
  await emit('drop', ['large.jpg'])
  await page.waitForFunction(() => document.querySelectorAll('[data-image-key]').length === 3)
  assert.ok(uploads.at(-1).size < jpeg.length * .65)
  report.entries.push({ entry: 'drop', inputBytes: jpeg.length, outputBytes: uploads.at(-1).size })
  await page.getByRole('status').filter({ hasText: /体积减少/ }).waitFor()
  assert.match(await page.getByRole('status').filter({ hasText: /体积减少/ }).innerText(), /本次已上传 1 张图片.*→.*83%/)
  await page.screenshot({ path: resolve(output, 'success-desktop.png'), fullPage: true, animations: 'disabled' })
  await page.setViewportSize({ width: 390, height: 844 })
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true)
  await page.screenshot({ path: resolve(output, 'success-mobile.png'), fullPage: true, animations: 'disabled' })
  await page.setViewportSize({ width: 1440, height: 1100 })
  await page.getByRole('button', { name: '前移图片 3', exact: true }).click()
  const beforePartialOrder = await order()
  const beforePartialRequests = uploads.length
  await emit('drop', ['small.png', 'corrupt.png', 'transparent.png'])
  await page.getByRole('alert').filter({ hasText: 'corrupt.png' }).waitFor()
  await page.waitForFunction(() => document.querySelectorAll('[data-image-key]').length === 5)
  assert.equal(uploads.length, beforePartialRequests + 2, 'Decode failure never uploads and later files continue')
  assert.deepEqual((await order()).slice(0, 3), beforePartialOrder)
  assert.equal(await save().isEnabled(), true)
  await page.getByRole('button', { name: '前移图片 5', exact: true }).click()
  const finalIds = (await order()).map(key => key.slice('source-'.length))
  await page.screenshot({ path: resolve(output, 'completed-desktop.png'), fullPage: true, animations: 'disabled' })
  await page.setViewportSize({ width: 390, height: 844 })
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true)
  await page.screenshot({ path: resolve(output, 'completed-mobile.png'), fullPage: true, animations: 'disabled' })
  await save().click(); await page.waitForFunction(() => window.__saves.length === 1)
  assert.deepEqual(await page.evaluate(() => window.__saves[0].sourceIds), finalIds)

  await reset('new')
  await page.evaluate(() => { window.__realToBlob = HTMLCanvasElement.prototype.toBlob; HTMLCanvasElement.prototype.toBlob = function (callback) { callback(null) } })
  const beforeEncodeFailure = uploads.length
  await emit('drop', ['large.jpg'])
  await page.getByRole('alert').waitFor()
  assert.equal(uploads.length, beforeEncodeFailure)
  assert.equal(await save().isEnabled(), true, 'Encode failure releases parent save lock')
  assert.equal(await page.locator('input[type=file]').isEnabled(), true)
  await page.evaluate(() => { HTMLCanvasElement.prototype.toBlob = window.__realToBlob })

  await reset('edit')
  await emit('paste', ['opaque.png'])
  await page.waitForFunction(() => document.querySelectorAll('[data-image-key]').length === 1)
  assert.ok(uploads.at(-1).size < png.length * .65, 'Edit workflow also enables compression')
  await page.getByRole('button', { name: '保存图片', exact: true }).click()
  await page.waitForFunction(() => window.__saves.length === 1)

  await reset('plain')
  assert.equal(await page.getByRole('button', { name: '粘贴或拖拽上传图片', exact: true }).count(), 0)
  const beforePlain = uploads.length
  await page.locator('input[type=file]').setInputFiles({ name: 'ordinary-large.jpg', mimeType: 'image/jpeg', buffer: jpeg })
  await page.getByRole('alert').filter({ hasText: '5 MB' }).waitFor()
  assert.equal(uploads.length, beforePlain, 'Default shared picker retains 5 MiB original limit')
  await page.locator('input[type=file]').setInputFiles({ name: 'ordinary.png', mimeType: 'image/png', buffer: alpha })
  await page.waitForFunction(() => document.querySelectorAll('[data-image-key]').length === 1)
  assert.deepEqual(uploads.at(-1).bytes, alpha, 'Default shared picker uploads original bytes')
  assert.equal(maxActiveUploads, 1)
  assert.deepEqual(errors, [])
  report.checks.push('All three entries compress', 'Processing blocks save/reorder/remove/duplicate intake', 'Partial decode failures preserve order and subsequent successes', 'Canvas failures release busy', 'Edit enabled; default shared picker unchanged', '390px no overflow', 'All HTTP/actions isolated')
  await writeFile(resolve(output, 'report.json'), JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report, null, 2))
  console.log('PASS: real Canvas/File compression, MIME/extensions, alpha, byte retention, no upscale, EXIF rotation, input/decode/encode guards, select/paste/drop, processing/save locks, partial success/order, edit and default-picker regressions.')
} finally { await browser?.close(); await new Promise(resolve => server.close(resolve)) }
