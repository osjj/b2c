// Local artifact preparation only. No database imports, API calls or uploads.
import fs from 'node:fs/promises'
import path from 'node:path'
import vm from 'node:vm'
import ts from 'typescript'
import sharp from 'sharp'

const root = process.cwd()
const slug = 'quarry-eye-face-protection-guide'
const dir = path.join(root, 'output', 'quarry-eye-face-review')
const assets = path.join(root, 'public', 'blog', slug)
await fs.mkdir(assets, { recursive: true })
await fs.mkdir(path.join(dir, 'images'), { recursive: true })
const plan = JSON.parse(await fs.readFile(path.join(root, 'prisma', `blog-image-plan.${slug}.json`), 'utf8'))
const manifestPath = path.join(dir, 'source-images.json')
const sources = await fs.readFile(manifestPath, 'utf8').then(JSON.parse).catch((error) => {
  if (error.code === 'ENOENT') return {}
  throw error
})
const images = {}
const dimensions = []
await Promise.all(plan.images.map(async ({ key }) => {
  const outputPath = path.join(assets, `${key}.webp`)
  if (sources[key]) {
    const webp = await sharp(sources[key]).webp({ quality: 88 }).toBuffer()
    await fs.writeFile(outputPath, webp)
  }
  const data = await fs.readFile(outputPath)
  const meta = await sharp(data).metadata()
  if (meta.format !== 'webp') throw new Error(`Invalid asset: ${key}`)
  await fs.writeFile(path.join(dir, 'images', `${key}.webp`), data)
  dimensions.push({ key, width: meta.width, height: meta.height, bytes: data.length })
  images[key] = `/blog/${slug}/${key}.webp`
}))
await fs.writeFile(path.join(root, 'prisma', `blog-images.${slug}.generated.json`), JSON.stringify(images, null, 2) + '\n')

