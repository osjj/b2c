// Executes the real product page with isolated deferred database reads. No .env or live I/O.
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { renderToStaticMarkup } from 'react-dom/server'

const output = resolve('output/testing/quotation-product-list-performance')
await mkdir(output, { recursive: true })
const mocks = `
export const requireAdmin=async()=>({id:'isolated-admin'});
export const isQuotationWorkbenchEnabled=()=>true;
export const notFound=()=>{throw new Error('Unexpected notFound')};
export const redirect=url=>{throw Object.assign(new Error('Redirect'),{url})};
export const prisma={
 setting:{findMany:input=>globalThis.__productListFixture.readSetting(input)},
 quotationProduct:{findMany:input=>globalThis.__productListFixture.readProducts(input),count:input=>globalThis.__productListFixture.readCount(input)}
};`
const bundle = await build({entryPoints:['src/app/admin/quotation-products/page.tsx'],bundle:true,write:false,platform:'node',format:'esm',packages:'external',jsx:'automatic',plugins:[{name:'isolated-page',setup(plugin){
 plugin.onResolve({filter:/^(@\/lib\/(auth-utils|prisma|quotation\/feature)|next\/navigation)$/},()=>({path:'mocks',namespace:'fixture'}))
 plugin.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:mocks,loader:'js'}))
 plugin.onResolve({filter:/^(next\/(link|image)|@\/components\/)/},({path})=>({path,namespace:'components'}))
 plugin.onLoad({filter:/.*/,namespace:'components'},()=>({contents:`import React from 'react';const Stub=({children})=>React.createElement('div',null,children);export default Stub;export const WorkbenchHeader=Stub,CatalogImport=Stub,CommonProductDelete=Stub,PrivateImagePreview=Stub,Pagination=Stub,Button=Stub,Input=Stub;`,loader:'js',resolveDir:process.cwd()}))
}}]})
const modulePath=resolve(output,'page.mjs')
await writeFile(modulePath,bundle.outputFiles[0].contents)
const {default:Page}=await import(pathToFileURL(modulePath).href)
const deferred=()=>{let resolve;const promise=new Promise(done=>{resolve=done});return {promise,resolve}}
const flush=()=>new Promise(resolve=>setImmediate(resolve))
const products=[{id:'c000000000000000000000001',nameEn:'Fixture boots',nameZh:null,unit:'pair',status:'ACTIVE',updatedAt:new Date('2026-11-06T00:00:00Z'),images:[]}]
function fixture(){
 const category=deferred(),list=deferred(),count=deferred(),calls=[]
 globalThis.__productListFixture={
  readSetting(input){if(input.where.key.startsWith){calls.push('categories');return category.promise}calls.push('defaults');return Promise.resolve([{key:'quotation.product-defaults.'+products[0].id,value:{unitPrice:'12.50',currency:'USD'}}])},
  readProducts(input){calls.push('products');this.where=input.where;return list.promise},
  readCount(input){calls.push('count');this.countWhere=input.where;return count.promise}
 }
 return {category,list,count,calls,state:globalThis.__productListFixture}
}

{
 const f=fixture();const result=Page({searchParams:Promise.resolve({})});await flush()
 assert.deepEqual(new Set(f.calls),new Set(['categories','products','count']),'unfiltered list starts without waiting for categories')
 f.list.resolve(products);await flush()
 assert.ok(f.calls.includes('defaults'),'price defaults start without waiting for count')
 f.category.resolve([{key:'quotation.product-category.'+products[0].id,value:{category:'Foot protection'}}]);f.count.resolve(1)
 const html=renderToStaticMarkup(await result)
 assert.ok(html.includes('Fixture boots')&&html.includes('Foot protection')&&html.includes('12.50'))
}
{
 const f=fixture();const result=Page({searchParams:Promise.resolve({category:'Foot protection',search:'boots'})});await flush()
 assert.deepEqual(f.calls,['categories'],'filtered list must wait for category membership')
 f.category.resolve([{key:'quotation.product-category.'+products[0].id,value:{category:'Foot protection'}}]);await flush()
 assert.deepEqual(f.state.where.id,{in:[products[0].id]});assert.deepEqual(f.state.where,f.state.countWhere)
 assert.equal(f.state.where.OR[0].nameEn.contains,'boots')
 f.list.resolve(products);f.count.resolve(1);await result
}
{
 const f=fixture();const result=Page({searchParams:Promise.resolve({category:'__uncategorized__'})});await flush()
 f.category.resolve([{key:'quotation.product-category.'+products[0].id,value:{category:'Foot protection'}}]);await flush()
 assert.deepEqual(f.state.where.id,{notIn:[products[0].id]})
 f.list.resolve([]);f.count.resolve(0);const html=renderToStaticMarkup(await result)
 assert.ok(!f.calls.includes('defaults'),'empty page does not query empty price keys');assert.ok(html.includes('没有找到匹配'))
}
{
 const f=fixture();const result=Page({searchParams:Promise.resolve({page:'9',category:'Foot protection',search:'boots'})})
 const rejection=assert.rejects(result,error=>error.url==='/admin/quotation-products?page=1&search=boots&category=Foot+protection')
 await flush();f.category.resolve([]);await flush();f.list.resolve([]);f.count.resolve(0);await rejection
}
delete globalThis.__productListFixture
console.log('PASS: product list overlap, category/search dependencies, empty page and redirect filters')
