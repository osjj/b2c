// Isolated real-component review. No environment, database, R2 or live actions.
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { build } from 'esbuild'
import postcss from 'postcss'
import tailwind from '@tailwindcss/postcss'

const mocks = `
export const useRouter=()=>({replace:()=>{},refresh:()=>{}});
export async function saveCaseStudy(input,id,version){
 window.__caseSaves=(window.__caseSaves||0)+1;
 window.__savedCase=structuredClone(input);
 window.__saveVersion=version;
 localStorage.setItem('case-upload-fixture',JSON.stringify({...input,id,version:version+1}));
 return {success:true,id,version:version+1,reason:'Saved fixture'};
}
`
const bundle = await build({
  stdin: {
    contents: `
import React from 'react';import {createRoot} from 'react-dom/client';
import {CaseForm} from './src/components/admin/case-form';
import {emptyCaseInput} from './src/lib/cases/types';
const id='c'+ 'a'.repeat(24);
const original={...emptyCaseInput(),id,version:1,title:'Documentary upload fixture',slug:'upload-fixture',
 summary:'Existing summary',country:'South Africa',industry:'Mining',buyerProfile:'Existing buyer context',
 coverImage:'/fixture.png',coverAlt:'Original cover',sections:[{key:'samples',title:'Samples',body:'Existing sample review'}],
 procurement:[{name:'Work gloves',quantity:200,unit:'pairs',note:'Original note'}],
 gallery:[{url:'/fixture.png',alt:'Original public photograph',caption:'Original caption',placement:'section:samples'},
 {url:'/api/admin/case-images/'+id+'/'+ 'a'.repeat(64)+'.png',alt:'Original private photograph',caption:'Private original',placement:''}],
 publishedAt:null,createdAt:'2026-10-06T00:00:00.000Z',updatedAt:'2026-10-06T00:00:00.000Z'};
const stored=localStorage.getItem('case-upload-fixture');
const record=stored?{...original,...JSON.parse(stored)}:original;
createRoot(document.getElementById('root')).render(<main className="mx-auto max-w-7xl p-4"><p className="mb-4 rounded border bg-amber-50 p-3">Isolated case editor · uploads and saves are simulated</p><CaseForm caseStudy={record}/></main>);
`,
    resolveDir: process.cwd(), loader: 'tsx',
  },
  bundle: true, write: false, platform: 'browser', format: 'iife', jsx: 'automatic',
  define: { 'process.env.NODE_ENV': '"development"' },
  plugins: [{ name: 'isolate-case-actions', setup(plugin) {
    plugin.onResolve({ filter: /^(next\/navigation|@\/actions\/admin\/cases)$/ }, () => ({ path: 'mock', namespace: 'mock' }))
    plugin.onLoad({ filter: /.*/, namespace: 'mock' }, () => ({ contents: mocks, loader: 'js', resolveDir: process.cwd() }))
    plugin.onResolve({ filter: /^next\/link$/ }, () => ({ path: 'link', namespace: 'link' }))
    plugin.onLoad({ filter: /.*/, namespace: 'link' }, () => ({ contents: 'import React from "react";export default function Link(props){return <a {...props}/>}', loader: 'jsx', resolveDir: process.cwd() }))
    plugin.onResolve({ filter: /^next\/image$/ }, () => ({ path: 'image', namespace: 'image' }))
    plugin.onLoad({ filter: /.*/, namespace: 'image' }, () => ({ contents: 'import React from "react";export default function Image({fill,unoptimized,sizes,...props}){return <img {...props} data-unoptimized={String(Boolean(unoptimized))} style={fill?{position:"absolute",width:"100%",height:"100%"}:undefined}/>}', loader: 'jsx', resolveDir: process.cwd() }))
  } }],
})
const css = await postcss([tailwind()]).process(await readFile('src/app/globals.css', 'utf8'), { from: resolve('src/app/globals.css') })
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jY1sAAAAASUVORK5CYII=', 'base64')
const server = createServer((request, response) => {
  response.setHeader('Cache-Control', 'no-store')
  if (request.url === '/') {
    response.setHeader('Content-Type', 'text/html; charset=utf-8')
    response.end('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Case upload isolated review</title><link rel="stylesheet" href="/app.css"></head><body><div id="root"></div><script src="/app.js"></script></body></html>')
  } else if (request.url === '/app.js') {
    response.setHeader('Content-Type', 'application/javascript'); response.end(bundle.outputFiles[0].contents)
  } else if (request.url === '/app.css') {
    response.setHeader('Content-Type', 'text/css'); response.end(css.css)
  } else if (request.url === '/fixture.png' || request.url?.startsWith('/api/admin/case-images/')) {
    response.setHeader('Content-Type', 'image/png'); response.end(png)
  } else {
    // Test runner must intercept uploads: fail closed if a fixture bypasses it.
    response.statusCode = 404; response.end('Fixture route not mocked')
  }
})
server.listen(8769, '127.0.0.1', () => process.stdout.write('Case fixture ready: http://127.0.0.1:8769/\n'))
