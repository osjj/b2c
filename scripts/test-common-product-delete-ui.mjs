// Real list/detail routes and client controls. Action/DB/navigation I/O is isolated.
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { mkdir, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { build } from 'esbuild'
import postcss from 'postcss'
import tailwind from '@tailwindcss/postcss'
import { chromium } from 'playwright'

const mocks = `
export const unstable_rethrow=()=>{};
export const notFound=()=>{throw new Error('Fixture record absent')};
export const redirect=url=>{throw Object.assign(new Error('Fixture redirect'),{redirectUrl:url})};
export const usePathname=()=>window.__route.split('?')[0];
export const useSearchParams=()=>new URLSearchParams(window.__route.split('?')[1]);
export const useRouter=()=>({push:route=>{window.__pushed=route;window.__route=route},refresh:()=>{window.__refreshes++;window.__renderFixture()}});
export const isQuotationWorkbenchEnabled=()=>true;
export async function requireAdmin(){return {id:'admin'}};
export const prisma={quotationProduct:{findMany:async({skip=0,take=24})=>window.__products.slice(skip,skip+take),count:async()=>window.__products.length,findUnique:async({where})=>window.__products.find(p=>p.id===where.id)},setting:{findMany:async()=>[],findUnique:async()=>null}};
export async function deleteCommonQuotationProduct(input){
  window.__deleteCalls.push(input);
  if(window.__holdDelete)await new Promise(resolve=>{window.__releaseDelete=resolve});
  else await new Promise(resolve=>setTimeout(resolve,150));
  if(window.__failure==='throw')throw new Error('Fixture network uncertainty');
  if(window.__failure)return {success:false,code:window.__failure,reason:window.__failure==='REFERENCED_RECORD'?'此常用产品已被报价行或成本记录引用，无法删除。请在编辑页面停用。':'常用产品已更新，请刷新后确认最新资料再删除'};
  window.__products=window.__products.filter(p=>p.id!==input.id);
  return {success:true,reason:'常用产品已删除',data:{id:input.id}};
}
export async function searchQuotationCatalog(){return {success:true,data:[]}};
export async function importQuotationCatalogProduct(){return {success:false,reason:'Unused fixture'}};
export async function reimportCommonProductImages(){return {success:false,reason:'Unused fixture'}};
export async function saveCommonQuotationProduct(){return {success:false,reason:'Unused fixture'}};
export async function saveCommonProductImages(){return {success:false,reason:'Unused fixture'}};
`
const source = `
import React from 'react';
import {createRoot} from 'react-dom/client';
import ListPage from './src/app/admin/quotation-products/page';
import DetailPage from './src/app/admin/quotation-products/[id]/page';
const root=createRoot(document.getElementById('root'));
const firstId='c000000000000000000000001';
window.__resetFixture=(route='/admin/quotation-products',longName=false)=>{
 window.__products=[{id:firstId,productId:null,nameEn:longName?'VeryLongProductName'.repeat(20):'测试防护手套',nameZh:null,unit:'pcs',status:'ACTIVE',updatedAt:new Date('2026-10-08T01:00:00Z'),images:[],specifications:[]},{id:'c000000000000000000000002',nameEn:'测试护目镜',unit:'pcs',status:'INACTIVE',updatedAt:new Date('2026-10-08T01:00:00Z'),images:[]}];
 window.__route=route;window.__deleteCalls=[];window.__failure='';window.__refreshes=0;window.__pushed='';window.__fixtureVersion=(window.__fixtureVersion||0)+1;
 window.__holdDelete=false;window.__releaseDelete=null;
 return window.__renderFixture();
};
window.__renderFixture=async()=>{
 const route=window.__route;
 const url=new URL(route,'http://fixture.local');
 let tree;
 try {tree=url.pathname==='/admin/quotation-products'?await ListPage({searchParams:Promise.resolve(Object.fromEntries(url.searchParams))}):await DetailPage({params:Promise.resolve({id:firstId})})}
 catch(error){if(error.redirectUrl){window.__route=error.redirectUrl;window.__redirected=error.redirectUrl;return window.__renderFixture()}throw error}
 root.render(<main key={route+'-'+window.__fixtureVersion} className="mx-auto max-w-7xl p-6"><p className="mb-5 text-sm text-slate-500">隔离界面检查 · 常用产品删除</p>{tree}</main>);
};
window.__resetFixture();
`
const bundle = await build({ stdin: { contents: source, resolveDir: process.cwd(), loader: 'tsx' }, bundle: true, write: false, platform: 'browser', format: 'iife', jsx: 'automatic', define: { 'process.env.NODE_ENV': '"development"' }, plugins: [{ name: 'delete-ui-fixture', setup(plugin) {
  plugin.onResolve({ filter: /^(next\/navigation|@\/lib\/(auth-utils|prisma|quotation\/feature)|@\/actions\/admin\/(common-quotation-products|quotation-catalog))$/ }, () => ({ path: 'mock', namespace: 'fixture' }))
  plugin.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: mocks, loader: 'js', resolveDir: process.cwd() }))
  plugin.onResolve({ filter: /^next\/(link|image)$/ }, ({ path }) => ({ path, namespace: 'next-fixture' }))
  plugin.onLoad({ filter: /.*/, namespace: 'next-fixture' }, ({ path }) => ({ contents: path.endsWith('link') ? 'import React from "react";export default function Link(props){return <a {...props}/>}' : 'import React from "react";export default function Image({fill,unoptimized,...props}){return <img {...props}/>} ', loader: 'jsx', resolveDir: process.cwd() }))
} }] })
const css = await postcss([tailwind()]).process(await readFile('src/app/globals.css', 'utf8'), { from: resolve('src/app/globals.css') })
const server = createServer((request, response) => {
  response.setHeader('Content-Type', request.url === '/app.js' ? 'application/javascript' : request.url === '/app.css' ? 'text/css' : 'text/html; charset=utf-8')
  response.end(request.url === '/app.js' ? bundle.outputFiles[0].contents : request.url === '/app.css' ? css.css : '<!doctype html><html lang="zh"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/app.css"><body style="background:#f1f5f7;font-family:Arial,Microsoft YaHei,sans-serif"><div id="root"></div><script src="/app.js"></script></body></html>')
})
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
const origin = `http://127.0.0.1:${server.address().port}`
await mkdir('output/playwright/common-product-delete', { recursive: true })
let browser
try {
  browser = await chromium.launch({ channel: 'msedge', headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } })
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.route('**/*', route => route.request().url().startsWith(origin) ? route.continue() : route.abort())
  await page.goto(origin)
  const firstDelete = () => page.getByRole('button', { name: '删除常用产品“测试防护手套”', exact: true })
  const confirm = () => page.getByRole('alertdialog').getByRole('button', { name: '确认继续', exact: true })
  const reset = async (detail = false, longName = false) => {
    await page.evaluate(({ detail, longName }) => window.__resetFixture(detail ? '/admin/quotation-products/c000000000000000000000001' : '/admin/quotation-products', longName), { detail, longName })
    await page.getByRole('heading', { name: detail ? '编辑常用产品' : '常用产品', exact: true }).waitFor()
  }
  await firstDelete().waitFor()
  assert.equal(await page.locator('article a button').count(), 0, 'Delete controls are outside edit links')
  assert.equal(await page.locator('article').count(), 2)
  await firstDelete().focus(); await page.keyboard.press('Enter')
  await page.getByRole('alertdialog').waitFor()
  assert.match(await page.getByRole('alertdialog').innerText(), /测试防护手套.*私有图片文件/s)
  await page.getByRole('alertdialog').getByRole('button', { name: '取消', exact: true }).click()
  assert.deepEqual(await page.evaluate(() => window.__deleteCalls), [])
  await firstDelete().click(); await page.keyboard.press('Escape')
  assert.deepEqual(await page.evaluate(() => window.__deleteCalls), [])
  await page.screenshot({ path: 'output/playwright/common-product-delete/list-desktop.png', fullPage: true, animations: 'disabled' })
  await firstDelete().click()
  await page.screenshot({ path: 'output/playwright/common-product-delete/confirm-desktop.png', fullPage: true, animations: 'disabled' })
  await page.evaluate(() => { window.__holdDelete = true })
  await confirm().evaluate(node => { node.click(); node.click() })
  await page.getByRole('status').filter({ hasText: '正在删除' }).waitFor()
  assert.equal(await firstDelete().isDisabled(), true)
  await firstDelete().evaluate(node => node.click())
  assert.equal(await page.evaluate(() => window.__deleteCalls.length), 1)
  await page.evaluate(() => { window.__holdDelete = false; window.__releaseDelete() })
  await page.waitForFunction(() => window.__products.length === 1)
  await firstDelete().waitFor({ state: 'detached' })
  assert.equal(await page.evaluate(() => window.__deleteCalls.length), 1)
  assert.deepEqual(await page.evaluate(() => window.__deleteCalls[0]), { id: 'c000000000000000000000001', expectedUpdatedAt: '2026-10-08T01:00:00.000Z' })
  assert.ok(await page.evaluate(() => window.__refreshes) > 0)
  await page.getByRole('button', { name: '删除常用产品“测试护目镜”', exact: true }).click(); await confirm().click()
  await page.getByText('暂无常用产品，可手动添加或从商城导入。', { exact: true }).waitFor()
  for (const failure of ['REFERENCED_RECORD', 'VERSION_CONFLICT', 'INTERNAL_ERROR', 'throw']) {
    await reset()
    await page.evaluate(failure => { window.__failure = failure }, failure)
    await firstDelete().click(); await confirm().click()
    await page.getByRole('alert').waitFor()
    assert.match(await page.getByRole('alert').innerText(), failure === 'REFERENCED_RECORD' ? /停用/ : /刷新/)
    assert.equal(await page.locator('article').count(), 2)
    assert.equal(await page.evaluate(() => window.__deleteCalls.length), 1)
    if (failure === 'throw' || failure === 'INTERNAL_ERROR') {
      assert.equal(await firstDelete().isDisabled(), true, 'Uncertain deletion cannot retry until explicit reload')
      await Promise.all([
        page.waitForEvent('load'),
        page.getByRole('button', { name: '刷新页面', exact: true }).click(),
      ])
      await firstDelete().waitFor()
      assert.equal(await firstDelete().isEnabled(), true)
    } else {
      const refreshBefore = await page.evaluate(() => window.__refreshes)
      await page.getByRole('button', { name: '刷新页面', exact: true }).click()
      await page.waitForFunction(before => window.__refreshes > before, refreshBefore)
    }
  }
  await reset(true)
  await firstDelete().click(); await confirm().click()
  await page.getByRole('heading', { name: '常用产品', exact: true }).waitFor()
  assert.equal(await page.evaluate(() => window.__pushed), '/admin/quotation-products')
  assert.equal(await page.evaluate(() => window.__deleteCalls.length), 1)
  assert.equal(await page.locator('article').count(), 1)
  await page.evaluate(async () => { window.__route = '/admin/quotation-products?page=2&search=glove'; await window.__renderFixture() })
  await page.waitForFunction(() => window.__redirected === '/admin/quotation-products?page=1&search=glove')
  assert.equal(await page.locator('article').count(), 1, 'Out-of-range deletion page returns to last valid page and retains search')
  await page.setViewportSize({ width: 390, height: 844 })
  await reset(); await firstDelete().click()
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, 'Mobile confirmation fits viewport')
  await page.screenshot({ path: 'output/playwright/common-product-delete/confirm-mobile.png', animations: 'disabled' })
  await page.getByRole('alertdialog').getByRole('button', { name: '取消', exact: true }).click()
  await page.screenshot({ path: 'output/playwright/common-product-delete/list-mobile.png', fullPage: true, animations: 'disabled' })
  await reset(true)
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, 'Mobile edit page fits viewport')
  await reset(false, true)
  await page.getByRole('button', { name: /^删除常用产品/ }).first().click()
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, 'Long product name confirmation fits viewport')
  await page.screenshot({ path: 'output/playwright/common-product-delete/confirm-long-name-mobile.png', animations: 'disabled' })
  const longDialog = await page.getByRole('alertdialog').evaluate(node => ({ scroll: node.scrollWidth, client: node.clientWidth, description: [...node.querySelectorAll('[data-slot=alert-dialog-description]')].map(p => ({ scroll: p.scrollWidth, client: p.clientWidth, wrap: getComputedStyle(p).overflowWrap, words: getComputedStyle(p).wordBreak, className: p.className })) }))
  assert.equal(longDialog.scroll <= longDialog.client, true, `Long product name wraps inside the dialog: ${JSON.stringify(longDialog)}`)
  assert.deepEqual(errors, [])
  console.log('PASS: real list/detail rendering, keyboard/cancel/escape, single confirmed request/pending guard, empty list, reference/version/network errors, explicit refresh, edit return, 390px layouts and long product name. All action/DB/navigation I/O isolated.')
} finally {
  await browser?.close()
  await new Promise(resolve => server.close(resolve))
}
