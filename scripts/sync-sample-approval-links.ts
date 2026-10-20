import 'dotenv/config'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { Prisma, PrismaClient } from '@prisma/client'
import { z } from 'zod'

const TARGET = 'ppe-sample-approval-pre-shipment-checklist'
const TARGET_PATH = `/blog/${TARGET}`
const SOURCES = [
  { slug: 'bulk-construction-ppe-procurement', id: 'cmollxw620005umpgt87lo18s', anchor: 'Fit problems are harder to fix after shipment. The right time to solve sizing is during RFQ and sample approval.' },
  { slug: 'contractor-ppe-supplier-bulk-checklist', id: 'cmrdnvd6b0000umu8eosulr1z', anchor: 'Most supplier problems start before the purchase order. The RFQ was too vague, the sample approval was too loose, or the buyer compared only price. A good checklist makes the supplier prove capability before the order scales.' },
] as const
const prisma = new PrismaClient()
const contentSchema = z.object({ blocks: z.array(z.object({ id: z.string().optional(), type: z.string(), data: z.record(z.string(), z.json()) }).passthrough()) }).passthrough()
type Reader = Pick<Prisma.TransactionClient, 'blogPost'>
const digest = (value: string | Buffer) => createHash('sha256').update(value).digest('hex')
const plain = (value: string) => value.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim()
const report = (value: unknown) => process.stdout.write(`${JSON.stringify(value)}\n`)

function jsonObject(value: unknown): Prisma.InputJsonObject {
  const parsed = z.json().parse(value)
  assert.ok(typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed), 'Content must be a JSON object')
  return parsed
}

async function sources() {
  return Promise.all(SOURCES.map(async (source) => {
    const markdown = await readFile(resolve(`${source.slug}.md`), 'utf8')
    const paragraphs = markdown.split(/\r?\n\s*\r?\n/).map((p) => p.trim())
    const matches = paragraphs.filter((p) => p.includes(TARGET))
    assert.equal(matches.length, 1, 'Expected one reviewed source paragraph')
    const paragraph = matches[0]
    assert.equal(paragraphs[paragraphs.indexOf(paragraph) - 1], source.anchor, 'Source placement changed')
    assert.ok(!/[<>"*]/.test(paragraph), 'Unexpected source markup')
    const links = [...paragraph.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g)]
    assert.equal(links.length, 1, 'Unexpected source link count')
    assert.equal(links[0]?.[2], TARGET_PATH, 'Noncanonical source link')
    const html = paragraph.replace(/&/g, '&amp;').replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    return { ...source, html, blockId: `sample${digest(source.slug + paragraph).slice(0, 10)}` }
  }))
}

async function snapshot(reader: Reader) {
  const rows = await reader.blogPost.findMany({ where: { slug: { in: [...SOURCES.map((s) => s.slug), TARGET] } } })
  const target = rows.find((row) => row.slug === TARGET)
  const blogs = SOURCES.map((source) => {
    const row = rows.find((item) => item.slug === source.slug)
    assert.ok(row && row.id === source.id && row.isPublished && row.publishedAt && row.publishedAt <= new Date(), 'Source identity or publication changed')
    return row
  })
  return { blogs, target }
}

function plans(state: Awaited<ReturnType<typeof snapshot>>, source: Awaited<ReturnType<typeof sources>>) {
  return source.map((item) => {
    const row = state.blogs.find((blog) => blog.id === item.id)
    assert.ok(row, 'Source row unavailable')
    const content = contentSchema.parse(row.content)
    const anchors = content.blocks.map((block, index) => ({ block, index })).filter(({ block }) => block.type === 'paragraph' && typeof block.data.text === 'string' && plain(block.data.text) === item.anchor)
    assert.equal(anchors.length, 1, 'Anchor paragraph missing or duplicated')
    const references = content.blocks.filter((block) => JSON.stringify(block).includes(TARGET))
    if (references.length) {
      assert.equal(references.length, 1, 'Duplicate target reference')
      assert.equal(references[0].type, 'paragraph', 'Existing target block differs')
      assert.equal(references[0].data.text, item.html, 'Existing target paragraph differs')
      assert.equal(content.blocks[anchors[0].index + 1], references[0], 'Existing target placement differs')
      return { row, content: row.content, changed: false }
    }
    assert.ok(!content.blocks.some((block) => block.id === item.blockId), 'New block ID conflicts')
    content.blocks.splice(anchors[0].index + 1, 0, { id: item.blockId, type: 'paragraph', data: { text: item.html } })
    return { row, content: z.json().parse(content), changed: true }
  })
}

async function main() {
  const args = process.argv.slice(2)
  assert.ok(args.length === 0 || (args.length === 1 && ['--inspect', '--apply'].includes(args[0])), 'Unsupported arguments')
  const source = await sources()
  const before = await snapshot(prisma)
  const plan = plans(before, source)
  const changes = plan.filter((item) => item.changed).length
  assert.ok(changes === 0 || changes === SOURCES.length, 'Partial prior update requires review')
  const targetPublic = Boolean(before.target?.isPublished && before.target.publishedAt && before.target.publishedAt <= new Date())
  report({ mode: args[0] === '--apply' ? 'apply' : 'inspect', targetPublic, plannedWrites: changes, articles: plan.map((item) => ({ slug: item.row.slug, changed: item.changed })) })
  if (args[0] !== '--apply' || changes === 0) return
  assert.ok(targetPublic, 'Target article must be public')
  const directory = resolve('.trellis/tasks/10-19-seo-mobile-sample-approval/evidence')
  await mkdir(directory, { recursive: true })
  const backup = resolve(directory, `backlinks-before-${Date.now()}.json`)
  const serialized = JSON.stringify(before, null, 2)
  await writeFile(backup, serialized, { flag: 'wx' })
  assert.equal(digest(await readFile(backup)), digest(serialized), 'Backup readback failed')
  await prisma.$transaction(async (tx) => {
    const current = await snapshot(tx)
    assert.deepEqual(current, before, 'Concurrent change detected')
    const verified = plans(current, source)
    for (const item of verified) {
      const result = await tx.blogPost.updateMany({ where: { id: item.row.id, slug: item.row.slug, isPublished: true, updatedAt: item.row.updatedAt }, data: { content: jsonObject(item.content) } })
      assert.equal(result.count, 1, 'Write guard failed')
    }
    const after = await snapshot(tx)
    assert.deepEqual(after.target, before.target, 'Target article changed')
    for (const item of verified) {
      const saved = after.blogs.find((row) => row.id === item.row.id)
      assert.ok(saved, 'Saved row unavailable')
      assert.deepEqual({ ...saved, content: item.row.content, updatedAt: item.row.updatedAt }, item.row, 'Protected fields changed')
      assert.deepEqual(saved.content, item.content, 'Content readback failed')
    }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 10_000, timeout: 30_000 })
  report({ complete: true, writes: changes, backup })
}

main().catch((error: unknown) => {
  const code = error instanceof Prisma.PrismaClientKnownRequestError ? error.code : 'GUARD_OR_IO'
  process.stderr.write(`SAMPLE_APPROVAL_LINK_SYNC_FAILED (${code}): source or database state requires review\n`)
  process.exitCode = 1
}).finally(() => prisma.$disconnect())
