import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import vm from 'node:vm'

import 'dotenv/config'
import { Prisma, PrismaClient } from '@prisma/client'
import ts from 'typescript'
import { z } from 'zod'

export const SLUG = 'construction-safety-helmet-vs-hard-hat'
const TARGET_ID = 'cmoxsewqx0000umqcvslzm5oi'
const EVIDENCE = '.trellis/tasks/10-24-helmet-comparison-seo/evidence'
const HEADINGS = [
  'Quick Answer: Safety Helmet Or Hard Hat?',
  'What OSHA Actually Requires',
  'Safety Helmet vs Hard Hat: Practical Differences',
  'Type I vs Type II Matters More Than The Name',
  'Chin Straps: When Retention Becomes A Safety Feature',
  'Electrical Class Still Matters',
  'Which Construction Tasks Should Consider Safety Helmets?',
  'Compatibility With The Rest Of The PPE System',
  'Buying Specification: Better Than "Safety Helmet"',
] as const
const PARSERS = new Set(['slugifyHeading', 'escapeHtml', 'inlineMarkdownToHtml', 'makeId', 'parseTableRow', 'stripHtml', 'parseMarkdown', 'injectSectionImages', 'buildEditorContent'])
const blockSchema = z.object({ id: z.string(), type: z.string(), data: z.record(z.string(), z.json()) }).passthrough()
const contentSchema = z.object({ blocks: z.array(blockSchema) }).passthrough()
const metadataSchema = z.object({ title: z.string().min(1), excerpt: z.string().min(1), seoTitle: z.string().min(1), seoDescription: z.string().min(1), seoKeywords: z.string().min(1) })
const configSchema = metadataSchema.extend({ slug: z.literal(SLUG), markdownPath: z.string(), generatedImagesPath: z.string(), heroFallback: z.string(), sectionImages: z.record(z.string(), z.object({ url: z.string(), caption: z.string() })) })
const rowSchema = metadataSchema.partial().extend({ id: z.string(), slug: z.literal(SLUG), isPublished: z.literal(true), publishedAt: z.iso.datetime(), updatedAt: z.iso.datetime(), coverImage: z.string(), content: contentSchema }).passthrough()
const hashesSchema = z.object({ markdown: z.string(), config: z.string(), parser: z.string(), manifest: z.string() })
const planSchema = z.object({ version: z.literal(1), slug: z.literal(SLUG), baselineHash: z.string(), hashes: hashesSchema, desired: metadataSchema.extend({ content: contentSchema }), desiredHash: z.string(), imageCount: z.literal(9) })
type Content = z.infer<typeof contentSchema>
type Row = z.infer<typeof rowSchema>
type Plan = z.infer<typeof planSchema>
type Reader = Pick<Prisma.TransactionClient, 'blogPost'>
type Client = Pick<PrismaClient, 'blogPost' | '$transaction'>

