// Real quotation/category components with isolated actions and read fixtures. No .env, DB or storage.
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { mkdir, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { build } from 'esbuild'
import postcss from 'postcss'
import tailwind from '@tailwindcss/postcss'
import sharp from 'sharp'
import { chromium } from 'playwright'

const id = number => `c${String(number).padStart(24, '0')}`
const imageId = number => `11111111-1111-4111-8111-${String(number).padStart(12, '0')}`
const rows = ['Alpha gloves', 'Beta boots', 'Gamma helmets'].map((name, index) => ({
  id: id(index + 101), quotationProductId: id(index + 201), name,
  description: `Specification ${index + 1}\nPackaging ${index + 1}`, quantity: String(index + 2),
  unit: ['pair', 'pcs', 'set'][index], unitPrice: `${index + 11}.25`, unitCost: `${index + 4}.50`,
  images: [{ id: imageId(index + 1), kind: 'source', name: `Unique image ${index + 1}` }],
}))
const products = Array.from({ length: 36 }, (_, index) => ({
  id: id(index + 1), name: `${index < 30 ? 'Glove' : index < 32 ? 'Helmet' : index < 34 ? 'Custom' : 'Legacy'} ${String(index + 1).padStart(2, '0')}`,
  nameZh: index < 30 ? '防护手套' : '其他产品', internalNumber: `QP-${index + 1}`, model: `MODEL-${index + 1}`, sku: `SKU-${index + 1}`,
  description: 'Customer-facing description', specifications: 'Material: Cotton', packaging: '10 / bag',
  unit: 'pair', unitPrice: '12.50', currency: 'USD', active: true, images: [],
  ...(index === 35 ? {} : { category: index < 30 ? '防护手套' : index < 32 ? '安全帽' : index < 34 ? '特殊定制' : '' }),
}))
const mocks = `
export const unstable_rethrow=()=>{};
export const useRouter=()=>({push:url=>{window.__route=url},replace:url=>{window.__route=url},refresh:()=>{window.__refreshes++}});
export const usePathname=()=>window.location.pathname;
export const useSearchParams=()=>new URLSearchParams(window.location.search);
export const isQuotationWorkbenchEnabled=()=>true;
export const requireAdmin=async()=>({id:'isolated-admin'});
export const notFound=()=>{throw new Error('Unexpected missing fixture')};
export const redirect=url=>{throw Object.assign(new Error('Fixture redirect'),{redirectUrl:url})};
const matches=(product,where={})=>Object.entries(where).every(([key,condition])=>{
 if(key==='AND')return [].concat(condition).every(part=>matches(product,part));
 if(key==='OR')return condition.some(part=>matches(product,part));
 if(key==='NOT')return ![].concat(condition).some(part=>matches(product,part));
 const actual=product[key];
 if(condition===null||typeof condition!=='object')return actual===condition;
 return Object.entries(condition).every(([operation,value])=>{
  if(operation==='mode')return true;
  if(operation==='in')return value.includes(actual);
  if(operation==='notIn')return !value.includes(actual);
  if(operation==='not')return actual!==value;
  if(operation==='equals')return actual===value;
  if(operation==='contains')return String(actual||'').toLocaleLowerCase().includes(value.toLocaleLowerCase());
  if(operation==='startsWith')return String(actual||'').startsWith(value);
  throw new Error('Unsupported fixture filter '+key+'.'+operation);
 });
});
const productRows=()=>window.__products.map(product=>({...product,nameEn:product.name,status:'ACTIVE',updatedAt:new Date('2026-10-21T00:00:00Z'),images:[]}));
const settingRows=()=>window.__products.flatMap(product=>[
 {key:'quotation.product-defaults.'+product.id,value:{currency:product.currency,unitPrice:product.unitPrice}},
 ...(product.category?[{key:'quotation.product-category.'+product.id,value:{category:product.category}}]:[])
]);
export const prisma={
 quotationProduct:{findMany:async({where,take,skip=0})=>productRows().filter(product=>matches(product,where)).slice(skip,take===undefined?undefined:skip+take),count:async({where})=>productRows().filter(product=>matches(product,where)).length},
 setting:{findMany:async({where}={})=>settingRows().filter(setting=>matches(setting,where)),findUnique:async({where})=>settingRows().find(setting=>matches(setting,where))||null}
};
export async function loadCommonQuotationProducts(){window.__loads++;return {success:true,reason:'已加载',data:window.__products};}
export async function saveCommonQuotationProduct(input){window.__productSaves.push(input);return {success:true,reason:'已保存',data:{id:input.id||'c000000000000000000000900'}};}
export async function createSalesQuotation(input){
 window.__quoteSaves.push(input);
 return {success:true,reason:'已保存',data:{quotationId:'c000000000000000000000800',revisionId:'c000000000000000000000801',version:2,items:input.items.map((item,index)=>({id:item.id||'c'+String(index+600).padStart(24,'0'),assets:(item.imageSourceIds||[]).map(source=>({id:'c'+source.replaceAll('-','').slice(-24),displayName:'Saved image'}))}))}};
}
export const updateSalesQuotation=createSalesQuotation;
export async function finalizeSalesQuotation(){throw new Error('Category/order test must not finalize')}
export async function deleteCommonQuotationProduct(){throw new Error('Category/order test must not delete common products')}
export async function searchQuotationCatalog(){return {success:true,data:[]}}
export async function importQuotationCatalogProduct(){throw new Error('Category/order test must not import')}
`
const source = `
import React from 'react';import {createRoot} from 'react-dom/client';
import {SimpleQuotationEditor} from './src/components/admin/quotation/simple-editor';
import {CommonProductForm} from './src/components/admin/quotation/common-product-form';
import CommonProductsPage from './src/app/admin/quotation-products/page';
import {defaultWorkbenchSettings} from './src/lib/quotation/workbench-config';
const root=createRoot(document.getElementById('root'));let visit=0;
window.__products=${JSON.stringify(products)};window.__rows=${JSON.stringify(rows)};
window.__loads=0;window.__quoteSaves=[];window.__productSaves=[];window.__refreshes=0;
window.__render=(mode='editor',category='特殊定制')=>{
 const initial={customerName:'Isolated Customer',quotationDate:'2026-10-21',currency:'USD',terms:'Fixture terms',internalNotes:'',shippingFee:'0',discountAmount:'0',otherFee:'0',items:structuredClone(window.__rows)};
 if(mode==='new-editor')initial.items.forEach(item=>delete item.id);
 const product={id:'c000000000000000000000900',expectedUpdatedAt:'2026-10-21T00:00:00.000Z',name:'Saved custom product',description:'Keep this description',unit:'pcs',unitPrice:'3.50',currency:'USD',active:true,...(category===null?{}:{category})};
 root.render(<main key={++visit} className="mx-auto max-w-7xl p-4 md:p-6"><h1 className="mb-5 text-2xl font-semibold">分类和序号 · 隔离验证</h1>{mode==='editor'||mode==='new-editor'?<SimpleQuotationEditor customers={[]} settings={defaultWorkbenchSettings} initialValue={initial} revisionId={mode==='editor'?'c000000000000000000000801':undefined} quotationId={mode==='editor'?'c000000000000000000000800':undefined} expectedVersion={mode==='editor'?1:undefined}/>:<CommonProductForm categoryOptions={['防护手套','安全帽','特殊定制']} initialValue={mode==='edit'?product:undefined}/>}</main>);
};
window.__renderList=async()=>{let tree;try{tree=await CommonProductsPage({searchParams:Promise.resolve(Object.fromEntries(new URLSearchParams(location.search)))})}catch(error){if(error.redirectUrl){location.href=error.redirectUrl;return}throw error}root.render(<main className="mx-auto max-w-7xl p-4 md:p-6">{tree}</main>)};
if(location.pathname==='/admin/quotation-products')window.__renderList();else window.__render();
`
const bundle = await build({ stdin: { contents: source, resolveDir: process.cwd(), loader: 'tsx' }, bundle: true, write: false, platform: 'browser', format: 'iife', jsx: 'automatic', define: { 'process.env.NODE_ENV': '"development"' }, plugins: [{ name: 'category-order-fixture', setup(plugin) {
  plugin.onResolve({ filter: /^(next\/navigation|@\/lib\/(auth-utils|prisma|quotation\/feature)|@\/actions\/admin\/(common-quotation-products|sales-quotations|quotation-catalog))$/ }, () => ({ path: 'mock', namespace: 'fixture' }))
  plugin.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: mocks, loader: 'js', resolveDir: process.cwd() }))
  plugin.onResolve({ filter: /^next\/(link|image)$/ }, ({ path }) => ({ path, namespace: 'next-fixture' }))
  plugin.onLoad({ filter: /.*/, namespace: 'next-fixture' }, ({ path }) => ({ contents: path.endsWith('link') ? 'import React from "react";export default function Link(props){return <a {...props}/>}' : 'import React from "react";export default function Image({fill,unoptimized,priority,...props}){return <img {...props}/>} ', loader: 'jsx', resolveDir: process.cwd() }))
} }] })
const css = await postcss([tailwind()]).process(await readFile('src/app/globals.css', 'utf8'), { from: resolve('src/app/globals.css') })
const png = await sharp({ create: { width: 90, height: 90, channels: 3, background: '#0f766e' } }).png().toBuffer()
const server = createServer((request, response) => {
  response.setHeader('Cache-Control', 'no-store')
  if (request.url === '/app.js') { response.setHeader('Content-Type', 'application/javascript'); response.end(bundle.outputFiles[0].contents) }
  else if (request.url === '/app.css') { response.setHeader('Content-Type', 'text/css'); response.end(css.css) }
  else if (request.url?.startsWith('/api/admin/quotation-images/')) { response.setHeader('Content-Type', 'image/png'); response.end(png) }
  else if (request.url === '/' || request.url?.startsWith('/admin/quotation-products')) { response.setHeader('Content-Type', 'text/html; charset=utf-8'); response.end('<!doctype html><html lang="zh"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/app.css"><body style="background:#f1f5f7;font-family:Arial,Microsoft YaHei,sans-serif"><div id="root"></div><script src="/app.js"></script></body></html>') }
  else { response.statusCode = 404; response.end() }
})
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
const origin = `http://127.0.0.1:${server.address().port}`
const output = 'output/playwright/quotation-categories-order'
await mkdir(output, { recursive: true })
let browser
try {
  browser = await chromium.launch({ channel: 'msedge', headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } })
  page.setDefaultTimeout(10000)
  const errors = []; page.on('pageerror', error => errors.push(error.message))
  page.on('dialog', dialog => dialog.accept())
  await page.route('**/*', route => route.request().url().startsWith(origin) ? route.continue() : route.abort())
  await page.goto(origin)
  const nameInputs = () => page.getByLabel('产品名称', { exact: true })
  const lineSections = () => page.locator('section').filter({ has: nameInputs() })
  const position = index => page.getByLabel(`产品序号 ${index}`, { exact: true })
  const snapshot = () => lineSections().evaluateAll(nodes => nodes.map(node => {
    const field = text => [...node.querySelectorAll('label')].find(label => [...label.childNodes].filter(child => child.nodeType === Node.TEXT_NODE).map(child => child.textContent).join('').trim() === text)?.querySelector('input,textarea')?.value;
    return { name: field('产品名称'), description: field('规格 / 描述 / 包装'), quantity: field('数量'), unit: field('单位'), unitPrice: field('单价 · USD'), unitCost: field('成本单价 · USD'), images: [...node.querySelectorAll('[data-image-key]')].map(image => image.dataset.imageKey), marker: node.dataset.fixtureIdentity };
  }))
  const expectedRow = row => ({ name: row.name, description: row.description, quantity: row.quantity, unit: row.unit, unitPrice: row.unitPrice, unitCost: row.unitCost, images: row.images.map(image => `${image.kind}-${image.id}`), marker: row.name })
  const expectOrder = async order => {
    await page.waitForFunction(expected => [...document.querySelectorAll('input[placeholder="填写对客户展示的名称，中英文均可"]')].map(input => input.value).join('|') === expected.join('|'), order.map(row => row.name))
    assert.deepEqual(await snapshot(), order.map(expectedRow), 'All row fields, images and stable DOM identity move together')
    assert.deepEqual(await page.getByLabel(/^产品序号 /).evaluateAll(inputs => inputs.map(input => input.value)), order.map((_, index) => String(index + 1)))
  }
  await position(3).waitFor()
  await lineSections().evaluateAll(nodes => nodes.forEach(node => { node.dataset.fixtureIdentity = node.querySelector('input[placeholder="填写对客户展示的名称，中英文均可"]').value }))
  await expectOrder(rows)
  await position(3).fill('1'); await position(3).press('Enter'); await expectOrder([rows[2], rows[0], rows[1]])
  await position(1).fill('3'); await position(1).press('Tab'); await expectOrder(rows)
  await position(2).fill('2'); await position(2).press('Enter'); await expectOrder(rows)
  for (const invalid of ['0', '4', '1.5', 'letters', '']) {
    await position(2).fill(invalid); await position(2).press('Tab')
    await page.getByRole('alert').waitFor()
    assert.deepEqual(await snapshot(), rows.map(expectedRow), `Invalid position ${JSON.stringify(invalid)} keeps the full order`)
  }
  await position(2).fill('1'); await position(2).press('Escape'); await position(2).press('Tab'); await expectOrder(rows)
  await page.getByRole('button', { name: '上移产品 3', exact: true }).click(); await expectOrder([rows[0], rows[2], rows[1]])
  await page.getByRole('button', { name: '下移产品 2', exact: true }).click(); await expectOrder(rows)
  await position(3).fill('1'); await position(3).press('Enter'); await expectOrder([rows[2], rows[0], rows[1]])
  await page.screenshot({ path: `${output}/numeric-order-desktop.png`, fullPage: true, animations: 'disabled' })
  await page.getByRole('button', { name: '保存草稿', exact: true }).click()
  await page.waitForFunction(() => window.__quoteSaves.length === 1)
  const savedItems = await page.evaluate(() => window.__quoteSaves[0].items)
  assert.deepEqual(savedItems.map(item => ({ sortOrder: item.sortOrder, id: item.id, quotationProductId: item.quotationProductId, name: item.nameEn, quantity: item.quantity, unitPrice: item.unitPrice, unitCost: item.unitCost, imageSourceIds: item.imageSourceIds })), [rows[2], rows[0], rows[1]].map((row, index) => ({ sortOrder: index, id: row.id, quotationProductId: row.quotationProductId, name: row.name, quantity: row.quantity, unitPrice: row.unitPrice, unitCost: row.unitCost, imageSourceIds: row.images.map(image => image.id) })))
  assert.ok(savedItems.every(item => !('category' in item)), 'Grouping metadata never enters customer quote lines')
  await page.evaluate(() => window.__render('new-editor')); await position(3).waitFor()
  await lineSections().evaluateAll(nodes => nodes.forEach(node => { node.dataset.fixtureIdentity = node.querySelector('input[placeholder="填写对客户展示的名称，中英文均可"]').value }))
  await position(3).fill('1'); await position(3).press('Enter'); await expectOrder([rows[2], rows[0], rows[1]])
  await position(1).fill('3'); await position(1).press('Enter'); await expectOrder(rows)
  await page.getByRole('button', { name: '保存草稿', exact: true }).click()
  await page.waitForFunction(() => window.__quoteSaves.length === 2)
  await page.getByText('草稿已保存', { exact: true }).waitFor()
  assert.deepEqual(await lineSections().evaluateAll(nodes => nodes.map(node => node.dataset.fixtureIdentity)), rows.map(row => row.name), 'New rows retain their DOM identity when the save assigns database IDs')
  const newItems = await page.evaluate(() => window.__quoteSaves[1].items)
  assert.deepEqual(newItems.map(item => item.sortOrder), [0, 1, 2])
  assert.ok(newItems.every(item => item.id === undefined), 'Unsaved rows are tested without persisted IDs')
  await page.evaluate(() => window.__render()); await position(3).waitFor()
  await page.getByRole('button', { name: '添加产品明细', exact: true }).click(); await position(4).waitFor()
  await page.getByRole('button', { name: '删除产品 2', exact: true }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: '确认继续', exact: true }).click()
  assert.deepEqual(await page.getByLabel(/^产品序号 /).evaluateAll(inputs => inputs.map(input => input.value)), ['1', '2', '3'])
  assert.deepEqual(await nameInputs().evaluateAll(inputs => inputs.map(input => input.value)), [rows[0].name, rows[2].name, ''])

  const panel = () => page.getByRole('dialog', { name: '选择常用产品', exact: true })
  const category = scope => scope.getByLabel('筛选产品分类', { exact: true })
  const choices = () => panel().getByRole('button', { name: /^选择 / })
  await page.getByRole('button', { name: '选择常用产品 3', exact: true }).click(); await panel().waitFor()
  await choices().first().waitFor(); assert.equal(await choices().count(), 36)
  await category(panel()).selectOption('防护手套'); assert.equal(await choices().count(), 30)
  await panel().getByLabel('搜索常用产品', { exact: true }).fill('01'); assert.equal(await choices().count(), 1)
  await page.keyboard.press('Escape'); await panel().waitFor({ state: 'hidden' })
  await page.getByRole('button', { name: '选择常用产品 1', exact: true }).click(); await panel().waitFor()
  assert.equal(await category(panel()).inputValue(), '防护手套'); assert.equal(await panel().getByLabel('搜索常用产品', { exact: true }).inputValue(), '01')
  await category(panel()).selectOption('安全帽'); assert.equal(await choices().count(), 0)
  await panel().getByLabel('搜索常用产品', { exact: true }).fill(''); assert.equal(await choices().count(), 2)
  await category(panel()).selectOption('__uncategorized__'); assert.equal(await choices().count(), 2)
  await category(panel()).selectOption('特殊定制'); assert.equal(await choices().count(), 2)
  await category(panel()).selectOption(''); assert.equal(await choices().count(), 36)
  assert.equal(await page.evaluate(() => window.__loads), 1, 'Category/text filters and another target row reuse the visit cache')
  await page.setViewportSize({ width: 390, height: 844 })
  assert.equal(await panel().evaluate(node => node.scrollWidth <= node.clientWidth), true, 'Category filtering fits a mobile drawer')
  await page.screenshot({ path: `${output}/categories-picker-mobile.png`, animations: 'disabled' })
  await page.keyboard.press('Escape'); await panel().waitFor({ state: 'hidden' })
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
  await position(1).scrollIntoViewIfNeeded()
  await page.screenshot({ path: `${output}/numeric-order-mobile.png`, animations: 'disabled' })

  await page.setViewportSize({ width: 1440, height: 1100 })
  await page.evaluate(() => window.__render('create'))
  const formCategory = () => page.getByLabel('产品分类', { exact: true })
  await formCategory().waitFor(); assert.equal(await formCategory().inputValue(), '')
  assert.ok(await formCategory().getAttribute('list'), 'Category accepts editable suggestions through a datalist')
  await nameInputs().fill('New category product'); await formCategory().fill('  客户专用分类  ')
  await page.getByRole('button', { name: '保存常用产品', exact: true }).click()
  await page.waitForFunction(() => window.__productSaves.length === 1)
  assert.equal(await page.evaluate(() => window.__productSaves[0].category), '客户专用分类')
  await page.evaluate(() => window.__render('edit')); await formCategory().waitFor()
  assert.equal(await formCategory().inputValue(), '特殊定制')
  await formCategory().fill('防护手套'); await page.getByRole('button', { name: '保存常用产品', exact: true }).click()
  await page.waitForFunction(() => window.__productSaves.length === 2)
  assert.equal(await page.evaluate(() => window.__productSaves[1].category), '防护手套')
  assert.equal(await page.evaluate(() => window.__productSaves[1].description), 'Keep this description')
  await page.evaluate(() => window.__render('edit')); await formCategory().waitFor()
  await formCategory().fill(''); await page.getByRole('button', { name: '保存常用产品', exact: true }).click()
  await page.waitForFunction(() => window.__productSaves.length === 3)
  assert.equal(await page.evaluate(() => window.__productSaves[2].category), '')
  await page.evaluate(() => window.__render('edit', null)); await formCategory().waitFor()
  assert.equal(await formCategory().inputValue(), '', 'Legacy products without category remain editable')
  await page.screenshot({ path: `${output}/category-form-desktop.png`, fullPage: true, animations: 'disabled' })

  await page.goto(`${origin}/admin/quotation-products?category=${encodeURIComponent('防护手套')}&page=2`)
  await category(page).waitFor(); assert.equal(await category(page).inputValue(), '防护手套')
  assert.equal(await page.locator('article').count(), 6, 'Category filtering happens before pagination')
  await page.getByText(/30 个/).first().waitFor()
  const pageOne = new URL(await page.getByRole('link', { name: 'Go to page 1', exact: true }).getAttribute('href'), origin)
  assert.equal(pageOne.searchParams.get('category'), '防护手套')
  await page.getByLabel('搜索常用产品', { exact: true }).fill('01')
  await page.getByRole('button', { name: '搜索', exact: true }).click()
  await page.waitForURL(url => url.searchParams.get('search') === '01' && !url.searchParams.has('page'))
  await page.getByRole('heading', { name: 'Glove 01', exact: true }).waitFor(); assert.equal(await page.locator('article').count(), 1)
  assert.equal(new URL(page.url()).searchParams.get('category'), '防护手套')
  await page.getByLabel('搜索常用产品', { exact: true }).fill('')
  await category(page).selectOption('__uncategorized__'); await page.getByRole('button', { name: '搜索', exact: true }).click()
  await page.waitForURL(url => url.searchParams.get('category') === '__uncategorized__')
  await page.getByRole('heading', { name: 'Legacy 35', exact: true }).waitFor(); assert.equal(await page.locator('article').count(), 2)
  await category(page).selectOption('特殊定制'); await page.getByRole('button', { name: '搜索', exact: true }).click()
  await page.waitForURL(url => url.searchParams.get('category') === '特殊定制')
  await page.getByRole('heading', { name: 'Custom 33', exact: true }).waitFor(); assert.equal(await page.locator('article').count(), 2)
  await page.screenshot({ path: `${output}/categories-list-desktop.png`, fullPage: true, animations: 'disabled' })
  await category(page).selectOption(''); await page.getByRole('button', { name: '搜索', exact: true }).click()
  await page.waitForURL(url => !url.searchParams.get('category'))
  await page.getByRole('heading', { name: 'Glove 01', exact: true }).waitFor(); assert.equal(await page.locator('article').count(), 24)
  await page.setViewportSize({ width: 390, height: 844 })
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
  await page.screenshot({ path: `${output}/categories-list-mobile.png`, animations: 'disabled' })
  assert.deepEqual(errors, [])
  console.log('PASS: full-row numeric insertion order, invalid/no-op/Escape positions, stable DOM identity, arrows/add/delete renumbering, saved IDs/images/sortOrder; custom category create/edit/clear/legacy fields, picker intersection/cache, category list filtering before pagination, GET query preservation and mobile layouts. Real components with isolated I/O; no live writes.')
} finally { await browser?.close(); await new Promise(resolve => server.close(resolve)) }
