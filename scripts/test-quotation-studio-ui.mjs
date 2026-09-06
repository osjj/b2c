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
export const useRouter=()=>({push:route=>{window.__route=route},refresh:()=>{}});
export const usePathname=()=>'/admin/business-customers';
export async function saveQuotationCustomer(input){window.__customer=input;return {success:true,reason:'已保存'}}
export async function saveCommonQuotationProduct(input){window.__product=input;return {success:true,data:{id:'cmockproduct00000000000000'}}}
export async function saveQuotationSettings(input){window.__settings=input;return {success:true,reason:'设置已保存'}}
export async function searchQuotationCatalog(){return {success:true,data:[{id:'cmockcatalog00000000000000',name:'Catalog Fixture',unitPrice:'12.50',unitCost:'7.25',updatedAt:'2026-09-06T00:00:00.000Z',imageIds:['fixture-image']}]}}
export async function importQuotationCatalogProduct(input){window.__import=input;return {success:true,data:{id:'cmockproduct00000000000000'}}}
`
const bundle = await build({ stdin: { contents: `
import React,{useState} from 'react';import {createRoot} from 'react-dom/client';
import {CustomerForm} from './src/components/admin/quotation/customer-form';
import {CommonProductForm} from './src/components/admin/quotation/common-product-form';
import {QuotationSettingsForm} from './src/components/admin/quotation/settings-form';
import {CatalogImport} from './src/components/admin/quotation/catalog-import';
import {WorkbenchHeader} from './src/components/admin/quotation/workbench-header';
import {defaultWorkbenchSettings} from './src/lib/quotation/workbench-config';
function App(){const [page,setPage]=useState('客户');return <main className="mx-auto max-w-7xl space-y-6 p-6"><p>隔离表单测试 · 不连接数据库</p><nav>{['客户','产品','设置','导入'].map(p=><button className="mr-3 rounded border px-4 py-2" onClick={()=>setPage(p)} key={p}>{p}</button>)}</nav><WorkbenchHeader title={page} description="Quotation studio local review"/>{page==='客户'?<CustomerForm/>:page==='产品'?<CommonProductForm/>:page==='设置'?<QuotationSettingsForm initialValue={defaultWorkbenchSettings}/>:<CatalogImport/>}</main>}
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
const server = createServer((request, response) => {
  if (request.url === '/') { response.setHeader('Content-Type', 'text/html; charset=utf-8'); response.end('<!doctype html><html lang="zh"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/app.css"><body style="background:#f1f5f7;font-family:Arial,Microsoft YaHei,sans-serif"><div id="root"></div><script src="/app.js"></script></body></html>') }
  else if (request.url === '/app.js') { response.setHeader('Content-Type', 'application/javascript'); response.end(bundle.outputFiles[0].contents) }
  else if (request.url === '/app.css') { response.setHeader('Content-Type', 'text/css'); response.end(css.css) }
  else if (request.url === '/api/admin/quotation-files/upload') { request.resume(); response.setHeader('Content-Type', 'application/json'); response.end(JSON.stringify({ success: true, reason: 'fixture', data: { id: '11111111-1111-4111-8111-111111111111', securityStatus: 'CLEAN' } })) }
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
  await page.getByLabel('规格', { exact: true }).fill('Material: Cotton\nColor: Navy')
  await page.getByLabel('描述备注', { exact: true }).fill('Customer description')
  await page.getByLabel('包装信息', { exact: true }).fill('20 pcs/carton')
  await page.getByLabel('成本价（仅内部，与单价同币种）').fill('7.25')
  await page.getByLabel('默认报价单价').fill('12.50')
  await page.getByRole('button', { name: '保存常用产品', exact: true }).click()
  await page.waitForFunction(() => Boolean(window.__product))
  const product = await page.evaluate(() => window.__product)
  assert.equal(product.unitCost, '7.25'); assert.equal(product.packaging, '20 pcs/carton'); assert.equal(product.description, 'Customer description')
  await page.getByRole('button', { name: '设置', exact: true }).click()
  for (const [label, value] of [['联系方式（右侧）', 'Contact fixture'], ['地址（左侧）', 'Address fixture'], ['网站（右侧）', 'https://example.com'], ['邮箱（右侧）', 'fixture@example.com']]) await page.getByLabel(label, { exact: true }).fill(value)
  assert.equal(await page.getByLabel('正式 PDF 和 Excel 使用印章，并叠加报价日期').isChecked(), false)
  await page.locator('input[type=file]').nth(1).setInputFiles({ name: 'oversize-seal.png', mimeType: 'image/png', buffer: Buffer.alloc(1024 * 1024 + 1) })
  await page.getByRole('alert').filter({ hasText: '请选择不超过 1 MB' }).waitFor()
  assert.equal(await page.getByLabel('正式 PDF 和 Excel 使用印章，并叠加报价日期').isChecked(), false)
  await page.locator('input[type=file]').nth(1).setInputFiles({ name: 'sample-seal.png', mimeType: 'image/png', buffer: png })
  await page.waitForFunction(() => document.querySelectorAll('input[type=checkbox]')[0]?.checked)
  await page.getByRole('button', { name: '保存报价设置', exact: true }).click()
  await page.waitForFunction(() => Boolean(window.__settings))
  assert.equal(await page.evaluate(() => window.__settings.brand.address), 'Address fixture')
  assert.equal(await page.evaluate(() => window.__settings.useSeal), true)
  await page.screenshot({ path: 'tmp/pdfs/studio-review/settings-ui.png', fullPage: true })
  await page.getByRole('button', { name: '导入', exact: true }).click()
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
  await page.setViewportSize({ width: 390, height: 844 })
  for (const tab of ['客户', '产品', '设置', '导入']) {
    await page.getByRole('button', { name: tab, exact: true }).first().click()
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, `Mobile overflow: ${tab}`)
  }
  await page.screenshot({ path: 'tmp/pdfs/studio-review/mobile-ui.png', fullPage: true })
  assert.deepEqual(errors, [])
  console.log('PASS: real customer/product/settings/import forms, seal upload, confirmation/cancel, 390px layouts. All I/O mocked.')
} finally {
  await browser?.close()
  await new Promise(resolve => server.close(resolve))
}