export class SyncError extends Error {
  constructor(readonly code: string) { super(code) }
}
function guard(condition: unknown, code: string): asserts condition {
  if (!condition) throw new SyncError(code)
}
export const digest = (value: string | Buffer) => createHash('sha256').update(value).digest('hex')
// PostgreSQL JSONB may reorder object keys. Dates normalize to their JSON strings.
export function canonical(value: unknown): string {
  if (value instanceof Date) return JSON.stringify(value.toISOString())
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
  if (value !== null && typeof value === 'object') return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(',')}}`
  return JSON.stringify(value)
}
export const equal = (left: unknown, right: unknown) => canonical(left) === canonical(right)
const json = (value: unknown): unknown => JSON.parse(JSON.stringify(value))
const plain = (text: string) => text.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim()
const keyFor = (text: string) => text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')

export function parseMode(args: string[]): 'inspect' | 'apply' {
  guard(args.length === 0 || (args.length === 1 && ['--inspect', '--apply'].includes(args[0])), 'INVALID_ARGUMENTS')
  return args[0] === '--apply' ? 'apply' : 'inspect'
}

export async function loadSources(root = process.cwd()) {
  const [seed, markdown, manifestBytes] = await Promise.all([
    readFile(resolve(root, 'prisma/seed-blog.ts'), 'utf8'),
    readFile(resolve(root, `${SLUG}.md`), 'utf8'),
    readFile(resolve(root, `prisma/blog-images.${SLUG}.generated.json`), 'utf8'),
  ])
  const manifest = z.record(z.string(), z.string().min(1)).parse(JSON.parse(manifestBytes))
  guard(equal(Object.keys(manifest).sort(), ['hero', ...HEADINGS.map(keyFor)].sort()), 'MANIFEST_SHAPE')
  const ast = ts.createSourceFile('seed-blog.ts', seed, ts.ScriptTarget.Latest, true)
  const functions = ast.statements.filter((node): node is ts.FunctionDeclaration => ts.isFunctionDeclaration(node) && Boolean(node.name && PARSERS.has(node.name.text)))
  guard(functions.length === PARSERS.size, 'PARSER_SHAPE')
  const list = ast.statements.filter(ts.isVariableStatement).flatMap((node) => [...node.declarationList.declarations]).find((node) => node.name.getText(ast) === 'BLOG_POSTS')?.initializer
  guard(list && ts.isArrayLiteralExpression(list), 'CONFIG_SHAPE')
  const matches = list.elements.filter((node) => ts.isObjectLiteralExpression(node) && node.properties.some((property) => ts.isPropertyAssignment(property) && property.name.getText(ast) === 'slug' && ts.isStringLiteral(property.initializer) && property.initializer.text === SLUG))
  guard(matches.length === 1, 'CONFIG_TARGET')
  const configText = matches[0].getText(ast)
  const parserText = functions.map((node) => node.getText(ast)).join('\n')
  const sandbox: { result?: unknown; markdown: string; join: typeof join; process: { cwd: () => string }; __dirname: string; loadGeneratedImages: () => typeof manifest } = {
    markdown, join, process: { cwd: () => root }, __dirname: resolve(root, 'prisma'), loadGeneratedImages: () => manifest,
  }
  // Only the actual pure parser declarations and exact config literal execute;
  // never import seed-blog.ts, its Prisma client, or its publishing entrypoint.
  const program = `${parserText}\nconst config = ${configText}; globalThis.result = {config, content: buildEditorContent(markdown, config)};`
  vm.runInNewContext(ts.transpileModule(program, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, sandbox, { timeout: 5000 })
  const parsed = z.object({ config: configSchema, content: contentSchema }).parse(sandbox.result)
  guard(parsed.config.markdownPath === resolve(root, `${SLUG}.md`) && parsed.config.generatedImagesPath === resolve(root, `prisma/blog-images.${SLUG}.generated.json`), 'CONFIG_PATH')
  guard(equal(Object.keys(parsed.config.sectionImages), [...HEADINGS]), 'HEADING_CONFIG')
  const mappedHeadings = [...markdown.matchAll(/^## (.+)\r?$/gm)].map((match) => match[1]).filter((heading) => HEADINGS.some((expected) => expected === heading))
  guard(equal(mappedHeadings, [...HEADINGS]), 'HEADING_SOURCE')
  guard(markdown.includes(`**Meta Title:** ${parsed.config.seoTitle}`) && markdown.includes(`**Meta Description:** ${parsed.config.seoDescription}`), 'METADATA_SOURCE')
  return { ...parsed, manifest, hashes: { markdown: digest(markdown), config: digest(configText), parser: digest(parserText), manifest: digest(manifestBytes) } }
}
type Sources = Awaited<ReturnType<typeof loadSources>>

function imageMap(content: Content) {
  let heading = ''
  const images: { heading: string; block: z.infer<typeof blockSchema> }[] = []
  for (const block of content.blocks) {
    if (block.type === 'header' && block.data.level === 2 && typeof block.data.text === 'string') heading = plain(block.data.text)
    if (block.type === 'image') images.push({ heading, block })
  }
  guard(images.length === 9 && equal(images.map((image) => image.heading), [...HEADINGS]), 'MEDIA_HEADINGS')
  guard(new Set(content.blocks.map((block) => block.id)).size === content.blocks.length, 'BLOCK_IDS')
  return images
}

export function desiredFor(row: Row, source: Sources): Plan['desired'] {
  guard(row.coverImage === source.manifest.hero, 'COVER_MISMATCH')
  const originals = imageMap(row.content)
  const generated = imageMap(source.content)
  for (const [index, image] of originals.entries()) {
    const currentUrl = z.object({ url: z.string() }).parse(image.block.data.file).url
    const generatedUrl = z.object({ url: z.string() }).parse(generated[index].block.data.file).url
    guard(currentUrl === source.manifest[keyFor(image.heading)] && currentUrl === generatedUrl, 'MEDIA_URL')
  }
  const originalByHeading = new Map(originals.map((image) => [image.heading, image.block]))
  const generatedById = new Map(generated.map((image) => [image.block.id, image.heading]))
  const reserved = new Set(originals.map((image) => image.block.id))
  const blocks = source.content.blocks.map((block, index) => {
    if (block.type === 'image') {
      const original = originalByHeading.get(generatedById.get(block.id) ?? '')
      guard(original, 'MEDIA_MATCH')
      return original
    }
    const rest = Object.fromEntries(Object.entries(block).filter(([key]) => key !== 'id'))
    const id = `helmet${digest(canonical({ index, ...rest })).slice(0, 18)}`
    guard(!reserved.has(id), 'BLOCK_COLLISION')
    reserved.add(id)
    return { ...rest, id }
  })
  const content = contentSchema.parse({ ...row.content, blocks })
  guard(equal(imageMap(content).map((image) => image.block), originals.map((image) => image.block)), 'MEDIA_PRESERVATION')
  return { ...metadataSchema.parse(source.config), content }
}

function protectedFields(row: Row) {
  const result: Record<string, unknown> = { ...row }
  for (const key of ['title', 'excerpt', 'seoTitle', 'seoDescription', 'seoKeywords', 'content', 'updatedAt']) delete result[key]
  return result
}
const actualDesired = (row: Row) => ({ ...metadataSchema.parse(row), content: row.content })
export async function snapshot(reader: Reader): Promise<Row> {
  const rows = await reader.blogPost.findMany({ where: { slug: SLUG } })
  guard(rows.length === 1, 'TARGET_COUNT')
  const row = rowSchema.parse(json(rows[0]))
  guard(row.id === TARGET_ID && new Date(row.publishedAt).getTime() <= Date.now(), 'TARGET_IDENTITY')
  return row
}

async function writePrivate(file: string, value: unknown) {
  const bytes = JSON.stringify(value, null, 2) + '\n'
  await writeFile(file, bytes, { flag: 'wx', mode: 0o600 })
  guard((await readFile(file)).equals(Buffer.from(bytes)), 'BACKUP_READBACK')
  return digest(bytes)
}

export async function execute(mode: 'inspect' | 'apply', client: Client, root = process.cwd()) {
  const directory = resolve(root, EVIDENCE)
  const baselineFile = resolve(directory, 'baseline.json')
  const planFile = resolve(directory, 'plan.json')
  const reviewFile = resolve(directory, 'reviewed-plan.json')
  const source = await loadSources(root)
  const before = await snapshot(client)
  if (mode === 'inspect') {
    const desired = desiredFor(before, source)
    const changes = equal(actualDesired(before), desired) ? 0 : 1
    await mkdir(directory, { recursive: true, mode: 0o700 })
    const baselineHash = await writePrivate(baselineFile, before)
    const plan = planSchema.parse({ version: 1, slug: SLUG, baselineHash, hashes: source.hashes, desired, desiredHash: digest(canonical(desired)), imageCount: 9 })
    const planHash = await writePrivate(planFile, plan)
    return { mode, slug: SLUG, plannedWrites: changes, planHash, plan: planFile, baseline: baselineFile, reviewRequired: changes > 0 }
  }
  // Apply never creates or refreshes a plan. Review records its exact byte hash.
  const [baselineBytes, planBytes, reviewBytes] = await Promise.all([readFile(baselineFile), readFile(planFile), readFile(reviewFile)])
  const plan = planSchema.parse(JSON.parse(planBytes.toString('utf8')))
  const baseline = rowSchema.parse(JSON.parse(baselineBytes.toString('utf8')))
  const review = z.object({ planHash: z.string(), reviewed: z.literal(true) }).parse(JSON.parse(reviewBytes.toString('utf8')))
  guard(review.planHash === digest(planBytes) && plan.baselineHash === digest(baselineBytes), 'PLAN_REVIEW')
  guard(equal(plan.hashes, source.hashes), 'SOURCE_DRIFT')
  guard(plan.desiredHash === digest(canonical(plan.desired)) && equal(plan.desired, desiredFor(baseline, source)), 'PLAN_CONTENT')
  guard(equal(protectedFields(before), protectedFields(baseline)), 'PROTECTED_DRIFT')
  if (equal(actualDesired(before), plan.desired)) return { mode, slug: SLUG, writes: 0, unchanged: true }
  guard(equal(before, baseline), 'BASELINE_DRIFT')
  // A complete private write-time backup is also byte-checked before transaction.
  const backup = resolve(directory, `apply-before-${Date.now()}.json`)
  await writePrivate(backup, { baseline: before, sourceHashes: source.hashes, planHash: digest(planBytes) })
  await client.$transaction(async (tx) => {
    const [current, checkedSource] = await Promise.all([snapshot(tx), loadSources(root)])
    guard(equal(current, baseline), 'CONCURRENT_EDIT')
    guard(equal(checkedSource.hashes, plan.hashes) && equal(desiredFor(current, checkedSource), plan.desired), 'SOURCE_DRIFT')
    const content = z.json().parse(plan.desired.content)
    guard(content && typeof content === 'object' && !Array.isArray(content), 'CONTENT_JSON')
    const result = await tx.blogPost.updateMany({
      where: { id: TARGET_ID, slug: SLUG, isPublished: true, publishedAt: new Date(baseline.publishedAt), updatedAt: new Date(baseline.updatedAt) },
      data: { ...metadataSchema.parse(plan.desired), content },
    })
    guard(result.count === 1, 'WRITE_GUARD')
    const saved = await snapshot(tx)
    guard(equal(protectedFields(saved), protectedFields(baseline)), 'PROTECTED_READBACK')
    guard(equal(actualDesired(saved), plan.desired), 'CONTENT_READBACK')
    guard(equal(imageMap(saved.content).map((image) => image.block), imageMap(baseline.content).map((image) => image.block)), 'MEDIA_READBACK')
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 10_000, timeout: 30_000 })
  return { mode, slug: SLUG, writes: 1, backup }
}

export async function main() {
  const mode = parseMode(process.argv.slice(2))
  const prisma = new PrismaClient({ log: [] })
  try { process.stdout.write(`${JSON.stringify(await execute(mode, prisma))}\n`) }
  finally { await prisma.$disconnect() }
}

if (process.argv[1] && resolve(process.argv[1]) === resolve('scripts/sync-helmet-comparison.ts')) {
  main().catch((error: unknown) => {
    const code = error instanceof SyncError ? error.code : 'STATE_OR_IO'
    process.stderr.write(`HELMET_COMPARISON_SYNC_FAILED (${code}): reviewed state requires inspection\n`)
    process.exitCode = 1
  })
}
