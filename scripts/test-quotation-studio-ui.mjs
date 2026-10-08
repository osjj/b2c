// Real React forms, isolated action/HTTP fixtures: no .env, database, R2 or AI.
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
export const useRouter=()=>({push:route=>{window.__route=route},refresh:()=>{window.dispatchEvent(new Event('fixture-refresh'))}});
export const usePathname=()=>'/admin/business-customers';
export async function saveQuotationCustomer(input){window.__customer=input;return {success:true,reason:'已保存'}}
export async function saveCommonQuotationProduct(input){window.__product=input;if(!input.id||input.id===window.__formProduct?.id){window.__formVersion=(window.__formVersion||0)+1;window.__formProduct={...input,id:'cmockproduct00000000000000',expectedUpdatedAt:new Date(Date.UTC(2026,9,8,0,0,window.__formVersion)).toISOString()}}return {success:true,data:{id:'cmockproduct00000000000000'}}}
export async function saveCommonProductImages(input){window.__imageInput=input;await new Promise(resolve=>setTimeout(resolve,600));window.__savedImageIds=input.sourceIds;window.__imageVersion=new Date(new Date(input.updatedAt).getTime()+1000).toISOString();return {success:true,reason:'产品图片已保存'}}
export async function reimportCommonProductImages(input){window.__reimageInput=input;await new Promise(resolve=>setTimeout(resolve,600));if(window.__reimageFail)return {success:false,code:'INTERNAL_ERROR',reason:'模拟导入失败，原图片已保留'};const images=[4,5].map(n=>({id:'00000000-0000-4000-8000-'+String(n).padStart(12,'0'),kind:'source',name:'Fresh catalog '+n}));window.__savedImageIds=images.map(image=>image.id);window.__imageVersion='2026-10-05T00:00:00.000Z';return {success:true,reason:'商城主图已重新导入',data:{id:input.id,updatedAt:window.__imageVersion,images}}}
export async function saveQuotationSettings(input){window.__settings=input;return {success:true,reason:'设置已保存'}}
export async function searchQuotationCatalog(){return {success:true,data:[{id:'cmockcatalog00000000000000',name:'Catalog Fixture',unitPrice:'12.50',unitCost:'7.25',updatedAt:'2026-09-06T00:00:00.000Z',imageIds:['fixture-image']}]}}
export async function importQuotationCatalogProduct(input){window.__import=input;return {success:true,data:{id:'cmockproduct00000000000000'}}}
`
const bundle = await build({ stdin: { contents: `
import React,{useState,useEffect} from 'react';import {createRoot} from 'react-dom/client';
import {CustomerForm} from './src/components/admin/quotation/customer-form';
import {CommonProductForm} from './src/components/admin/quotation/common-product-form';
import {CommonProductImages} from './src/components/admin/quotation/common-product-images';
import {SimpleImagePicker} from './src/components/admin/quotation/simple-image-picker';
import {QuotationSettingsForm} from './src/components/admin/quotation/settings-form';
import {CatalogImport} from './src/components/admin/quotation/catalog-import';
import {WorkbenchHeader} from './src/components/admin/quotation/workbench-header';
import {defaultWorkbenchSettings} from './src/lib/quotation/workbench-config';
const importedProduct={id:'cmockproduct00000000000000',expectedUpdatedAt:'2026-09-06T00:00:00.000Z',name:'Imported fixture',productSource:'Supplier / https://supplier.example/item',costPriceText:'100 pcs: $8.25\\n500 pcs: $7.50',specifications:'Material: Cotton',description:'Imported description',packaging:'',unitCost:'8.25',unitPrice:'12.50',unit:'pcs',currency:'USD',active:true};
const imageFixture=[1,2,3].map(n=>({id:'00000000-0000-4000-8000-'+String(n).padStart(12,'0'),kind:'source',name:'Fixture '+n}));
const allImageFixture=[...imageFixture,...[4,5].map(n=>({id:'00000000-0000-4000-8000-'+String(n).padStart(12,'0'),kind:'source',name:'Fresh catalog '+n}))];
function PickerFixture({disabled=false}){const [images,setImages]=useState(imageFixture);return <SimpleImagePicker key={String(disabled)} images={images} onChange={setImages} disabled={disabled} sortable={disabled}/>}
function App(){const [page,setPage]=useState('客户');const [refreshes,setRefreshes]=useState(0);useEffect(()=>{const refresh=()=>setRefreshes(n=>n+1);window.addEventListener('fixture-refresh',refresh);return ()=>window.removeEventListener('fixture-refresh',refresh)},[]);const savedImages=(window.__savedImageIds||imageFixture.map(image=>image.id)).map(id=>allImageFixture.find(image=>image.id===id)||{id,kind:'source',name:'Uploaded fixture'});return <main data-refreshes={refreshes} className="mx-auto max-w-7xl space-y-6 p-6"><p>隔离表单测试 · 不连接数据库</p><nav>{['客户','产品','编辑产品','设置','导入','图片','普通图片','禁用图片','未关联图片'].map(p=><button className="mr-3 rounded border px-4 py-2" onClick={()=>setPage(p)} key={p}>{p}</button>)}</nav><WorkbenchHeader title={page} description="Quotation studio local review"/>{page==='客户'?<CustomerForm/>:page==='产品'||page==='编辑产品'?<CommonProductForm key={page==='产品'?page+'-'+(window.__formVersion||0):page} initialValue={page==='编辑产品'?importedProduct:window.__formProduct}/>:page==='设置'?<QuotationSettingsForm initialValue={defaultWorkbenchSettings}/>:page==='图片'||page==='未关联图片'?<CommonProductImages key={page} catalogLinked={page==='图片'} productId="cmockproduct00000000000000" updatedAt={window.__imageVersion||'2026-09-06T00:00:00.000Z'} images={savedImages}/>:page==='普通图片'||page==='禁用图片'?<PickerFixture key={page} disabled={page==='禁用图片'}/>:<CatalogImport/>}</main>}
createRoot(document.getElementById('root')).render(<App/>);
`, resolveDir: process.cwd(), loader: 'tsx' }, bundle: true, write: false, platform: 'browser', format: 'iife', jsx: 'automatic', define: { 'process.env.NODE_ENV': '"development"' }, plugins: [{ name: 'isolated-forms', setup(plugin) {
  plugin.onResolve({ filter: /^(next\/navigation|@\/actions\/admin\/(quotation-customers|common-quotation-products|quotation-settings|quotation-catalog))$/ }, () => ({ path: 'mock', namespace: 'fixture' }))
  plugin.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: mocks, loader: 'js', resolveDir: process.cwd() }))
  for (const kind of ['link', 'image']) {
    plugin.onResolve({ filter: new RegExp('^next/' + kind + '$') }, () => ({ path: kind, namespace: kind }))
    plugin.onLoad({ filter: /.*/, namespace: kind }, () => ({ contents: kind === 'link' ? 'import React from "react";export default function Link(props){return <a {...props}/>}' : 'import React from "react";export default function Image({unoptimized,...props}){return <img {...props}/>} ', loader: 'jsx', resolveDir: process.cwd() }))
  }
} }] })
const css = await postcss([tailwind()]).process(await readFile('src/app/globals.css', 'utf8'), { from: resolve('src/app/globals.css') })
const png = await sharp({ create: { width: 80, height: 80, channels: 4, background: '#0f766e' } }).png().toBuffer()
const jpeg = await sharp(png).jpeg().toBuffer()
const uploadRequests = []
const uploadBehaviors = []
let activeUploads = 0
let maxActiveUploads = 0
const server = createServer(async (request, response) => {
  if (request.url === '/') { response.setHeader('Content-Type', 'text/html; charset=utf-8'); response.end('<!doctype html><html lang="zh"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/app.css"><body style="background:#f1f5f7;font-family:Arial,Microsoft YaHei,sans-serif"><div id="root"></div><script src="/app.js"></script></body></html>') }
  else if (request.url === '/app.js') { response.setHeader('Content-Type', 'application/javascript'); response.end(bundle.outputFiles[0].contents) }
  else if (request.url === '/app.css') { response.setHeader('Content-Type', 'text/css'); response.end(css.css) }
  else if (request.url === '/api/admin/quotation-files/upload') {
    activeUploads++; maxActiveUploads = Math.max(maxActiveUploads, activeUploads)
    try {
      const chunks = []
      for await (const chunk of request) chunks.push(chunk)
      const form = await new Response(Buffer.concat(chunks), { headers: { 'content-type': request.headers['content-type'] } }).formData()
      const file = form.get('file')
      uploadRequests.push({ name: file.name, type: file.type, size: file.size })
      const behavior = uploadBehaviors.shift() || {}
      await new Promise(resolve => setTimeout(resolve, 120))
      response.statusCode = behavior.status || 200
      response.setHeader('Content-Type', behavior.html ? 'text/html' : 'application/json')
      response.end(behavior.html ? '<html>Login fixture</html>' : JSON.stringify(behavior.fail ? { success: false, reason: '模拟上传失败' } : { success: true, reason: 'fixture', data: { id: behavior.id || `11111111-1111-4111-8111-${String(uploadRequests.length).padStart(12, '0')}`, securityStatus: behavior.securityStatus || 'CLEAN' } }))
    } finally { activeUploads-- }
  }
  else if (request.url?.startsWith('/api/admin/quotation-images/')) { response.setHeader('Content-Type', 'image/png'); response.end(png) }
  else { response.statusCode = 404; response.end() }
})
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
const origin = `http://127.0.0.1:${server.address().port}`
let browser
try {
  browser = await chromium.launch({ channel: 'msedge', headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } })
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.route('**/*', route => route.request().url().startsWith(origin) ? route.continue() : route.abort())
  await page.goto(origin); await page.waitForLoadState('networkidle')
  await page.getByLabel('客户名字 *').fill('Name-only fixture')
  await page.getByRole('button', { name: '保存客户', exact: true }).click()
  await page.waitForFunction(() => Boolean(window.__customer))
  assert.equal((await page.evaluate(() => window.__customer)).name, 'Name-only fixture')
  assert.equal(await page.evaluate(() => window.__route), '/admin/business-customers')
  await page.getByLabel('公司', { exact: true }).fill('Optional company')
  await page.getByLabel('性别').selectOption('FEMALE')
  await page.getByLabel('国家', { exact: true }).fill('Jordan')
  await page.getByLabel('邮箱', { exact: true }).fill('fixture@example.com')
  await page.getByLabel('电话 / WhatsApp').fill('+000 fixture')
  await page.getByRole('button', { name: '保存客户', exact: true }).click()
  await page.waitForFunction(() => window.__customer?.company === 'Optional company')
  assert.equal(await page.evaluate(() => window.__customer.gender), 'FEMALE')
  await mkdir('tmp/pdfs/studio-review', { recursive: true })
  await page.screenshot({ path: 'tmp/pdfs/studio-review/customer-ui.png', fullPage: true })
  await page.getByRole('button', { name: '产品', exact: true }).click()
  await page.getByLabel('产品名称', { exact: true }).fill('Workwear fixture')
  await page.getByLabel('商品来源（仅内部）', { exact: true }).fill('  供应商测试 / https://supplier.example/item  ')
  await page.getByLabel('成本价（多行文本，仅内部）', { exact: true }).fill('  100件：￥12/件\n500件：￥10/件  ')
  await page.getByLabel('规格', { exact: true }).fill('Material: Cotton\nColor: Navy')
  await page.getByLabel('描述备注', { exact: true }).fill('Customer description')
  await page.getByLabel('包装信息', { exact: true }).fill('20 pcs/carton')
  assert.equal(await page.getByLabel('成本价（仅内部，与单价同币种）').count(), 0)
  await page.getByLabel('默认报价单价').fill('12.50')
  await page.getByRole('button', { name: '保存常用产品', exact: true }).click()
  await page.waitForFunction(() => Boolean(window.__product))
  const product = await page.evaluate(() => window.__product)
  assert.equal(product.productSource, '供应商测试 / https://supplier.example/item')
  assert.equal(product.costPriceText, '100件：￥12/件\n500件：￥10/件')
  const sourceBounds = await page.getByLabel('商品来源（仅内部）', { exact: true }).boundingBox()
  const costBounds = await page.getByLabel('成本价（多行文本，仅内部）', { exact: true }).boundingBox()
  assert.ok(costBounds.y > sourceBounds.y + sourceBounds.height)
  await mkdir('output/playwright/product-source', { recursive: true })
  await page.screenshot({ path: 'output/playwright/product-source/quotation-source.png', fullPage: true })
  await page.getByLabel('商品来源（仅内部）', { exact: true }).fill('')
  await page.getByRole('button', { name: '保存常用产品', exact: true }).click()
  await page.waitForFunction(() => window.__product?.productSource === null)
  assert.equal(await page.evaluate(() => window.__product.costPriceText), '100件：￥12/件\n500件：￥10/件')
  await page.getByLabel('成本价（多行文本，仅内部）', { exact: true }).fill('')
  await page.getByRole('button', { name: '保存常用产品', exact: true }).click()
  await page.waitForFunction(() => window.__product?.costPriceText === null)
  assert.equal(product.unitCost, null); assert.equal(product.packaging, '20 pcs/carton'); assert.equal(product.description, 'Customer description')
  await page.getByRole('button', { name: '编辑产品', exact: true }).click()
  assert.equal(await page.getByLabel('商品来源（仅内部）', { exact: true }).inputValue(), 'Supplier / https://supplier.example/item')
  assert.equal(await page.getByLabel('成本价（多行文本，仅内部）', { exact: true }).inputValue(), '100 pcs: $8.25\n500 pcs: $7.50')
  assert.equal(await page.getByLabel('成本价（仅内部，与单价同币种）').count(), 0)
  await page.getByLabel('包装信息', { exact: true }).fill('20 pcs/carton')
  await page.getByRole('button', { name: '保存常用产品', exact: true }).click()
  await page.waitForFunction(() => window.__product?.id === 'cmockproduct00000000000000')
  const editedProduct = await page.evaluate(() => window.__product)
  assert.equal(editedProduct.unitCost, '8.25'); assert.equal(editedProduct.productSource, 'Supplier / https://supplier.example/item'); assert.equal(editedProduct.costPriceText, '100 pcs: $8.25\n500 pcs: $7.50')
  await page.screenshot({ path: 'output/playwright/product-source/quotation-import-edit.png', fullPage: true })
  await page.getByRole('button', { name: '设置', exact: true }).click()
  for (const [label, value] of [['联系方式（右侧）', 'Contact fixture'], ['地址（左侧）', 'Address fixture'], ['网站（右侧）', 'https://example.com'], ['邮箱（右侧）', 'fixture@example.com']]) await page.getByLabel(label, { exact: true }).fill(value)
  assert.equal(await page.getByLabel('正式 PDF 和 Excel 使用印章，并叠加报价日期').isChecked(), false)
  await page.locator('input[type=file]').nth(1).setInputFiles({ name: 'oversize-seal.png', mimeType: 'image/png', buffer: Buffer.alloc(1024 * 1024 + 1) })
  await page.getByRole('alert').filter({ hasText: '不超过 1 MB' }).waitFor()
  assert.equal(await page.getByLabel('正式 PDF 和 Excel 使用印章，并叠加报价日期').isChecked(), false)
  await page.locator('input[type=file]').nth(1).setInputFiles({ name: 'sample-seal.png', mimeType: 'image/png', buffer: png })
  await page.waitForFunction(() => document.querySelectorAll('input[type=checkbox]')[0]?.checked)
  await page.getByRole('button', { name: '保存报价设置', exact: true }).click()
  await page.waitForFunction(() => Boolean(window.__settings))
  assert.equal(await page.evaluate(() => window.__settings.brand.address), 'Address fixture')
  assert.equal(await page.evaluate(() => window.__settings.useSeal), true)
  await page.screenshot({ path: 'tmp/pdfs/studio-review/settings-ui.png', fullPage: true })
  await page.getByRole('button', { name: '导入', exact: true }).click()
  await page.getByText('手动复制上架商品的名称、规格、描述、单价、商品来源和成本价（多行文本，仅内部）。', { exact: false }).waitFor()
  await page.getByRole('button', { name: '搜索商城', exact: true }).click()
  await page.getByText('Catalog Fixture', { exact: true }).waitFor()
  await page.getByRole('button', { name: '导入', exact: true }).last().click()
  await page.getByRole('alertdialog').waitFor()
  assert.equal(await page.evaluate(() => window.__import), undefined)
  await page.getByRole('button', { name: '取消', exact: true }).click()
  assert.equal(await page.evaluate(() => window.__import), undefined)
  await page.getByRole('button', { name: '导入', exact: true }).last().click()
  await page.getByRole('button', { name: '确认继续', exact: true }).click()
  await page.waitForFunction(() => Boolean(window.__import))
  assert.equal(await page.evaluate(() => window.__import.includeImages), true)
  await page.getByRole('button', { name: '图片', exact: true }).click()
  const cards = page.locator('[data-image-key]')
  const imageOrder = () => cards.evaluateAll(nodes => nodes.map(node => node.dataset.imageKey))
  const originalOrder = await imageOrder()
  assert.equal(originalOrder.length, 3)
  assert.equal(await page.getByRole('button', { name: '前移图片 1', exact: true }).isDisabled(), true)
  assert.equal(await page.getByRole('button', { name: '后移图片 3', exact: true }).isDisabled(), true)
  await cards.nth(2).dragTo(cards.nth(0))
  assert.deepEqual(await imageOrder(), [originalOrder[2], originalOrder[0], originalOrder[1]])
  await cards.nth(0).dragTo(cards.nth(2))
  assert.deepEqual(await imageOrder(), originalOrder)
  await page.getByRole('button', { name: '前移图片 3', exact: true }).click()
  assert.deepEqual(await imageOrder(), [originalOrder[0], originalOrder[2], originalOrder[1]])
  await page.getByRole('button', { name: '后移图片 1', exact: true }).focus()
  await page.keyboard.press('Enter')
  const reordered = [originalOrder[2], originalOrder[0], originalOrder[1]]
  assert.deepEqual(await imageOrder(), reordered)
  // External drops, cancelled internal drags and same-position drops cannot alter order.
  await cards.nth(1).evaluate(node => {
    const transfer = new DataTransfer(); transfer.setData('application/x-quotation-image', 'foreign-key')
    node.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: transfer }))
  })
  await cards.nth(0).evaluate(node => {
    const transfer = new DataTransfer()
    node.dispatchEvent(new DragEvent('dragstart', { bubbles: true, cancelable: true, dataTransfer: transfer }))
    node.dispatchEvent(new DragEvent('dragend', { bubbles: true, dataTransfer: transfer }))
  })
  await cards.nth(0).evaluate(node => {
    const transfer = new DataTransfer()
    node.dispatchEvent(new DragEvent('dragstart', { bubbles: true, cancelable: true, dataTransfer: transfer }))
    node.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: transfer }))
  })
  assert.deepEqual(await imageOrder(), reordered)
  assert.equal(await page.locator('[data-dragging],[data-drop-target]').count(), 0)
  await page.getByRole('button', { name: '保存图片', exact: true }).click()
  await page.waitForFunction(() => Boolean(window.__imageInput))
  assert.deepEqual(await page.evaluate(() => window.__imageInput.sourceIds), reordered.map(key => key.slice('source-'.length)))
  assert.equal(await cards.evaluateAll(nodes => nodes.every(node => !node.draggable)), true)
  assert.equal(await page.getByRole('button', { name: '后移图片 1', exact: true }).isDisabled(), true)
  await page.waitForFunction(() => Boolean(window.__savedImageIds))
  await page.getByRole('button', { name: '普通图片', exact: true }).click()
  assert.equal(await cards.evaluateAll(nodes => nodes.every(node => !node.draggable)), true)
  assert.equal(await page.getByRole('button', { name: /前移图片|后移图片/ }).count(), 0)
  await page.getByRole('button', { name: '禁用图片', exact: true }).click()
  assert.equal(await cards.evaluateAll(nodes => nodes.every(node => !node.draggable)), true)
  assert.equal(await page.getByRole('button', { name: '前移图片 2', exact: true }).isDisabled(), true)
  await page.getByRole('button', { name: '图片', exact: true }).click()
  assert.deepEqual(await imageOrder(), reordered, 'Reopened fixture follows the saved source ID order')
  assert.equal(await page.getByRole('button', { name: '粘贴或拖拽上传图片', exact: true }).count(), 1)
  await page.route('**/api/admin/quotation-files/upload', async route => {
    await new Promise(resolve => setTimeout(resolve, 300)); await route.continue()
  })
  await page.locator('input[type=file]').setInputFiles({ name: 'new-image.png', mimeType: 'image/png', buffer: png })
  assert.equal(await page.getByRole('button', { name: '保存图片', exact: true }).isDisabled(), true)
  assert.equal(await cards.evaluateAll(nodes => nodes.every(node => !node.draggable)), true)
  await page.waitForFunction(() => document.querySelectorAll('[data-image-key]').length === 4)
  assert.deepEqual((await imageOrder()).slice(0, 3), reordered)
  await page.getByRole('button', { name: '移除图片 2', exact: true }).click()
  assert.equal((await imageOrder()).length, 3)
  await cards.nth(2).dragTo(cards.nth(0))
  await page.screenshot({ path: 'output/playwright/product-source/quotation-image-sort.png', fullPage: true })
  const beforeRefresh = await imageOrder()
  const reimportButton = page.getByRole('button', { name: '重新导入商品主图', exact: true })
  assert.equal(await reimportButton.isEnabled(), true)
  await reimportButton.click()
  await page.getByRole('alertdialog').waitFor()
  assert.match(await page.getByRole('alertdialog').innerText(), /替换/)
  assert.equal(await page.evaluate(() => window.__reimageInput), undefined)
  await page.getByRole('button', { name: '取消', exact: true }).click()
  assert.equal(await page.evaluate(() => window.__reimageInput), undefined)
  assert.deepEqual(await imageOrder(), beforeRefresh)
  // Failure preserves unsaved image selection/order.
  await page.evaluate(() => { window.__reimageFail = true })
  await reimportButton.click()
  await page.getByRole('button', { name: '确认继续', exact: true }).click()
  await page.getByText('模拟导入失败，原图片已保留', { exact: true }).waitFor()
  assert.deepEqual(await imageOrder(), beforeRefresh)
  await page.evaluate(() => { window.__reimageFail = false; delete window.__reimageInput })
  await reimportButton.click()
  await page.getByRole('button', { name: '确认继续', exact: true }).click()
  await page.waitForFunction(() => Boolean(window.__reimageInput))
  assert.equal(await reimportButton.isDisabled(), true)
  assert.equal(await page.getByRole('button', { name: '保存图片', exact: true }).isDisabled(), true)
  assert.equal(await page.locator('input[type=file]').isDisabled(), true)
  assert.equal(await cards.evaluateAll(nodes => nodes.every(node => !node.draggable)), true)
  // A file drop/paste during catalog refresh cannot start an upload or navigate.
  const beforeBlockedUpload = uploadRequests.length
  const emitFiles = async (target, type, files, twice = false) => target.evaluate((node, { type, files, bytes, jpegBytes, twice }) => {
    const transfer = new DataTransfer()
    for (const file of files) transfer.items.add(new File([file.size === undefined ? new Uint8Array(file.type === 'image/jpeg' ? jpegBytes : bytes) : new Uint8Array(file.size)], file.name, { type: file.type || 'image/png' }))
    const event = type === 'paste'
      ? new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: transfer })
      : new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer: transfer })
    node.dispatchEvent(event)
    if (twice) node.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: transfer }))
    return event.defaultPrevented
  }, { type, files, bytes: [...png], jpegBytes: [...jpeg], twice })
  const picker = page.locator('[data-image-picker]')
  assert.equal(await emitFiles(page.getByRole('button', { name: '粘贴或拖拽上传图片', exact: true }).locator('span').first(), 'drop', [{ name: 'blocked.png' }]), true)
  await emitFiles(picker, 'paste', [{ name: 'blocked.png' }])
  assert.equal(uploadRequests.length, beforeBlockedUpload)
  await page.getByRole('img', { name: 'Fresh catalog 4', exact: true }).waitFor()
  await page.getByText('商城主图已重新导入', { exact: true }).waitFor()
  assert.equal(await cards.count(), 2)
  assert.deepEqual(await imageOrder(), [4, 5].map(n => `source-00000000-0000-4000-8000-${String(n).padStart(12, '0')}`))
  assert.equal(await reimportButton.isEnabled(), true)
  // Server-style prop refresh must retain feedback and supply the latest timestamp.
  const refreshBefore = await page.locator('main').getAttribute('data-refreshes')
  await page.evaluate(() => window.dispatchEvent(new Event('fixture-refresh')))
  await page.waitForFunction(previous => document.querySelector('main').dataset.refreshes !== previous, refreshBefore)
  assert.equal(await page.getByText('商城主图已重新导入', { exact: true }).isVisible(), true)
  await cards.nth(1).dragTo(cards.nth(0))
  await page.getByRole('button', { name: '保存图片', exact: true }).click()
  await page.waitForFunction(() => window.__imageInput?.updatedAt === '2026-10-05T00:00:00.000Z')
  assert.deepEqual(await page.evaluate(() => window.__imageInput.sourceIds), [5, 4].map(n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`))
  await page.getByText('产品图片已保存', { exact: true }).waitFor()
  await page.screenshot({ path: 'output/playwright/product-source/quotation-image-reimport.png', fullPage: true })
  await page.getByRole('button', { name: '未关联图片', exact: true }).click()
  assert.equal(await reimportButton.isDisabled(), true)
  assert.match(await page.locator('main').innerText(), /未关联商城商品/)
  // Paste and external-file drops use the same bounded, sequential upload path.
  await page.getByRole('button', { name: '图片', exact: true }).click()
  const pasteTarget = page.getByRole('button', { name: '粘贴或拖拽上传图片', exact: true })
  const beforePaste = await imageOrder()
  const requestsBeforePaste = uploadRequests.length
  assert.equal(await emitFiles(page.locator('input[type=file]'), 'paste', [{ name: 'input-paste.png' }]), false)
  assert.equal(uploadRequests.length, requestsBeforePaste)
  await pasteTarget.click()
  assert.equal(await pasteTarget.evaluate(node => node === document.activeElement), true)
  // Dispatch paste + drop in one JS task to cover the immediate busy ref guard.
  await emitFiles(pasteTarget, 'paste', [{ name: 'clipboard.blob' }], true)
  assert.equal(await page.getByRole('button', { name: '保存图片', exact: true }).isDisabled(), true)
  assert.equal(await reimportButton.isDisabled(), true)
  assert.equal(await cards.evaluateAll(nodes => nodes.every(node => !node.draggable)), true)
  await page.waitForFunction(() => document.querySelectorAll('[data-image-key]').length === 3)
  await pasteTarget.waitFor({ state: 'visible' })
  assert.equal(uploadRequests.length, requestsBeforePaste + 1)
  assert.match(uploadRequests.at(-1).name, /\.png$/)
  assert.deepEqual((await imageOrder()).slice(0, 2), beforePaste)
  const dropFiles = [{ name: 'drop-first.png' }, { name: 'drop-second.png' }]
  assert.equal(await emitFiles(pasteTarget, 'dragenter', dropFiles), true)
  assert.equal(await picker.getAttribute('data-file-drop-target'), 'true')
  assert.equal(await emitFiles(cards.nth(0), 'drop', dropFiles), true, 'Dropping over a thumbnail also uploads')
  assert.equal(await picker.getAttribute('data-file-drop-target'), null)
  await page.waitForFunction(() => document.querySelectorAll('[data-image-key]').length === 5)
  assert.deepEqual(uploadRequests.slice(-2).map(file => file.name), ['drop-first.png', 'drop-second.png'])
  assert.deepEqual((await imageOrder()).slice(0, 2), beforePaste)
  await page.locator('input[type=file]').setInputFiles([
    { name: 'select-first.png', mimeType: 'image/png', buffer: png },
    { name: 'select-second.png', mimeType: 'image/png', buffer: png },
  ])
  await page.waitForFunction(() => document.querySelectorAll('[data-image-key]').length === 7)
  assert.deepEqual(uploadRequests.slice(-2).map(file => file.name), ['select-first.png', 'select-second.png'])
  const beforeValidation = uploadRequests.length
  await emitFiles(pasteTarget, 'drop', [{ name: 'invalid.gif', type: 'image/gif' }])
  await page.getByRole('alert').filter({ hasText: /PNG|JPEG/ }).waitFor()
  await emitFiles(pasteTarget, 'drop', [{ name: 'large.png', size: 5 * 1024 * 1024 + 1 }])
  await page.getByRole('alert').filter({ hasText: /5 MB/ }).waitFor()
  await emitFiles(pasteTarget, 'paste', [{ name: 'empty.png', size: 0 }])
  await page.getByRole('alert').waitFor()
  await emitFiles(pasteTarget, 'drop', dropFiles)
  await page.getByRole('alert').filter({ hasText: /8|1/ }).waitFor()
  assert.equal(uploadRequests.length, beforeValidation, 'Invalid/oversize/empty/overflow inputs fail before HTTP')
  assert.equal(await cards.count(), 7)
  await page.getByRole('button', { name: '移除图片 7', exact: true }).click()
  const beforePartial = await imageOrder()
  uploadBehaviors.push({}, { fail: true, status: 500 })
  await emitFiles(pasteTarget, 'drop', [{ name: 'partial-ok.png' }, { name: 'partial-failed.png' }])
  await page.getByRole('alert').filter({ hasText: '模拟上传失败' }).waitFor()
  assert.equal(await cards.count(), 7)
  assert.deepEqual((await imageOrder()).slice(0, 6), beforePartial)
  const beforeDuplicate = await imageOrder()
  uploadBehaviors.push({ id: beforeDuplicate[0].slice('source-'.length) })
  await emitFiles(pasteTarget, 'paste', [{ name: 'duplicate.png' }])
  await page.getByRole('alert').filter({ hasText: /已经添加|重复/ }).waitFor()
  assert.equal(uploadRequests.at(-1).name, 'duplicate.png', 'Valid clipboard filenames are preserved')
  assert.deepEqual(await imageOrder(), beforeDuplicate)
  uploadBehaviors.push({ html: true })
  await emitFiles(pasteTarget, 'drop', [{ name: 'login.png' }])
  await page.getByRole('alert').filter({ hasText: /登录/ }).waitFor()
  assert.deepEqual(await imageOrder(), beforeDuplicate)
  uploadBehaviors.push({ securityStatus: 'QUARANTINED' })
  await emitFiles(pasteTarget, 'drop', [{ name: 'unclean.png' }])
  await page.getByRole('alert').filter({ hasText: /安全检查/ }).waitFor()
  assert.deepEqual(await imageOrder(), beforeDuplicate)
  await emitFiles(pasteTarget, 'paste', [{ name: '', type: 'image/jpeg' }])
  await page.waitForFunction(() => document.querySelectorAll('[data-image-key]').length === 8)
  assert.match(uploadRequests.at(-1).name, /\.jpg$/)
  assert.equal(uploadRequests.at(-1).type, 'image/jpeg')
  const fullOrder = await imageOrder()
  const requestsAtFull = uploadRequests.length
  assert.equal(await emitFiles(pasteTarget.locator('span').first(), 'drop', [{ name: 'full.png' }]), true)
  await emitFiles(picker, 'paste', [{ name: 'full.png' }])
  assert.equal(uploadRequests.length, requestsAtFull)
  assert.deepEqual(await imageOrder(), fullOrder)
  // Text paste and URI-only drags remain browser defaults; no URL is fetched.
  assert.equal(await picker.evaluate(node => {
    const transfer = new DataTransfer(); transfer.setData('text/plain', 'ordinary text')
    const event = new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: transfer }); node.dispatchEvent(event); return event.defaultPrevented
  }), false)
  assert.equal(await picker.evaluate(node => {
    const transfer = new DataTransfer(); transfer.setData('text/uri-list', 'https://example.invalid/image.png')
    const event = new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: transfer }); node.dispatchEvent(event); return event.defaultPrevented
  }), false)
  await page.getByRole('button', { name: '移除图片 8', exact: true }).click()
  const newSavedOrder = await imageOrder()
  await page.getByRole('button', { name: '保存图片', exact: true }).click()
  assert.equal(await emitFiles(pasteTarget.locator('span').first(), 'drop', [{ name: 'save-blocked.png' }]), true)
  await emitFiles(picker, 'paste', [{ name: 'save-blocked.png' }])
  await page.waitForFunction(ids => JSON.stringify(window.__savedImageIds) === JSON.stringify(ids), newSavedOrder.map(key => key.slice('source-'.length)))
  assert.equal(uploadRequests.length, requestsAtFull)
  assert.deepEqual(await page.evaluate(() => window.__imageInput.sourceIds), newSavedOrder.map(key => key.slice('source-'.length)))
  await page.getByRole('button', { name: '普通图片', exact: true }).click()
  assert.equal(await pasteTarget.count(), 0)
  assert.equal(await page.locator('input[type=file]').evaluate(node => node.multiple), false)
  const ordinaryPicker = page.locator('input[type=file]').locator('..').locator('..')
  await emitFiles(ordinaryPicker, 'paste', [{ name: 'ordinary.png' }])
  await emitFiles(ordinaryPicker, 'drop', [{ name: 'ordinary.png' }])
  assert.equal(uploadRequests.length, requestsAtFull)
  await page.getByRole('button', { name: '图片', exact: true }).click()
  assert.deepEqual(await imageOrder(), newSavedOrder, 'Pasted/dropped images retain saved order on reopening')
  assert.equal(maxActiveUploads, 1, 'Batch uploads are sequential')
  await page.screenshot({ path: 'output/playwright/product-source/quotation-image-paste-drop.png', fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  for (const tab of ['客户', '产品', '设置', '导入', '图片']) {
    await page.getByRole('button', { name: tab, exact: true }).first().click()
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, `Mobile overflow: ${tab}`)
  }
  await page.screenshot({ path: 'tmp/pdfs/studio-review/mobile-ui.png', fullPage: true })
  assert.deepEqual(errors, [])
  console.log('PASS: real customer/product/settings/import forms, private metadata, image sort/save/reopen, paste/multi-drop/multi-select order, type/size/capacity/duplicate guards, partial failure, immediate busy guard, reimport pending/version behavior, seal upload, 390px layouts. All I/O mocked.')
} finally {
  await browser?.close()
  await new Promise(resolve => server.close(resolve))
}
