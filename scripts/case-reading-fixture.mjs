// Actual reading components, isolated from Next routing/actions and any database writes.
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { build } from 'esbuild'
import postcss from 'postcss'
import tailwind from '@tailwindcss/postcss'

const directory = resolve(process.argv[2] || 'output/case-improvement-20261006')
const source = JSON.parse(await readFile(resolve(directory, 'before.json'), 'utf8'))
const candidate = JSON.parse(await readFile(resolve(directory, 'candidate.json'), 'utf8'))
const bundle = await build({
  stdin: {
    contents: `
import React from 'react';import {createRoot} from 'react-dom/client';
import {CaseDetail} from './src/components/cases/case-detail';
const source=${JSON.stringify(source)}, candidate=${JSON.stringify(candidate)};
const after=location.pathname!=='/before';
createRoot(document.getElementById('root')).render(<CaseDetail caseStudy={after?candidate:source}/>);
`, resolveDir: process.cwd(), loader: 'tsx',
  },
  bundle: true, write: false, outfile: 'reading-preview.js', platform: 'browser', format: 'iife', jsx: 'automatic',
  define: { 'process.env.NODE_ENV': '"development"' },
  plugins: [{ name: 'isolate-reading', setup(plugin) {
    // Inquiry helper uses node crypto only for unusually long slugs. The real public page is server-rendered.
    plugin.onResolve({ filter: /^node:crypto$/ }, () => ({ path: 'crypto', namespace: 'mock-crypto' }))
    plugin.onLoad({ filter: /.*/, namespace: 'mock-crypto' }, () => ({ contents: 'export const createHash=()=>{throw new Error("Long-slug hashing must run on the server")}', loader: 'js' }))
    plugin.onResolve({ filter: /^next\/link$/ }, () => ({ path: 'link', namespace: 'mock-link' }))
    plugin.onLoad({ filter: /.*/, namespace: 'mock-link' }, () => ({ contents: 'import React from "react";export default function Link(props){return <a {...props}/>}', loader: 'jsx', resolveDir: process.cwd() }))
    plugin.onResolve({ filter: /^next\/image$/ }, () => ({ path: 'image', namespace: 'mock-image' }))
    plugin.onLoad({ filter: /.*/, namespace: 'mock-image' }, () => ({ contents: 'import React from "react";export default function Image({fill,unoptimized,sizes,priority,...props}){return <img {...props} style={fill?{position:"absolute",width:"100%",height:"100%"}:undefined}/>}', loader: 'jsx', resolveDir: process.cwd() }))
  } }],
})
const moduleCss = bundle.outputFiles.find((file) => file.path.endsWith('.css'))?.text || ''
const js = bundle.outputFiles.find((file) => !file.path.endsWith('.css')).text
const css = await postcss([tailwind()]).process(await readFile('src/app/globals.css', 'utf8'), { from: resolve('src/app/globals.css') })
const server = createServer((request, response) => {
  response.setHeader('Cache-Control', 'no-store')
  const pathname = new URL(request.url || '/', 'http://127.0.0.1').pathname
  if (pathname === '/favicon.ico') { response.statusCode = 204; return response.end() }
  if (pathname === '/quote') {
    response.statusCode = 302; response.setHeader('Location', 'http://127.0.0.1:3101' + request.url); return response.end()
  }
  if (/^\/(products|categories|solutions|blog|cases)(\/|$)/.test(pathname)) {
    response.statusCode = 302; response.setHeader('Location', 'https://www.laifappe.com' + pathname); return response.end()
  }
  if (request.url === '/app.js') { response.setHeader('Content-Type', 'application/javascript'); return response.end(js) }
  if (request.url === '/app.css') { response.setHeader('Content-Type', 'text/css'); return response.end(css.css + '\n' + moduleCss) }
  if (request.url === '/after' || request.url === '/before' || request.url === '/') {
    response.setHeader('Content-Type', 'text/html; charset=utf-8')
    return response.end('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Local mining case reading preview</title><link rel="stylesheet" href="/app.css"></head><body><div style="background:#14202b;color:white;padding:14px 22px;font:14px Arial;display:flex;gap:18px;flex-wrap:wrap"><strong>LAIFAPPE · Local review</strong><a style="color:white" href="/after">Content candidate</a><a style="color:white" href="/before">Current content with new layout</a><span>Preview only · not published</span></div><div id="root"></div><script src="/app.js"></script></body></html>')
  }
  response.statusCode = 404; response.end('Preview route unavailable. Use the real local Next quote page for inquiry checks.')
})
server.listen(8769, '127.0.0.1', () => console.log('Local reading preview: http://127.0.0.1:8769/after'))
