// Real creation form and image picker with isolated action/upload fixtures; no DB/storage.
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { mkdir, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { build } from 'esbuild'
import postcss from 'postcss'
import tailwind from '@tailwindcss/postcss'
import sharp from 'sharp'
import { chromium } from 'playwright'

const mocks = `
export const unstable_rethrow=()=>{};
export const useRouter=()=>({push:url=>{window.__route=url},refresh:()=>{window.__refreshes=(window.__refreshes||0)+1}});
export async function saveCommonQuotationProduct(input){
 window.__saves.push(input);
 if(window.__holdSave)await new Promise(resolve=>{window.__releaseSave=resolve});
 if(window.__saveFailure==='throw')throw new Error('Uncertain fixture network');
 if(window.__saveFailure==='malformed')return {success:true,data:{id:'invalid'}};
 if(window.__saveFailure)return {success:false,code:window.__saveFailure,reason:'模拟图片关联失败，请检查后重试'};
 return {success:true,reason:'保存完成',data:{id:'c000000000000000000000001'}};
}
`
const source = `
import React from 'react';import {createRoot} from 'react-dom/client';
import {CommonProductForm} from './src/components/admin/quotation/common-product-form';
const root=createRoot(document.getElementById('root'));let version=0;
window.__reset=(edit=false)=>{window.__saves=[];window.__saveFailure='';window.__holdSave=false;window.__route='';root.render(<main key={++version} className="mx-auto max-w-5xl p-6"><h1 className="mb-6 text-2xl font-semibold">添加常用产品</h1><CommonProductForm initialValue={edit?{id:'c000000000000000000000001',expectedUpdatedAt:'2026-10-08T01:00:00.000Z',name:'Existing product',description:'',unit:'pcs',unitPrice:'1',currency:'USD',active:true}:undefined}/></main>)};
window.__reset();
`
const bundle = await build({ stdin: { contents: source, resolveDir: process.cwd(), loader: 'tsx' }, bundle: true, write: false, platform: 'browser', format: 'iife', jsx: 'automatic', define: { 'process.env.NODE_ENV': '"development"' }, plugins: [{ name: 'create-ui-fixture', setup(plugin) {
  plugin.onResolve({ filter: /^(next\/navigation|@\/actions\/admin\/common-quotation-products)$/ }, () => ({ path: 'mock', namespace: 'fixture' }))
  plugin.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: mocks, loader: 'js', resolveDir: process.cwd() }))
  plugin.onResolve({ filter: /^next\/(link|image)$/ }, ({ path }) => ({ path, namespace: 'next-fixture' }))
  plugin.onLoad({ filter: /.*/, namespace: 'next-fixture' }, ({ path }) => ({ contents: path.endsWith('link') ? 'import React from "react";export default function Link(props){return <a {...props}/>}' : 'import React from "react";export default function Image({unoptimized,...props}){return <img {...props}/>} ', loader: 'jsx', resolveDir: process.cwd() }))
} }] })
const css = await postcss([tailwind()]).process(await readFile('src/app/globals.css', 'utf8'), { from: resolve('src/app/globals.css') })
const png = await sharp({ create: { width: 80, height: 80, channels: 3, background: '#0f766e' } }).png().toBuffer()
const uploads = []
let uploadGate = Promise.resolve()
let releaseUpload
let failUpload = false
const server = createServer(async (request, response) => {
  if (request.url === '/app.js') { response.setHeader('Content-Type', 'application/javascript'); response.end(bundle.outputFiles[0].contents) }
  else if (request.url === '/app.css') { response.setHeader('Content-Type', 'text/css'); response.end(css.css) }
  else if (request.url === '/api/admin/quotation-files/upload') {
    const chunks = []; for await (const chunk of request) chunks.push(chunk)
    const form = await new Response(Buffer.concat(chunks), { headers: { 'content-type': request.headers['content-type'] } }).formData()
    const file = form.get('file'); uploads.push(file.name)
    await uploadGate
    response.setHeader('Content-Type', 'application/json')
    response.statusCode = failUpload ? 500 : 200
    response.end(JSON.stringify(failUpload ? { success: false, reason: '模拟图片上传失败' } : { success: true, reason: 'Uploaded fixture', data: { id: `11111111-1111-4111-8111-${String(uploads.length).padStart(12, '0')}`, securityStatus: 'CLEAN' } }))
  } else if (request.url?.startsWith('/api/admin/quotation-images/')) { response.setHeader('Content-Type', 'image/png'); response.end(png) }
  else { response.setHeader('Content-Type', 'text/html; charset=utf-8'); response.end('<!doctype html><html lang="zh"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/app.css"><body style="background:#f1f5f7;font-family:Arial,Microsoft YaHei,sans-serif"><div id="root"></div><script src="/app.js"></script></body></html>') }
})
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
const origin = `http://127.0.0.1:${server.address().port}`
await mkdir('output/playwright/common-product-create', { recursive: true })
let browser
try {
  browser = await chromium.launch({ channel: 'msedge', headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } })
  const errors = []; page.on('pageerror', error => errors.push(error.message))
  await page.route('**/*', route => route.request().url().startsWith(origin) ? route.continue() : route.abort())
  await page.goto(origin)
  const save = () => page.getByRole('button', { name: '保存常用产品', exact: true })
  const reset = async (edit = false) => { await page.evaluate(edit => window.__reset(edit), edit); await page.getByLabel('产品名称', { exact: true }).waitFor(); await page.getByLabel('产品名称', { exact: true }).fill(edit ? 'Existing product' : '手动录入防护手套') }
  await reset()
  assert.equal(await page.getByRole('heading', { name: '常用产品图片', exact: true }).count(), 1)
  assert.equal(await page.getByText('先保存产品资料，随后在编辑页上传产品图片。', { exact: true }).count(), 0)
  assert.equal(await page.locator('input[type=file]').evaluate(node => node.multiple), true)
  await page.getByLabel('商品来源（仅内部）', { exact: true }).fill('供应商采购链接')
  await page.getByLabel('成本价（多行文本，仅内部）', { exact: true }).fill('100件：￥12/件\n500件：￥10/件')
  await page.getByLabel('规格', { exact: true }).fill('Material: Cotton\nSize: L')
  uploadGate = new Promise(resolve => { releaseUpload = resolve })
  await page.locator('input[type=file]').setInputFiles([{ name: 'first.png', mimeType: 'image/png', buffer: png }, { name: 'second.png', mimeType: 'image/png', buffer: png }])
  await page.getByRole('status').filter({ hasText: /上传/ }).first().waitFor()
  assert.equal(await save().isDisabled(), true)
  await page.locator('form').evaluate(node => { node.requestSubmit(); node.requestSubmit() })
  assert.deepEqual(await page.evaluate(() => window.__saves), [], 'Upload blocks final save including programmatic submit')
  releaseUpload(); uploadGate = Promise.resolve()
  await page.waitForFunction(() => document.querySelectorAll('[data-image-key]').length === 2)
  assert.equal(await save().isEnabled(), true)
  const idsBeforeSort = await page.locator('[data-image-key]').evaluateAll(nodes => nodes.map(node => node.dataset.imageKey.slice('source-'.length)))
  await page.getByRole('button', { name: '前移图片 2', exact: true }).click()
  const orderedIds = idsBeforeSort.toReversed()
  await page.screenshot({ path: 'output/playwright/common-product-create/new-desktop.png', fullPage: true, animations: 'disabled' })
  await page.setViewportSize({ width: 390, height: 844 })
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true)
  await page.screenshot({ path: 'output/playwright/common-product-create/new-mobile.png', fullPage: true, animations: 'disabled' })
  await page.evaluate(() => { window.__saveFailure = 'FILE_NOT_CLEAN' })
  await save().click(); await page.getByRole('alert').filter({ hasText: '模拟图片关联失败' }).waitFor()
  assert.equal(await page.getByLabel('产品名称', { exact: true }).inputValue(), '手动录入防护手套')
  assert.equal(await page.locator('[data-image-key]').count(), 2)
  assert.deepEqual(await page.evaluate(() => window.__saves[0].sourceIds), orderedIds)
  assert.equal(await save().isEnabled(), true)
  await page.screenshot({ path: 'output/playwright/common-product-create/known-failure-mobile.png', fullPage: true, animations: 'disabled' })
  await page.evaluate(() => { window.__saveFailure = ''; window.__holdSave = true })
  await page.locator('form').evaluate(node => { node.requestSubmit(); node.requestSubmit() })
  await page.getByRole('button', { name: '保存中…', exact: true }).waitFor()
  assert.equal(await page.locator('input[type=file]').isDisabled(), true)
  assert.equal(await page.evaluate(() => window.__saves.length), 2, 'One retry sends one final product action')
  await page.evaluate(() => window.__releaseSave())
  await page.waitForFunction(() => window.__route === '/admin/quotation-products/c000000000000000000000001')
  assert.deepEqual(await page.evaluate(() => window.__saves[1].sourceIds), orderedIds)
  assert.equal(await page.evaluate(() => window.__saves[1].productSource), '供应商采购链接')
  assert.equal(await page.evaluate(() => window.__saves[1].costPriceText), '100件：￥12/件\n500件：￥10/件')
  for (const failure of ['INTERNAL_ERROR', 'throw', 'malformed']) {
    await reset(); await page.evaluate(failure => { window.__saveFailure = failure }, failure)
    await save().click(); await page.getByRole('alert').waitFor()
    assert.match(await page.getByRole('alert').innerText(), /确认|重复|列表/)
    assert.equal(await save().isDisabled(), true)
    await page.locator('form').evaluate(node => node.requestSubmit())
    assert.equal(await page.evaluate(() => window.__saves.length), 1)
    assert.equal(await page.getByRole('link', { name: /查看常用产品/ }).count(), 1)
  }
  await reset(); failUpload = true
  await page.locator('input[type=file]').setInputFiles({ name: 'failed.png', mimeType: 'image/png', buffer: png })
  await page.getByRole('alert').filter({ hasText: '模拟图片上传失败' }).waitFor()
  assert.equal(await page.locator('[data-image-key]').count(), 0)
  assert.equal(await page.getByLabel('产品名称', { exact: true }).inputValue(), '手动录入防护手套')
  failUpload = false
  await save().click(); await page.waitForFunction(() => window.__route !== '')
  assert.deepEqual(await page.evaluate(() => window.__saves[0].sourceIds), [])
  await reset(true)
  assert.equal(await page.locator('[data-image-picker]').count(), 0, 'Existing edit retains separate image workflow')
  await save().click(); await page.waitForFunction(() => window.__saves.length === 1)
  assert.equal(await page.evaluate(() => Object.hasOwn(window.__saves[0], 'sourceIds')), false)
  assert.deepEqual(errors, [])
  console.log('PASS: new form images appear before save, multi-upload/order, upload/save immediate guards, known failure selection retention, one final metadata+sourceIds action, uncertain outcome lock, optional images/edit omission and 390px layout. Isolated I/O only.')
} finally { await browser?.close(); await new Promise(resolve => server.close(resolve)) }
