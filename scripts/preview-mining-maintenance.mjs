// Local review only. Extract the real seed's pure parser; never import its DB writer.
import fs from 'node:fs/promises'
import path from 'node:path'
import vm from 'node:vm'
import assert from 'node:assert/strict'
import ts from 'typescript'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import rendererModule from '../src/components/store/blog/blog-content-renderer.tsx'

const { BlogContentRenderer } = rendererModule

const root = process.cwd()
const slug = 'mining-maintenance-welding-cutting-grinding-ppe'
const dir = path.join(root, 'output', 'mining-maintenance-review')
await fs.mkdir(dir, { recursive: true })
const source = await fs.readFile(path.join(root, 'prisma/seed-blog.ts'), 'utf8')
const ast = ts.createSourceFile('seed-blog.ts', source, ts.ScriptTarget.Latest, true)
const names = new Set(['slugifyHeading', 'escapeHtml', 'inlineMarkdownToHtml', 'makeId', 'parseTableRow', 'stripHtml', 'parseMarkdown', 'injectSectionImages', 'buildEditorContent'])
const functions = ast.statements.filter(n => ts.isFunctionDeclaration(n) && names.has(n.name?.text))
assert.equal(functions.length, names.size)
const list = ast.statements.filter(ts.isVariableStatement).flatMap(s => [...s.declarationList.declarations]).find(d => d.name.getText(ast) === 'BLOG_POSTS').initializer
const matches = list.elements.filter(n => n.properties?.some(p => p.name?.getText(ast) === 'slug' && p.initializer?.text === slug))
assert.equal(matches.length, 1)
const markdown = await fs.readFile(path.join(root, `${slug}.md`), 'utf8')
const sandbox = { markdown, join: path.join, process: { cwd: () => root }, __dirname: path.join(root, 'prisma'), loadGeneratedImages: () => ({}) }
const program = functions.map(n => n.getText(ast)).join('\n') + '\nconst config = ' + matches[0].getText(ast) + '; globalThis.result = {config, content: buildEditorContent(markdown, config)};'
vm.runInNewContext(ts.transpileModule(program, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, sandbox, { timeout: 5000 })
const { config, content } = sandbox.result
assert.equal(markdown.match(/^# /gm).length, 1)
assert(markdown.includes(`**Meta Title:** ${config.seoTitle}`))
assert(markdown.includes(`**Meta Description:** ${config.seoDescription}`))
assert(config.seoDescription.length >= 145 && config.seoDescription.length <= 165)
assert(!JSON.stringify(content).includes('Meta Title'))
assert(!content.blocks.some(b => b.type === 'header' && b.data.level === 1))
const tables = content.blocks.filter(b => b.type === 'table')
assert.equal(tables.length, 3)
for (const table of tables) assert(table.data.content.every(row => row.length === 3))
const images = content.blocks.filter(b => b.type === 'image')
assert.equal(images.length, 2)
for (const heading of Object.keys(config.sectionImages)) assert(markdown.includes(`## ${heading}\n`))
for (const sibling of ['mining-ppe-checklist-by-task', 'mining-work-gloves-maintenance-material-handling', 'quarry-eye-face-protection-guide']) {
  assert((await fs.readFile(path.join(root, `${sibling}.md`), 'utf8')).includes(`/blog/${slug}`))
}
const solutions = JSON.parse(await fs.readFile(path.join(root, 'prisma/solutions-data.json'), 'utf8'))
assert(JSON.stringify(solutions).includes(`/blog/${slug}`))
const links = [...new Set([...markdown.matchAll(/\]\(([^)]+)\)/g)].map(m => m[1]))]
assert(links.filter(u => u.startsWith('/')).every(u => !u.includes('?source=')))
const linkResults = await Promise.all(links.map(async href => {
  const url = href.startsWith('/') ? 'https://www.laifappe.com' + href : href
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(25000) })
    await response.body?.cancel()
    return { href, status: response.status, finalUrl: response.url }
  } catch (error) { return { href, error: error.message } }
}))

