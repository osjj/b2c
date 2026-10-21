// Real quotation editor/picker with isolated action and image fixtures. No .env, database or storage.
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { mkdir, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { build } from 'esbuild'
import postcss from 'postcss'
import tailwind from '@tailwindcss/postcss'
import sharp from 'sharp'
import { chromium } from 'playwright'

const firstName = 'Cotton Workwear'
const foreignName = 'European Safety Boots'
const lateName = 'Late product beyond first 500'
const longName = 'LongUnbrokenCommonProductName'.repeat(14)
const mocks = `
export const unstable_rethrow=()=>{};
export const useRouter=()=>({push:url=>{window.__route=url},replace:url=>{window.__route=url},refresh:()=>{window.__refreshes++}});
export const usePathname=()=>window.location.pathname;
export const useSearchParams=()=>new URLSearchParams(window.location.search);
export const isQuotationWorkbenchEnabled=()=>true;
export const requireAdmin=async()=>({id:'isolated-admin'});
export const notFound=()=>{throw new Error('Unexpected missing fixture')};
export const redirect=url=>{throw Object.assign(new Error('Fixture redirect'),{redirectUrl:url})};
const match=(where={})=>window.__products.filter(product=>!where.OR||where.OR.some(condition=>Object.entries(condition).some(([key,value])=>(product[key]||'').toLocaleLowerCase().includes(value.contains.toLocaleLowerCase()))));
export const prisma={quotationProduct:{findMany:async({where,take,skip=0})=>match(where).slice(skip,skip+take).map(product=>({...product,updatedAt:new Date('2026-10-21T00:00:00Z'),status:'ACTIVE',images:product.images.map(image=>({sourceFileId:image.id}))})),count:async({where})=>match(where).length},setting:{findMany:async()=>[]}};
export async function deleteCommonQuotationProduct(){window.__writes++;throw new Error('Picker test must not delete')}
export async function searchQuotationCatalog(){return {success:true,data:[]}}
export async function importQuotationCatalogProduct(){window.__writes++;throw new Error('Picker test must not import')}
export async function loadCommonQuotationProducts(){
 window.__loads++;
 const mode=window.__mode;
 if(window.__holdLoad)await new Promise(resolve=>{window.__releaseLoad=resolve});
 if(mode==='throw')throw new Error('Isolated transport failure');
 if(mode==='failure')return {success:false,code:'INTERNAL_ERROR',reason:'模拟加载失败，请重新加载'};
 if(mode==='malformed')return {success:true,reason:'模拟无效响应',data:[{id:'broken'}]};
 return {success:true,reason:'已加载',data:mode==='empty'?[]:window.__products};
}
export async function createSalesQuotation(){window.__writes++;throw new Error('Picker test must not save')}
export const updateSalesQuotation=createSalesQuotation;
export const finalizeSalesQuotation=createSalesQuotation;
`
const source = `
import React from 'react';import {createRoot} from 'react-dom/client';
import {SimpleQuotationEditor} from './src/components/admin/quotation/simple-editor';
import CommonProductsPage from './src/app/admin/quotation-products/page';
import {defaultWorkbenchSettings} from './src/lib/quotation/workbench-config';
const root=createRoot(document.getElementById('root'));let visit=0;
const firstName=${JSON.stringify(firstName)},foreignName=${JSON.stringify(foreignName)},lateName=${JSON.stringify(lateName)},longName=${JSON.stringify(longName)};
window.__products=Array.from({length:502},(_,i)=>({id:'c'+String(i+1).padStart(24,'0'),name:'Fixture product '+String(i+1).padStart(3,'0'),nameEn:'Fixture product '+String(i+1).padStart(3,'0'),nameZh:'通用产品'+(i+1),internalNumber:'QP-'+String(i+1).padStart(4,'0'),model:'MODEL-'+(i+1),sku:'SKU-'+(i+1),specifications:'Material: Cotton',description:'Customer description',packaging:'10 / bag',unit:'pcs',unitPrice:'12.50',unitCost:'7.25',currency:'USD',active:true,images:[]}));
Object.assign(window.__products[0],{name:firstName,nameEn:firstName,nameZh:'棉质工作服',internalNumber:'QP-COTTON',model:'CW-MODEL',sku:'COTTON-SKU',images:[{id:'11111111-1111-4111-8111-111111111112',kind:'source',name:'Second image first'},{id:'11111111-1111-4111-8111-111111111111',kind:'source',name:'First image second'}]});
Object.assign(window.__products[1],{name:foreignName,nameEn:foreignName,currency:'EUR',unitPrice:'25.50',unitCost:'18.50',unit:'pair'});
Object.assign(window.__products[2],{name:longName,nameEn:longName});
Object.assign(window.__products[501],{name:lateName,nameEn:lateName,nameZh:'末尾防护用品'});
window.__loads=0;window.__writes=0;window.__mode='success';window.__holdLoad=false;window.__refreshes=0;
window.__createdObjectUrls=[];window.__revokedObjectUrls=[];
const createObjectURL=URL.createObjectURL.bind(URL),revokeObjectURL=URL.revokeObjectURL.bind(URL);
URL.createObjectURL=blob=>{const url=createObjectURL(blob);window.__createdObjectUrls.push(url);return url};
URL.revokeObjectURL=url=>{window.__revokedObjectUrls.push(url);revokeObjectURL(url)};
window.__reenter=(mode='success')=>{window.__mode=mode;window.__holdLoad=false;window.__releaseLoad=null;root.render(<main key={++visit} className="mx-auto max-w-7xl space-y-6 p-4 md:p-6"><h1 className="text-2xl font-semibold">新建报价 · 隔离验证</h1><SimpleQuotationEditor customers={[]} settings={defaultWorkbenchSettings}/></main>)};
window.__renderList=async()=>{let tree;try{tree=await CommonProductsPage({searchParams:Promise.resolve(Object.fromEntries(new URLSearchParams(window.location.search)))})}catch(error){if(error.redirectUrl){location.href=error.redirectUrl;return}throw error}root.render(<main className="mx-auto max-w-7xl p-4 md:p-6">{tree}</main>)};
if(location.pathname==='/admin/quotation-products')window.__renderList();else window.__reenter();
`
const bundle = await build({ stdin: { contents: source, resolveDir: process.cwd(), loader: 'tsx' }, bundle: true, write: false, platform: 'browser', format: 'iife', jsx: 'automatic', define: { 'process.env.NODE_ENV': '"development"' }, plugins: [{ name: 'common-product-picker-fixture', setup(plugin) {
  plugin.onResolve({ filter: /^(next\/navigation|@\/lib\/(auth-utils|prisma|quotation\/feature)|@\/actions\/admin\/(common-quotation-products|sales-quotations|quotation-catalog))$/ }, () => ({ path: 'mock', namespace: 'fixture' }))
  plugin.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: mocks, loader: 'js', resolveDir: process.cwd() }))
  plugin.onResolve({ filter: /^next\/(link|image)$/ }, ({ path }) => ({ path, namespace: 'next-fixture' }))
  plugin.onLoad({ filter: /.*/, namespace: 'next-fixture' }, ({ path }) => ({ contents: path.endsWith('link') ? 'import React from "react";export default function Link(props){return <a {...props}/>}' : 'import React from "react";export default function Image({fill,unoptimized,priority,...props}){return <img {...props}/>} ', loader: 'jsx', resolveDir: process.cwd() }))
} }] })
const css = await postcss([tailwind()]).process(await readFile('src/app/globals.css', 'utf8'), { from: resolve('src/app/globals.css') })
const png = await sharp({ create: { width: 120, height: 120, channels: 3, background: '#0f766e' } }).png().toBuffer()
const imageRequests = []
const server = createServer((request, response) => {
  response.setHeader('Cache-Control', 'no-store')
  if (request.url === '/app.js') { response.setHeader('Content-Type', 'application/javascript'); response.end(bundle.outputFiles[0].contents) }
  else if (request.url === '/app.css') { response.setHeader('Content-Type', 'text/css'); response.end(css.css) }
  else if (request.url?.startsWith('/api/admin/quotation-images/')) { imageRequests.push(request.url); response.setHeader('Content-Type', 'image/png'); response.end(png) }
  else if (request.url === '/' || request.url?.startsWith('/admin/quotation-products')) { response.setHeader('Content-Type', 'text/html; charset=utf-8'); response.end('<!doctype html><html lang="zh"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/app.css"><body style="background:#f1f5f7;font-family:Arial,Microsoft YaHei,sans-serif"><div id="root"></div><script src="/app.js"></script></body></html>') }
  else { response.statusCode = 404; response.end() }
})
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
const origin = `http://127.0.0.1:${server.address().port}`
const output = 'output/playwright/common-product-picker'
await mkdir(output, { recursive: true })
let browser
try {
  browser = await chromium.launch({ channel: 'msedge', headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } })
  page.setDefaultTimeout(10000)
  const errors = []; page.on('pageerror', error => errors.push(error.message))
  await page.route('**/*', route => route.request().url().startsWith(origin) ? route.continue() : route.abort())
  await page.goto(origin)
  const open = (index = 1) => page.getByRole('button', { name: `选择常用产品 ${index}`, exact: true })
  const panel = () => page.getByRole('dialog', { name: '选择常用产品', exact: true })
  const search = () => panel().getByLabel('搜索常用产品', { exact: true })
  const choose = name => panel().getByRole('button', { name: `选择 ${name}`, exact: true })
  const loads = () => page.evaluate(() => window.__loads)
  const expectLoads = async count => assert.equal(await loads(), count)
  const close = async (index = 1) => {
    await page.keyboard.press('Escape')
    await panel().waitFor({ state: 'hidden' })
    await page.waitForFunction(label => document.activeElement?.getAttribute('aria-label') === label, `选择常用产品 ${index}`)
  }
  const reenter = async (mode = 'success') => {
    await page.evaluate(mode => window.__reenter(mode), mode)
    await open().waitFor()
    await page.waitForFunction(() => document.querySelector('input[placeholder="填写对客户展示的名称，中英文均可"]')?.value === '')
  }
  const find = async (query, name = firstName) => { await search().fill(query); await choose(name).waitFor() }

  await open().waitFor()
  await expectLoads(0)
  await page.evaluate(() => { window.__holdLoad = true })
  await open().focus(); await page.keyboard.press('Enter')
  await panel().waitFor()
  await expectLoads(1)
  await page.waitForFunction(() => document.activeElement?.getAttribute('aria-label') === '搜索常用产品')
  await panel().getByRole('status').filter({ hasText: /加载/ }).waitFor()
  await close()
  await open().click(); await panel().waitFor()
  await expectLoads(1)
  await page.evaluate(() => window.__releaseLoad())
  await choose(firstName).waitFor()
  await expectLoads(1)
  await page.screenshot({ path: `${output}/picker-desktop.png`, animations: 'disabled' })
  await page.waitForFunction(() => { const image = document.querySelector('[role="dialog"] img'); return image?.complete && image.naturalWidth > 0 })
  const loadedImageCount = imageRequests.length
  const scrollPanel = () => panel().locator('.overflow-y-auto')
  await close()
  await open().click(); await choose(firstName).waitFor()
  await page.waitForFunction(() => { const image = document.querySelector('[role="dialog"] img'); return image?.complete && image.naturalWidth > 0 })
  assert.equal(imageRequests.length, loadedImageCount, `Reopening a cached picker must reuse private thumbnail content; requests before=${loadedImageCount}, after=${imageRequests.length}`)
  await scrollPanel().evaluate(node => new Promise(resolve => { node.addEventListener('scroll', () => resolve(), { once: true }); node.scrollTop = 320 }))
  await close(); await open().click(); await panel().waitFor()
  assert.ok(await scrollPanel().evaluate(node => node.scrollTop) >= 300, 'Reopening retains the product scroll position')
  await search().fill('   ')
  await panel().getByText('共 502 个可用产品', { exact: true }).waitFor()
  assert.equal(await panel().getByRole('button', { name: /^选择 / }).count(), 502)
  await expectLoads(1)

  for (const query of ['cotton workwear', '棉质', 'qp-cotton', 'cw-model', 'cotton-sku']) {
    await find(query)
    assert.equal(await panel().getByRole('button', { name: /^选择 / }).count(), 1)
    await expectLoads(1)
  }
  await find('末尾防护用品', lateName)
  await expectLoads(1)
  await search().fill('no-matching-common-product')
  await panel().getByText(/没有.*匹配|未找到|无匹配/).first().waitFor()
  assert.equal(await panel().getByRole('button', { name: /^选择 / }).count(), 0)
  await panel().getByRole('button', { name: '清空搜索', exact: true }).click()
  await choose(firstName).waitFor()
  await find('cw-model')
  await close()
  await open().click(); await panel().waitFor()
  assert.equal(await search().inputValue(), 'cw-model', 'Query survives closing and reopening')
  await expectLoads(1)
  await close()

  await page.getByLabel('数量', { exact: true }).fill('7')
  await open().click(); await choose(firstName).click(); await panel().waitFor({ state: 'hidden' })
  assert.equal(await page.getByLabel('产品名称', { exact: true }).inputValue(), firstName)
  assert.equal(await page.getByLabel(/^规格 \/ 描述 \/ 包装/).inputValue(), 'Material: Cotton\nCustomer description\nPackaging: 10 / bag')
  assert.equal(await page.getByLabel('数量', { exact: true }).inputValue(), '7', 'Choosing a product preserves quantity')
  assert.equal(await page.getByLabel('单位', { exact: true }).inputValue(), 'pcs')
  assert.equal(await page.getByLabel('单价 · USD', { exact: true }).inputValue(), '12.50')
  await page.getByText('内部核价（客户不可见）', { exact: true }).click()
  assert.equal(await page.getByLabel('成本单价 · USD', { exact: true }).inputValue(), '7.25')
  assert.deepEqual(await page.locator('[data-image-key]').evaluateAll(nodes => nodes.map(node => node.dataset.imageKey)), ['source-11111111-1111-4111-8111-111111111112', 'source-11111111-1111-4111-8111-111111111111'])
  await page.getByRole('button', { name: '添加产品明细', exact: true }).click()
  await open(2).click(); await panel().waitFor()
  assert.equal(await search().inputValue(), 'cw-model', 'All lines share the same query and cache')
  await choose(firstName).click(); await panel().waitFor({ state: 'hidden' })
  assert.equal(await page.getByLabel('产品名称', { exact: true }).nth(1).inputValue(), firstName)
  await expectLoads(1)

  await open().click(); await find(foreignName, foreignName); await choose(foreignName).click()
  await page.getByRole('alertdialog', { name: '填充常用产品', exact: true }).waitFor()
  await page.getByRole('alertdialog').getByRole('button', { name: '取消', exact: true }).click()
  assert.equal(await page.getByLabel('产品名称', { exact: true }).first().inputValue(), firstName)
  assert.equal(await page.getByLabel('单价 · USD', { exact: true }).first().inputValue(), '12.50')
  await open().click(); await choose(foreignName).click()
  await page.getByRole('alertdialog').getByRole('button', { name: '确认继续', exact: true }).click()
  await page.getByRole('alert').filter({ hasText: /EUR.*USD/ }).waitFor()
  assert.equal(await page.getByLabel('产品名称', { exact: true }).first().inputValue(), foreignName)
  assert.equal(await page.getByLabel('单价 · USD', { exact: true }).first().inputValue(), '0')
  assert.equal(await page.getByLabel('成本单价 · USD', { exact: true }).first().inputValue(), '')
  assert.equal(await page.getByLabel('数量', { exact: true }).first().inputValue(), '7')
  await expectLoads(1)

  const previousVisitUrls = await page.evaluate(() => [...window.__createdObjectUrls])
  assert.ok(previousVisitUrls.length > 0, 'Private thumbnail responses are held in visit-local object URLs')
  await reenter(); await expectLoads(1)
  await page.waitForFunction(urls => urls.every(url => window.__revokedObjectUrls.includes(url)), previousVisitUrls)
  await open().click(); await choose(firstName).waitFor(); await expectLoads(2)
  assert.equal(await search().inputValue(), '', 'Re-entering starts with a new query')
  await close()
  await reenter('empty'); await expectLoads(2)
  await open().click(); await panel().getByText(/暂无|没有可用/).first().waitFor(); await expectLoads(3)
  await close(); await open().click(); await panel().getByText(/暂无|没有可用/).first().waitFor(); await expectLoads(3)
  await close()

  for (const mode of ['failure', 'throw', 'malformed']) {
    await reenter(mode)
    const before = await loads()
    await open().click(); await panel().getByRole('alert').waitFor(); await expectLoads(before + 1)
    await close(); await open().click(); await panel().getByRole('alert').waitFor(); await expectLoads(before + 1)
    await page.evaluate(() => { window.__mode = 'success'; window.__holdLoad = true })
    const retry = panel().getByRole('button', { name: '重新加载', exact: true })
    await retry.click(); await expectLoads(before + 2)
    await close(); await open().click(); await panel().waitFor(); await expectLoads(before + 2)
    await page.evaluate(() => window.__releaseLoad())
    await choose(firstName).waitFor(); await expectLoads(before + 2)
    await close()
  }

  await reenter()
  await page.setViewportSize({ width: 390, height: 844 })
  await open().click(); await choose(firstName).waitFor()
  await find(longName, longName)
  await page.screenshot({ path: `${output}/picker-mobile-long-name.png`, animations: 'disabled' })
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'Mobile page does not overflow horizontally')
  const bounds = await panel().boundingBox()
  assert.ok(bounds && bounds.x >= -1 && bounds.x + bounds.width <= 391, 'Drawer stays inside mobile viewport')
  assert.equal(await panel().evaluate(node => node.scrollWidth <= node.clientWidth), true, 'Long product text does not overflow drawer')
  await close()
  await page.screenshot({ path: `${output}/editor-mobile.png`, fullPage: true, animations: 'disabled' })
  assert.equal(await page.evaluate(() => window.__writes), 0, 'Browsing and selection never saves or generates a quote')

  await page.setViewportSize({ width: 1440, height: 1100 })
  await page.goto(`${origin}/admin/quotation-products`)
  await page.getByRole('heading', { name: '常用产品', exact: true }).waitFor()
  assert.equal(await page.locator('article').count(), 24)
  await page.getByText('共 502 个常用产品', { exact: true }).waitFor()
  assert.deepEqual(await page.getByLabel('搜索常用产品', { exact: true }).evaluate(input => ({ method: input.form.method, action: new URL(input.form.action).pathname, maximum: input.maxLength })), { method: 'get', action: '/admin/quotation-products', maximum: 200 })
  const submitSearch = async query => {
    await page.getByLabel('搜索常用产品', { exact: true }).fill(query)
    await page.getByRole('button', { name: '搜索', exact: true }).click()
    await page.waitForURL(url => url.searchParams.get('search') === query)
    await page.getByRole('heading', { name: '常用产品', exact: true }).waitFor()
  }
  for (const query of ['cotton workwear', '棉质', 'qp-cotton', 'cw-model', 'cotton-sku']) {
    await submitSearch(query)
    await page.getByRole('heading', { name: firstName, exact: true }).waitFor()
    assert.equal(await page.locator('article').count(), 1)
    assert.equal(await page.getByLabel('搜索常用产品', { exact: true }).inputValue(), query)
    await page.getByText('找到 1 个匹配的常用产品', { exact: true }).waitFor()
    assert.equal(await page.getByRole('link', { name: '清空搜索', exact: true }).getAttribute('href'), '/admin/quotation-products')
  }
  await submitSearch('Fixture product')
  await page.getByText('找到 498 个匹配的常用产品', { exact: true }).waitFor()
  const secondPage = page.getByRole('link', { name: 'Go to page 2', exact: true })
  const nextUrl = new URL(await secondPage.getAttribute('href'), origin)
  assert.equal(nextUrl.searchParams.get('search'), 'Fixture product', 'Pagination retains the search term')
  assert.equal(nextUrl.searchParams.get('page'), '2')
  assert.equal(nextUrl.pathname, '/admin/quotation-products')
  await secondPage.click()
  await page.waitForURL(url => url.searchParams.get('page') === '2')
  await page.getByRole('heading', { name: 'Fixture product 028', exact: true }).waitFor()
  await submitSearch('no-matching-common-product')
  assert.equal(new URL(page.url()).searchParams.has('page'), false, 'A new search resets pagination')
  await page.getByText('没有找到匹配的常用产品，请更换关键词或清空搜索。', { exact: true }).waitFor()
  assert.equal(await page.locator('article').count(), 0)
  await page.getByText('找到 0 个匹配的常用产品', { exact: true }).waitFor()
  await page.getByRole('link', { name: '清空搜索', exact: true }).click()
  await page.waitForURL(url => !url.search)
  await page.getByText('共 502 个常用产品', { exact: true }).waitFor()
  await page.screenshot({ path: `${output}/list-desktop.png`, fullPage: true, animations: 'disabled' })
  await page.setViewportSize({ width: 390, height: 844 })
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
  await page.screenshot({ path: `${output}/list-mobile.png`, animations: 'disabled' })
  assert.equal(await page.evaluate(() => window.__writes), 0)
  assert.deepEqual(errors, [])
  console.log('PASS: lazy first load, pending deduplication, shared per-visit data/query/scroll/thumbnail cache across lines, object URL cleanup, >500 searchable items, multilingual/code searches, empty cache, explicit error retry, remount refresh, selection/defaults/image order, replacement cancellation, currency mismatch, keyboard/focus, 390px layout, list GET search/clear/count/empty states and pagination search preservation. Real components with isolated I/O; no live database.')
} finally { await browser?.close(); await new Promise(resolve => server.close(resolve)) }
