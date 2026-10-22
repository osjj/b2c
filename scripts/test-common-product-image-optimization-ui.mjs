// Real React/UI with isolated action and authenticated-image fixtures. No production I/O.
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { build } from 'esbuild'
import postcss from 'postcss'
import tailwind from '@tailwindcss/postcss'
import { chromium } from 'playwright'

const output = resolve('output/playwright/common-product-image-optimization')
await mkdir(output, { recursive: true })
const productId = index => `c${String(index).padStart(24, '0')}`
const imageId = index => `c${String(100 + index).padStart(24, '0')}`
const sourceId = index => `11111111-1111-4111-8111-${String(index).padStart(12, '0')}`
const stamp = '2026-10-22T00:00:00.000Z'
const fixtureImage = (index, name, status = 'pending', extra = {}) => ({ id: imageId(index), sourceFileId: sourceId(index), name, sizeBytes: 3 * 1024 * 1024, status, reason: status === 'pending' ? '可优化' : `Fixture ${status}`, originalSourceFileId: null, ...extra })
const products = [
  { id: productId(1), name: '棉纱手套 / Cotton work gloves', updatedAt: stamp, images: [fixtureImage(1, 'glove-front.jpg'), fixtureImage(2, 'glove-label.png')] },
  { id: productId(2), name: `安全鞋 / Safety shoes ${'LongName'.repeat(12)}`, updatedAt: stamp, images: [fixtureImage(3, 'shoe-detail.jpg'), fixtureImage(4, 'small.png', 'small', { sizeBytes: 1024 }), fixtureImage(5, 'already-optimized.jpg', 'optimized', { sizeBytes: 2048, originalSourceFileId: sourceId(50) }), fixtureImage(6, 'checked-original.png', 'unchanged'), fixtureImage(7, 'missing.jpg', 'unsupported', { sourceFileId: null, sizeBytes: 0 })] },
]
const fixture = JSON.stringify(products)
const actions = `
export async function scanCommonProductImageOptimization(input){
  const state=window.__state;state.scanCalls.push(structuredClone(input));
  if(state.scenario==='scan-hold'&&!input.cursor)await new Promise(resolve=>{state.releaseScan=resolve});
  if(state.scenario==='scan-failure'&&input.cursor)return {success:false,reason:'Fixture scan interrupted',code:'INTERNAL_ERROR'};
  if(state.scenario==='scan-malformed')return {success:true,reason:'Fixture malformed scan',data:{products:'invalid',nextCursor:null}};
  if(state.scenario==='empty')return {success:true,reason:'Fixture empty',data:{products:[],nextCursor:null}};
  return {success:true,reason:'Fixture metadata scan',data:{products:[structuredClone(window.__products[input.cursor?1:0])],nextCursor:input.cursor?null:window.__products[0].id}};
}
export async function optimizeCommonProductImage(input){
  const state=window.__state;state.optimizeCalls.push(structuredClone(input));state.active++;state.maxActive=Math.max(state.maxActive,state.active);
  const call=state.optimizeCalls.length;
  try{
    if(state.hold)await new Promise(resolve=>{state.release=resolve});
    if((state.scenario==='known-failure'&&call===1)||(state.scenario==='known-after-success'&&call===2))return {success:false,reason:'Fixture version conflict',code:'VERSION_CONFLICT'};
    if((state.scenario==='network-failure'&&call===1)||(state.scenario==='network-after-success'&&call===2))throw new Error('Fixture transport failure');
    if(state.scenario==='internal-failure'&&call===1)return {success:false,reason:'Fixture unknown commit',code:'INTERNAL_ERROR'};
    if(state.scenario==='malformed-result'&&call===1)return {success:true,reason:'Fixture invalid data',data:{status:'optimized'}};
    const item=window.__products.flatMap(product=>product.images).find(image=>image.id===input.imageId);
    if(state.scenario==='unchanged-first'&&call===1)return {success:true,reason:'Fixture checked no benefit',data:{productId:input.productId,imageId:input.imageId,updatedAt:input.expectedUpdatedAt,status:'unchanged',sourceFileId:input.sourceFileId,originalSourceFileId:input.sourceFileId,beforeBytes:item.sizeBytes,afterBytes:item.sizeBytes}};
    return {success:true,reason:'Fixture optimized',data:{productId:state.scenario==='mismatched-result'&&call===1?window.__products[1].id:input.productId,imageId:input.imageId,updatedAt:'2026-10-22T00:00:'+String(call).padStart(2,'0')+'.000Z',status:'optimized',sourceFileId:'99999999-9999-4999-8999-'+String(call).padStart(12,'0'),originalSourceFileId:input.sourceFileId,beforeBytes:item.sizeBytes,afterBytes:1024*1024}};
  }finally{state.active--}
}
`
const source = `
import React from 'react';import {createRoot} from 'react-dom/client';
import {CommonProductImageOptimization} from './src/components/admin/quotation/common-product-image-optimization';
window.__products=${fixture};const root=createRoot(document.getElementById('root'));let version=0;
window.__reset=(scenario='success',hold=false)=>{window.__state={scenario,hold,scanCalls:[],optimizeCalls:[],active:0,maxActive:0,release:null,releaseScan:null};version++;root.render(<main key={version} data-fixture-version={version} className="mx-auto max-w-6xl p-5"><CommonProductImageOptimization/></main>);return version};
window.__unmount=()=>root.render(<main data-fixture-unmounted>Fixture navigated away</main>);
window.__reset();
`
const bundle = await build({ stdin: { contents: source, resolveDir: process.cwd(), loader: 'tsx' }, bundle: true, write: false, platform: 'browser', format: 'iife', jsx: 'automatic', define: { 'process.env.NODE_ENV': '"development"' }, plugins: [{ name: 'optimization-ui-fixture', setup(plugin) {
  plugin.onResolve({ filter: /^@\/actions\/admin\/common-product-image-optimization$/ }, () => ({ path: 'actions', namespace: 'fixture' }))
  plugin.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: actions, loader: 'js', resolveDir: process.cwd() }))
  plugin.onResolve({ filter: /^next\/(link|image|navigation)$/ }, ({ path }) => ({ path, namespace: 'next-fixture' }))
  plugin.onLoad({ filter: /.*/, namespace: 'next-fixture' }, ({ path }) => ({ contents: path.endsWith('navigation') ? 'export const useRouter=()=>({refresh:()=>{},push:()=>{}})' : path.endsWith('link') ? 'import React from "react";export default function Link(props){return <a {...props}/>}' : 'import React from "react";export default function Image({unoptimized,fill,...props}){return <img {...props}/>} ', loader: 'jsx', resolveDir: process.cwd() }))
} }] })
const css = await postcss([tailwind()]).process(await readFile('src/app/globals.css', 'utf8'), { from: resolve('src/app/globals.css') })
const imageRequests = []
const unexpectedRequests = []
const thumbnail = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400"><rect width="600" height="400" fill="#e2e8f0"/><rect x="90" y="60" width="420" height="280" rx="20" fill="#0f766e"/><text x="140" y="210" fill="white" font-size="32">PRIVATE IMAGE</text></svg>')
const server = createServer((request, response) => {
  if (request.url === '/app.js') { response.setHeader('Content-Type', 'application/javascript'); response.end(bundle.outputFiles[0].contents) }
  else if (request.url === '/app.css') { response.setHeader('Content-Type', 'text/css'); response.end(css.css) }
  else if (request.url?.startsWith('/api/admin/quotation-images/')) { imageRequests.push(request.url); response.setHeader('Content-Type', 'image/svg+xml'); response.end(thumbnail) }
  else if (request.url === '/' || request.url === '/favicon.ico') { response.setHeader('Content-Type', 'text/html; charset=utf-8'); response.end('<!doctype html><html lang="zh"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/app.css"><body style="background:#f1f5f7;font-family:Arial,Microsoft YaHei,sans-serif"><div id="root"></div><script src="/app.js"></script></body></html>') }
  else { unexpectedRequests.push(`${request.method} ${request.url}`); response.statusCode = 404; response.end('No real network access in fixture') }
})
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
const origin = `http://127.0.0.1:${server.address().port}`
const report = { checks: [] }
let browser
try {
  browser = await chromium.launch({ channel: 'msedge', headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } })
  const errors = []; page.on('pageerror', error => errors.push(error.message))
  await page.route('**/*', route => route.request().url().startsWith(origin) ? route.continue() : route.abort())
  await page.goto(origin)
  const scanButton = () => page.getByRole('button', { name: /^(扫描图片|重新扫描|正在扫描…)$/ })
  const startButton = () => page.getByRole('button', { name: /开始优化/ })
  const stopButton = () => page.getByRole('button', { name: /完成当前图片后停止/ })
  const card = index => page.locator(`[data-optimization-image="${imageId(index)}"]`)
  const selectedBox = index => card(index).getByRole('checkbox')
  const state = () => page.evaluate(() => ({ scanCalls: window.__state.scanCalls, optimizeCalls: window.__state.optimizeCalls, active: window.__state.active, maxActive: window.__state.maxActive }))
  const reset = async (scenario = 'success', hold = false) => { const version = await page.evaluate(({ scenario, hold }) => window.__reset(scenario, hold), { scenario, hold }); await page.locator(`[data-fixture-version="${version}"]`).waitFor(); await scanButton().waitFor() }
  const scan = async () => { const before = (await state()).scanCalls.length; await scanButton().click(); await card(7).waitFor(); await page.waitForFunction(count => window.__state.scanCalls.length === count + 2, before); await settled() }
  const confirm = async (twice = false) => { await startButton().click(); const button = page.getByRole('button', { name: '确认继续', exact: true }); await button.waitFor(); if (twice) await button.evaluate(node => { node.click(); node.click() }); else await button.click() }
  const release = async () => { await page.evaluate(() => { window.__state.hold = false; const release = window.__state.release; window.__state.release = null; release() }) }
  const settled = async () => { await page.waitForFunction(() => window.__state.active === 0); await scanButton().waitFor({ state: 'visible' }); await page.waitForFunction(() => [...document.querySelectorAll('button')].some(button => /^(扫描图片|重新扫描)$/.test(button.textContent) && !button.disabled)) }

  await scanButton().waitFor()
  assert.deepEqual(await state(), { scanCalls: [], optimizeCalls: [], active: 0, maxActive: 0 }, 'Page visit never executes scan or mutation')
  await scan()
  assert.deepEqual((await state()).scanCalls, [{}, { cursor: productId(1) }], 'Read-only keyset pagination follows every page')
  assert.deepEqual((await state()).optimizeCalls, [], 'Scanning never writes')
  assert.equal(await selectedBox(1).isChecked(), true)
  assert.equal(await selectedBox(2).isChecked(), true)
  assert.equal(await selectedBox(3).isChecked(), true)
  assert.equal(await selectedBox(4).isDisabled(), true, 'Small image has no enabled selection')
  assert.equal(await selectedBox(5).isDisabled(), true, 'Prior optimization has no enabled selection')
  const selectAll = page.getByRole('checkbox', { name: /全选/ })
  await selectAll.uncheck()
  assert.equal(await selectedBox(1).isChecked(), false)
  assert.equal(await selectedBox(2).isChecked(), false)
  assert.equal(await selectedBox(3).isChecked(), false)
  assert.equal(await startButton().isDisabled(), true)
  await selectAll.check()
  await selectedBox(2).uncheck()
  await startButton().click()
  await page.getByRole('alertdialog').waitFor()
  await page.getByRole('button', { name: '取消', exact: true }).click()
  assert.deepEqual((await state()).optimizeCalls, [], 'Cancel confirmation never invokes optimize')
  await page.screenshot({ path: resolve(output, 'scanned-desktop.png'), fullPage: true, animations: 'disabled' })

  // Current and original previews always use only the private authenticated image route.
  const originalPreview = card(5).getByRole('button', { name: /原图/ })
  await originalPreview.click()
  await page.getByRole('dialog').waitFor()
  assert.equal(await page.getByRole('dialog').locator('img').getAttribute('src'), `/api/admin/quotation-images/${sourceId(50)}?kind=source`)
  await page.keyboard.press('Escape')
  await page.getByRole('dialog').waitFor({ state: 'hidden' })
  const currentPreview = card(1).getByRole('button', { name: /放大查看/ }).first()
  await currentPreview.click()
  assert.equal(await page.getByRole('dialog').locator('img').getAttribute('src'), `/api/admin/quotation-images/${sourceId(1)}?kind=source`)
  await page.keyboard.press('Escape')
  await confirm(); await settled()
  assert.deepEqual((await state()).optimizeCalls.map(input => input.imageId), [imageId(1), imageId(3)], 'Only checked images are processed')
  assert.equal(await selectedBox(2).isChecked(), false, 'Unchecked image stays untouched')
  report.checks.push('No automatic writes; complete keyset scan; eligible selection; cancel; authenticated original and current previews')

  await reset('scan-hold')
  await scanButton().evaluate(node => { node.click(); node.click() })
  await page.waitForFunction(() => Boolean(window.__state.releaseScan))
  assert.equal((await state()).scanCalls.length, 1, 'Immediate scan guard rejects duplicate click')
  await page.evaluate(() => { window.__state.scenario = 'success'; window.__state.releaseScan() })
  await card(7).waitFor()
  await settled()

  // An incomplete scan must never leave a processable first page.
  await reset('scan-failure')
  await scanButton().click()
  await page.getByRole('alert').waitFor()
  assert.equal((await state()).scanCalls.length, 2)
  assert.equal((await state()).optimizeCalls.length, 0)
  assert.equal(await startButton().count() === 0 || await startButton().isDisabled(), true)
  assert.equal(await page.locator('input[type=checkbox]:enabled').count(), 0, 'Partial scan never exposes selectable candidates')
  await reset('scan-malformed')
  await scanButton().click(); await page.getByRole('alert').waitFor()
  assert.equal(await startButton().count() === 0 || await startButton().isDisabled(), true)
  report.checks.push('Duplicate scan guard; interrupted/malformed scan rejects partial optimization')

  // Successful selection processes one image at a time and chains the product version.
  await reset('success', true); await scan(); await confirm(true)
  await page.waitForFunction(() => Boolean(window.__state.release))
  assert.equal((await state()).optimizeCalls.length, 1, 'Duplicate confirmation cannot start two batches')
  assert.equal(await scanButton().isDisabled(), true)
  assert.equal(await selectedBox(1).isDisabled(), true)
  assert.equal(await selectedBox(2).isDisabled(), true)
  await page.screenshot({ path: resolve(output, 'running-desktop.png'), fullPage: true, animations: 'disabled' })
  await release()
  await page.waitForFunction(() => window.__state.optimizeCalls.length === 3 && window.__state.active === 0)
  await settled()
  const success = await state()
  assert.equal(success.maxActive, 1)
  assert.deepEqual(success.optimizeCalls.map(input => input.imageId), [imageId(1), imageId(2), imageId(3)])
  assert.deepEqual(success.optimizeCalls.map(input => input.expectedUpdatedAt), [stamp, '2026-10-22T00:00:01.000Z', stamp])
  assert.equal(new Set(success.optimizeCalls.map(input => input.requestId)).size, 3)
  for (const input of success.optimizeCalls) assert.match(input.requestId, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
  assert.match(await card(1).innerText(), /3\.0 MB → 1\.0 MB/)
  assert.match(await card(2).innerText(), /3\.0 MB → 1\.0 MB/)
  await page.screenshot({ path: resolve(output, 'completed-desktop.png'), fullPage: true, animations: 'disabled' })
  await page.setViewportSize({ width: 390, height: 844 })
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, '390px layout has no page overflow')
  await page.screenshot({ path: resolve(output, 'completed-mobile.png'), fullPage: true, animations: 'disabled' })
  await page.setViewportSize({ width: 1440, height: 1100 })
  report.checks.push('Sequential action max=1; unique request IDs; same-product timestamp chaining; selection disabled; duplicate-confirm guard; desktop and 390px')

  await reset('success', true); await scan(); await confirm()
  await page.waitForFunction(() => Boolean(window.__state.release))
  await stopButton().click()
  assert.equal((await state()).active, 1, 'Stop retains in-flight operation until its result')
  await release(); await settled()
  assert.deepEqual((await state()).optimizeCalls.map(input => input.imageId), [imageId(1)], 'Stop after current never dispatches next image')
  assert.match(await card(1).innerText(), /3\.0 MB → 1\.0 MB/)
  assert.equal(await selectedBox(2).isEnabled(), true)
  report.checks.push('Stop after current preserves first success and remaining candidates')

  await reset('success', true); await scan(); await confirm()
  await page.waitForFunction(() => Boolean(window.__state.release))
  await page.evaluate(() => window.__unmount())
  await page.locator('[data-fixture-unmounted]').waitFor()
  assert.equal((await state()).active, 1, 'Navigation does not cancel the request already in progress')
  await release()
  await page.waitForFunction(() => window.__state.active === 0)
  assert.equal((await state()).optimizeCalls.length, 1, 'Component unmount stops dispatch after the active operation')
  report.checks.push('Navigation/unmount lets active action finish and stops all subsequent dispatch')

  await reset('known-failure'); await scan(); await confirm()
  await page.waitForFunction(() => window.__state.optimizeCalls.length === 2 && window.__state.active === 0)
  await settled()
  assert.deepEqual((await state()).optimizeCalls.map(input => input.imageId), [imageId(1), imageId(3)], 'Known conflict skips the rest of that product only')
  assert.match(await card(1).innerText(), /失败|版本|冲突|Fixture version conflict/)
  assert.match(await card(2).innerText(), /跳过|重新扫描|失败/)
  assert.match(await card(3).innerText(), /3\.0 MB → 1\.0 MB/)
  report.checks.push('Known failure retains per-image results, skips remaining same-product images and continues other products')

  await reset('known-after-success'); await scan(); await confirm(); await settled()
  assert.equal((await state()).optimizeCalls.length, 3)
  assert.match(await card(1).innerText(), /3\.0 MB → 1\.0 MB/, 'Known later failure preserves earlier success')
  assert.match(await card(2).innerText(), /Fixture version conflict/)
  assert.match(await card(3).innerText(), /3\.0 MB → 1\.0 MB/)

  await reset('network-after-success'); await scan(); await confirm(); await settled()
  assert.equal((await state()).optimizeCalls.length, 2)
  assert.match(await card(1).innerText(), /3\.0 MB → 1\.0 MB/, 'Uncertain later failure preserves earlier success')
  assert.match(await card(2).innerText(), /未能确认/)
  assert.equal(await startButton().isDisabled(), true)

  await reset('unchanged-first'); await scan(); await confirm(); await settled()
  assert.equal((await state()).optimizeCalls.length, 3)
  assert.equal((await state()).optimizeCalls[1].expectedUpdatedAt, stamp, 'Unchanged result preserves same-product version')
  assert.match(await card(1).innerText(), /压缩收益不明显，保留原图/)
  assert.equal(await selectedBox(1).isDisabled(), true)
  assert.equal(await card(1).getByRole('button', { name: /原图/ }).count(), 0, 'Unchanged source does not fabricate an alternate original')
  report.checks.push('Earlier success survives later known/uncertain failure; unchanged result keeps source and product version')

  for (const scenario of ['network-failure', 'internal-failure', 'malformed-result', 'mismatched-result']) {
    await reset(scenario); await scan(); await confirm(); await settled()
    assert.equal((await state()).optimizeCalls.length, 1, `${scenario}: no next action after uncertain result`)
    assert.equal(await startButton().count() === 0 || await startButton().isDisabled(), true, `${scenario}: retry blocked until scan`)
    await page.getByRole('alert').first().waitFor()
    await page.evaluate(() => { window.__state.scenario = 'success' })
    await scan()
    assert.equal(await startButton().isEnabled(), true, `${scenario}: complete rescan unlocks a new selection`)
    assert.equal((await state()).optimizeCalls.length, 1, 'Rescan never automatically replays mutation')
  }
  report.checks.push('Transport/internal/malformed/mismatched success stops and blocks retry until explicit complete rescan')

  await reset('empty'); await scanButton().click(); await settled()
  assert.equal(await startButton().count() === 0 || await startButton().isDisabled(), true)
  assert.equal((await state()).optimizeCalls.length, 0)
  assert.deepEqual(errors, [], 'No uncaught browser errors')
  assert.deepEqual(unexpectedRequests, [], 'All external services and data writes are isolated')
  assert.ok(imageRequests.every(url => /^\/api\/admin\/quotation-images\/[^?]+\?kind=source$/.test(url)))
  report.checks.push('Empty scan; no uncaught browser errors; no production HTTP/actions')
  await writeFile(resolve(output, 'report.json'), JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report, null, 2))
  console.log('PASS: batch image optimization real React UI, isolated metadata/action fixtures, complete scan, confirmation, sequential version handoff, stop, known/unknown failure handling, private previews and mobile layout.')
} finally { await browser?.close(); await new Promise(resolve => server.close(resolve)) }