const imageSources = [config.heroFallback, ...images.map(b => b.data.file.url)]
const embedded = new Map()
for (const src of imageSources) {
  let bytes
  if (src.startsWith('/')) bytes = await fs.readFile(path.join(root, 'public', src))
  else {
    const response = await fetch(src, { signal: AbortSignal.timeout(25000) })
    assert(response.ok, `Image ${response.status}: ${src}`)
    bytes = Buffer.from(await response.arrayBuffer())
  }
  embedded.set(src, `data:image/webp;base64,${bytes.toString('base64')}`)
}
// Keep the production renderer's HTML; resolve its optimized image URLs into
// embedded existing assets only in this standalone review file.
let body = renderToStaticMarkup(React.createElement(BlogContentRenderer, { content }))
body = body.replace(/<link[^>]*rel="preload"[^>]*>/g, '').replace(/ srcSet="[^"]*"/g, '')
body = body.replace(/src="([^"]+)"/g, (full, src) => {
  const decoded = src.replaceAll('&amp;', '&')
  const original = decoded.startsWith('/_next/image?') ? new URL(decoded, 'http://localhost').searchParams.get('url') : decoded
  return embedded.has(original) ? `src="${embedded.get(original)}"` : full
}).replace(/href="\//g, 'href="https://www.laifappe.com/')
const esc = s => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;')
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${esc(config.seoTitle)} — Local review</title><style>
*{box-sizing:border-box}body{margin:0;background:#f5f3ef;color:#26332f;font:17px/1.8 system-ui,Segoe UI,sans-serif}header{background:#193b35;color:white;padding:40px max(22px,calc((100vw - 1020px)/2))}header p{color:#d9e5df}h1{font:600 clamp(30px,4vw,48px)/1.2 Georgia,serif;margin:16px 0}main{max-width:1020px;margin:auto;padding:30px 22px 65px}h2{font:600 29px/1.3 Georgia,serif;margin:48px 0 18px;color:#193b35}h3{font-size:20px;line-height:1.45;margin-top:30px}p{margin:20px 0}a{color:#176a52;text-underline-offset:3px}li{margin:9px 0}figure{margin:32px 0}img{width:100%;height:auto;display:block;border-radius:9px}figcaption{font-size:13px;line-height:1.6;color:#58675e;margin-top:10px}.overflow-x-auto{overflow-x:auto;border:1px solid #d3ddd5;border-radius:8px;margin:28px 0}table{width:100%;min-width:720px;border-collapse:collapse;background:#fff;font-size:14px;line-height:1.65}th,td{padding:15px;text-align:left;vertical-align:top;border-bottom:1px solid #dbe2dc}th{background:#e6eee8}tr:nth-child(even){background:#fafbf8}.note{font-size:12px;letter-spacing:.03em}.hero{margin:0 0 30px}.hero img{max-height:440px;object-fit:cover}footer{border-top:1px solid #ccd5ce;padding-top:20px;font-size:13px}@media(max-width:650px){body{font-size:16px}header{padding:26px 20px}main{padding:24px 18px}h2{font-size:25px}th,td{padding:12px}}
</style></head><body><header><div class="note">LAIFAPPE / MINING &amp; QUARRY MAINTENANCE</div><h1>${esc(config.title)}</h1><p>${esc(config.excerpt)}</p><div class="note">Local content review · Not published · Existing images reused</div></header><main><figure class="hero"><img src="${embedded.get(config.heroFallback)}" alt="Existing welding workshop illustration"><figcaption>Existing workshop illustration, reused for this draft; it is not evidence of a mine-approved equipment configuration.</figcaption></figure>${body}<footer>Local preview uses the real article parser and content renderer with review styling. Production database and deployment are unchanged.</footer></main></body></html>`
await fs.writeFile(path.join(dir, 'index.html'), html)
await fs.writeFile(path.join(dir, 'editor-content.json'), JSON.stringify(content, null, 2))
const report = { slug, words: markdown.split(/\s+/).length, blocks: content.blocks.length, tables: tables.length, reusedSectionImages: images.length, seoTitleLength: config.seoTitle.length, seoDescriptionLength: config.seoDescription.length, links: linkResults, publishing: 'Local only; no seed executed or database written' }
await fs.writeFile(path.join(dir, 'validation.json'), JSON.stringify(report, null, 2))
console.log(JSON.stringify(report, null, 2))