// Evaluate only the selected literal config and pure parser functions from the
// real seed source. Never import seed-blog.ts: importing it executes DB writes.
const source = await fs.readFile(path.join(root, 'prisma', 'seed-blog.ts'), 'utf8')
const ast = ts.createSourceFile('seed-blog.ts', source, ts.ScriptTarget.Latest, true)
const names = new Set(['slugifyHeading', 'escapeHtml', 'inlineMarkdownToHtml', 'makeId', 'parseTableRow', 'stripHtml', 'parseMarkdown', 'injectSectionImages', 'buildEditorContent'])
const functions = ast.statements.filter((node) => ts.isFunctionDeclaration(node) && names.has(node.name?.text))
if (functions.length !== names.size) throw new Error('Seed parser extraction changed')
let configNode
for (const statement of ast.statements) {
  if (!ts.isVariableStatement(statement)) continue
  for (const declaration of statement.declarationList.declarations) {
    if (declaration.name.getText(ast) !== 'BLOG_POSTS' || !declaration.initializer || !ts.isArrayLiteralExpression(declaration.initializer)) continue
    configNode = declaration.initializer.elements.find((item) => ts.isObjectLiteralExpression(item) && item.properties.some((property) => ts.isPropertyAssignment(property) && property.name.getText(ast) === 'slug' && ts.isStringLiteral(property.initializer) && property.initializer.text === slug))
  }
}
if (!configNode) throw new Error('Missing article seed entry')
const markdown = await fs.readFile(path.join(root, `${slug}.md`), 'utf8')
const program = functions.map((node) => node.getText(ast)).join('\n') + '\nconst config = ' + configNode.getText(ast) + '; globalThis.result = { config, content: buildEditorContent(markdown, config) };'
const sandbox = { markdown, join: path.join, process: { cwd: () => root }, __dirname: path.join(root, 'prisma'), loadGeneratedImages: () => images }
vm.runInNewContext(ts.transpileModule(program, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, sandbox, { timeout: 5000 })
const { config, content } = sandbox.result
const expected = Object.keys(config.sectionImages)
for (const title of expected) {
  if (!markdown.includes(`## ${title}\n`)) throw new Error(`Missing image heading: ${title}`)
}
const imageBlocks = content.blocks.filter((b) => b.type === 'image')
if (imageBlocks.length !== 4) throw new Error(`Expected 4 section images, got ${imageBlocks.length}`)
const tableCount = content.blocks.filter((b) => b.type === 'table').length
if (tableCount !== 5) throw new Error(`Expected 5 tables, got ${tableCount}`)
await fs.writeFile(path.join(dir, 'editor-content.json'), JSON.stringify(content, null, 2) + '\n')
const esc = (s) => String(s).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
const idFor = (s) => s.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-')
const htmlBlocks = content.blocks.map(({ type, data }) => {
  if (type === 'header') return `<h${data.level} id="${idFor(data.text)}">${data.text}</h${data.level}>`
  if (type === 'paragraph') return `<p>${data.text}</p>`
  if (type === 'delimiter') return '<hr>'
  if (type === 'list') { const tag = data.style === 'ordered' ? 'ol' : 'ul'; return `<${tag}>${data.items.map((s) => `<li>${s}</li>`).join('')}</${tag}>` }
  if (type === 'quote') return `<blockquote>${data.text}</blockquote>`
  if (type === 'image') return `<figure><img src="images/${path.basename(data.file.url)}" alt="${esc(data.caption)}"><figcaption>${data.caption}</figcaption></figure>`
  if (type === 'table') return '<div class="table-wrap" tabindex="0" role="region" aria-label="Scrollable comparison table"><table>' + data.content.map((row, index) => `<tr>${row.map((cell) => `<${index === 0 ? 'th scope="col"' : 'td'}>${cell}</${index === 0 ? 'th' : 'td'}>`).join('')}</tr>`).join('') + '</table></div>'
  throw new Error(`Unhandled block: ${type}`)
}).join('\n').replace(/href="\//g, 'href="https://www.laifappe.com/')
const toc = content.blocks.filter((b) => b.type === 'header' && b.data.level === 2).map((b) => `<li><a href="#${idFor(b.data.text)}">${b.data.text}</a></li>`).join('')
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${esc(config.title)} — Local review</title><style>
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:#f6f4ef;color:#24312f;font:17px/1.75 system-ui,-apple-system,Segoe UI,sans-serif}header{background:#193a36;color:#fff;padding:44px max(24px,calc((100vw - 1050px)/2)) 38px}.eyebrow{font-size:12px;letter-spacing:.13em;text-transform:uppercase;color:#b9d6cc}h1{font:600 clamp(32px,4.2vw,53px)/1.14 Georgia,serif;max-width:930px;margin:20px 0}header p{max-width:870px;color:#d8e5df;font-size:18px}main{max-width:1050px;margin:auto;padding:30px 24px 70px}h2{font:600 30px/1.25 Georgia,serif;margin:58px 0 18px;color:#173b34;scroll-margin-top:22px}h3{font-size:20px;line-height:1.35;margin-top:32px}p,li{max-width:930px}a{color:#176853;text-underline-offset:3px}header a{color:#d8e5df}figure{margin:28px 0 40px}img{display:block;max-width:100%;width:100%;height:auto;border-radius:5px}figcaption{font-size:13px;color:#54645b;line-height:1.55;margin-top:10px;max-width:860px}.hero{margin-top:0}.hero img{aspect-ratio:16/9;object-fit:cover}.table-wrap{overflow-x:auto;margin:25px 0;border:1px solid #c9d3ca;border-radius:5px;background:#fff}table{border-collapse:collapse;width:100%;min-width:700px;font-size:14px;line-height:1.6}th{background:#e6eee7;text-align:left;color:#183d32}th,td{padding:15px;vertical-align:top;border-bottom:1px solid #dce2dc}tr:last-child td{border-bottom:0}tr:nth-child(2n) td{background:#fbfcf9}blockquote{margin:28px 0;padding:20px 26px;background:#eaf0e8;border-left:4px solid #317b5c}nav{padding:20px 26px;background:#fff;border:1px solid #dde4dc}nav summary{font-weight:650;cursor:pointer}nav ul{columns:2;font-size:14px;padding-left:20px;line-height:1.7}nav li{break-inside:avoid;margin:8px 0}footer{border-top:1px solid #d2dbd1;padding-top:20px;font-size:13px;color:#5e6f64}.review{display:inline-block;padding:5px 10px;border:1px solid #86a99c;border-radius:3px;font-size:12px;margin-top:12px}@media(max-width:650px){body{font-size:16px}header{padding:28px 20px}main{padding:22px 18px 45px}h2{font-size:26px;margin-top:42px}nav ul{columns:1}th,td{padding:12px}figure{margin:24px 0}}@media print{body{background:white}nav,.review{display:none}header{padding:20px;background:white;color:#193a36}header p,.eyebrow{color:#24312f}main{padding:0}table{min-width:0;font-size:10px}h2,h3{break-after:avoid}figure,tr{break-inside:avoid}}
</style></head><body><header><div class="eyebrow">LAIFAPPE / Mining &amp; Quarrying / Buyer guide</div><h1>${esc(config.title)}</h1><p>${esc(config.excerpt)}</p><div class="review">Local review · September 13, 2026 · Not published</div></header><main><figure class="hero"><img src="images/hero.webp" alt="Eye and face protection samples at a sheltered quarry issue station"><figcaption>Illustrative eye and face protection samples. Select the actual model from documented task requirements and supplier evidence.</figcaption></figure><nav aria-label="Article contents"><details><summary>In this guide</summary><ul>${toc}</ul></details></nav>${htmlBlocks}<footer>Local article review. Images illustrate selection and compatibility decisions; they are not product performance evidence.</footer></main></body></html>`
let standaloneHtml = html
for (const { key } of plan.images) {
  const buffer = await fs.readFile(path.join(assets, `${key}.webp`))
  standaloneHtml = standaloneHtml.replaceAll(`src="images/${key}.webp"`, `src="data:image/webp;base64,${buffer.toString('base64')}"`)
}
await fs.writeFile(path.join(dir, 'index.html'), standaloneHtml)
let illustrated = markdown.replace('\n---\n', '\n---\n\n![Quarry eye and face protection samples](images/hero.webp)\n')
for (const { title, key } of plan.images.slice(1)) illustrated = illustrated.replace(`## ${title}\n`, `## ${title}\n\n![${title}](images/${key}.webp)\n`)
await fs.writeFile(path.join(dir, `${slug}.md`), illustrated)
await fs.writeFile(path.join(dir, 'image-prompts.json'), JSON.stringify(plan, null, 2) + '\n')
const result = { slug, words: markdown.split(/\s+/).length, blocks: content.blocks.length, tables: tableCount, sectionImages: imageBlocks.length, assets: dimensions, seoTitleLength: config.seoTitle.length, seoDescriptionLength: config.seoDescription.length, publishing: 'Local files only; database writer not executed' }
await fs.writeFile(path.join(dir, 'validation.json'), JSON.stringify(result, null, 2) + '\n')
process.stdout.write(JSON.stringify(result, null, 2) + '\n')
