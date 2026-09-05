// Isolated real-component harness: no .env, database, storage or production writes.
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { build } from 'esbuild'
import postcss from 'postcss'
import tailwind from '@tailwindcss/postcss'

const mocks = `
import { useSyncExternalStore } from 'react';
let state = { saves: 0, finalized: 0, version: 1, mode: 'success', route: '/', refresh: 0 };
const listeners = new Set();
function emit(change) { state={...state,...change}; for(const listener of listeners) listener(); }
export function useMockState() { return useSyncExternalStore(fn=>{listeners.add(fn); return ()=>listeners.delete(fn)},()=>state); }
export function setMode(mode) { emit({mode}); }
export const useRouter=()=>({ push:route=>emit({route}), replace:route=>emit({route}), refresh:()=>emit({refresh:state.refresh+1}) });
export const usePathname=()=>'/admin/sales-quotations';
export const useSearchParams=()=>new URLSearchParams();
export const unstable_rethrow=()=>{};
async function save(input) {
 emit({saves:state.saves+1,version:state.version+1});
 if (state.mode==='conflict') return { success:false,code:'VERSION_CONFLICT',reason:'报价已变更，请刷新后重试' };
 return {success:true,reason:'已保存',data:{quotationId:'cmockquotation000000000000',revisionId:'cmockrevision0000000000000',version:state.version,items:input.items.map((item,i)=>({id:item.id||'cmockitem0000000000000000'+i,assets:[]}))}};
}
export const createSalesQuotation=save; export const updateSalesQuotation=save;
export async function finalizeSalesQuotation() { emit({finalized:state.finalized+1}); await new Promise(resolve=>setTimeout(resolve,200)); return state.mode==='r2'?{success:false,code:'DOCUMENT_GENERATION_FAILED',reason:'Private document storage: R2 denied access. Reference: isolated-test'}:{success:true,reason:'已生成',data:{status:'FINALIZED'}}; }
export async function copySimpleQuotation() { return {success:true,reason:'copied',data:{quotationId:'cmockquotation000000000000',revisionId:'cmockrevision0000000000000'}} }
`
const bundle = await build({ stdin: { contents: `
import React from 'react'; import { createRoot } from 'react-dom/client';
import { SimpleQuotationEditor } from './src/components/admin/quotation/simple-editor';
import { WorkbenchHeader } from './src/components/admin/quotation/workbench-header';
import { defaultWorkbenchSettings } from './src/lib/quotation/workbench-config';
import { useMockState,setMode } from 'quotation-test-mocks';
function Harness(){const state=useMockState(); return <main className="mx-auto max-w-7xl space-y-8 p-6"><aside className="rounded border border-amber-300 bg-amber-50 p-3 text-sm"><strong>隔离测试 / 不连接数据库</strong><label className="ml-4">模拟结果 <select aria-label="模拟结果" value={state.mode} onChange={e=>setMode(e.target.value)}><option value="success">成功</option><option value="r2">R2 错误</option><option value="conflict">版本冲突</option></select></label><p role="status">保存次数 {state.saves} · 生成次数 {state.finalized} · 刷新次数 {state.refresh} · {state.route}</p></aside><WorkbenchHeader title="新建报价" description="客户名称、产品明细和条款，一页完成。"/><SimpleQuotationEditor customers={[]} products={[{id:'cmockproduct00000000000000',name:'Cotton Workwear',description:'Material: Cotton\\nColor: Navy',unit:'pcs',unitPrice:'12.50',currency:'USD',active:true,images:[]}]} settings={defaultWorkbenchSettings}/></main>}
createRoot(document.getElementById('root')).render(<Harness/>);`, resolveDir: process.cwd(), loader: 'tsx' }, bundle: true, write: false, platform: 'browser', format: 'iife', jsx: 'automatic', define: { 'process.env.NODE_ENV': '"development"' }, plugins: [{ name: 'isolate', setup(plugin) {
  plugin.onResolve({ filter: /^(next\/navigation|@\/actions\/admin\/sales-quotations|quotation-test-mocks)$/ }, () => ({ path: 'mock', namespace: 'test' }))
  plugin.onLoad({ filter: /.*/, namespace: 'test' }, () => ({ contents: mocks, loader: 'js', resolveDir: process.cwd() }))
  plugin.onResolve({ filter: /^next\/link$/ }, () => ({ path: 'link', namespace: 'link' }))
  plugin.onResolve({ filter: /^next\/image$/ }, () => ({ path: 'image', namespace: 'image' }))
  plugin.onLoad({ filter: /.*/, namespace: 'image' }, () => ({ contents: 'import React from "react"; export default function Image({unoptimized,...props}){return <img {...props}/>}', loader: 'jsx', resolveDir: process.cwd() }))
  plugin.onLoad({ filter: /.*/, namespace: 'link' }, () => ({ contents: 'import React from "react"; export default function Link(props){return <a {...props}/>}', loader: 'jsx', resolveDir: process.cwd() }))
} }] })
const css = await postcss([tailwind()]).process(await readFile('src/app/globals.css', 'utf8'), { from: resolve('src/app/globals.css') })
const html = '<!doctype html><html lang="zh"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Quotation v2 isolated review</title><link rel="stylesheet" href="/app.css"></head><body style="background:#f1f5f7;font-family:Arial,Microsoft YaHei,sans-serif"><div id="root"></div><script src="/app.js"></script></body></html>'
const server = createServer(async (request, response) => {
  response.setHeader('Cache-Control', 'no-store')
  if(request.url==='/') {response.setHeader('Content-Type','text/html; charset=utf-8');response.end(html)}
  else if(request.url==='/app.js') {response.setHeader('Content-Type','application/javascript');response.end(bundle.outputFiles[0].contents)}
  else if(request.url==='/app.css') {response.setHeader('Content-Type','text/css');response.end(css.css)}
  else if(request.url?.includes('/preview?')) {response.setHeader('Content-Type','application/pdf');response.end(await readFile('output/pdf/quotation-v2-preview.pdf'))}
  else {response.statusCode=404;response.end()}
})
server.listen(0,'127.0.0.1',()=>{const address=server.address();if(address&&typeof address==='object')process.stdout.write('Isolated quotation UI: http://127.0.0.1:'+address.port+'/\n')})
