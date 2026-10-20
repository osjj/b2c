import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import 'dotenv/config'
import { Prisma, PrismaClient } from '@prisma/client'
import { z } from 'zod'

// This CLI deliberately bypasses seeds, admin actions and indexing hooks.
const CASE_SLUG = 'south-africa-mining-ppe-procurement-2026'
const CASE_ID = 'cmuu1gcon0000um188vsx2o88'
const CASE_PATH = `/cases/${CASE_SLUG}`
const SOLUTION_SLUG = 'ppe-safety-equipment-for-mining-quarrying'
const SECTION_KEY = 'mining-rfq-worksheet'
const ROOT = fileURLToPath(new URL('../', import.meta.url))
const EVIDENCE_DIRECTORY = resolve(ROOT, '.trellis/tasks/10-16-mining-case-contextual-links/evidence')
const BLOG_TARGETS = [
  {
    slug: 'mining-ppe-checklist-by-task',
    precedingHeading: 'How Supervisors Turn the Checklist Into Role Kits',
    followingHeading: 'Common Mining PPE Checklist Mistakes',
    paragraphSha256: 'fddd2dad1ba1b8ba7a4047a9dc906d73b95d0b1f1463fb21b628a21059413986',
  },
  {
    slug: 'mining-safety-helmet-buyer-guide',
    precedingHeading: 'Write a Quote-Ready Mining Safety Helmet RFQ',
    followingHeading: 'Common Mining Helmet Buying Mistakes',
    paragraphSha256: '9e34e0126b1c91af7c4c303817ee6e3b7a54ce53bc7b695350fe5d4ff82cb923',
  },
  {
    slug: 'mining-high-visibility-workwear-guide',
    precedingHeading: 'Write a Comparable Mining Workwear RFQ',
    followingHeading: 'Buyer Approval Checklist',
    paragraphSha256: '2371c3348e0ca16617509bd451c9ee3c37bbbd15598a954e3707f3325cbcfc41',
  },
] as const
const SOLUTION_PARAGRAPH_SHA256 = 'c8a3ed276f9939337fc86bbd934aa56d0abfac71410e0dababda89bfd30996e8'

const sourceSolutionSchema = z.object({
  slug: z.string(),
  isActive: z.boolean(),
  sections: z.array(z.object({
    key: z.string(),
    type: z.string(),
    title: z.string().nullish(),
    enabled: z.boolean(),
    data: z.unknown(),
  })),
})
const sourceSolutionsSchema = z.array(z.object({ slug: z.string() }).passthrough())
const paragraphDataSchema = z.object({ paragraphs: z.array(z.string()) })

function sha256(value: string | Buffer): string {
  return createHash('sha256').update(value).digest('hex')
}

function caseReferences(value: unknown): number {
  return JSON.stringify(value).split(CASE_SLUG).length - 1
}

function jsonObject(value: Prisma.JsonValue | undefined, description: string): Prisma.JsonObject {
  assert.ok(value !== null && typeof value === 'object' && !Array.isArray(value), description)
  return value
}

function inputObject(value: Prisma.JsonObject): Prisma.InputJsonObject {
  // JSON round-trip rejects undefined/non-JSON values and validates Prisma's input boundary.
  return z.record(z.string(), z.json()).parse(JSON.parse(JSON.stringify(value)))
}

function inlineParagraph(markdown: string): string {
  assert.equal(caseReferences(markdown), 1, 'Source must contain exactly one case reference')
  const links = [...markdown.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g)]
  assert.equal(links.length, 1, 'Only the reviewed case link may be added')
  assert.equal(links[0]?.[2], CASE_PATH, 'Case link must use the canonical path')
  assert.ok(!/[<>"`*]/.test(markdown), 'Unexpected source paragraph markup')
  return markdown.replace(/&/g, '&amp;').replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>',
  )
}

async function readSources() {
  const paths = [...BLOG_TARGETS.map(({ slug }) => `${slug}.md`), 'prisma/solutions-data.json']
  const files = await Promise.all(paths.map(async (path) => ({ path, bytes: await readFile(resolve(ROOT, path)) })))
  const blogs = BLOG_TARGETS.map((target) => {
    const file = files.find(({ path }) => path === `${target.slug}.md`)
    assert.ok(file, 'Markdown source unavailable')
    const paragraphs = file.bytes.toString('utf8').split(/\r?\n\s*\r?\n/).map((value) => value.trim())
    const references = paragraphs.filter((value) => value.includes(CASE_SLUG))
    assert.equal(references.length, 1, `${target.slug}: source case reference changed`)
    const paragraph = references[0]
    assert.ok(paragraph, 'Source paragraph unavailable')
    assert.equal(sha256(paragraph), target.paragraphSha256, `${target.slug}: reviewed source paragraph changed`)
    const paragraphIndex = paragraphs.indexOf(paragraph)
    assert.equal(paragraphs[paragraphIndex + 1], `## ${target.followingHeading}`, `${target.slug}: source placement changed`)
    const precedingHeading = paragraphs.slice(0, paragraphIndex).filter((value) => /^## /.test(value)).at(-1)
    assert.equal(precedingHeading, `## ${target.precedingHeading}`, `${target.slug}: source section changed`)
    return { ...target, paragraph, html: inlineParagraph(paragraph), blockId: `case${sha256(target.slug + paragraph).slice(0, 6)}` }
  })
  const solutionFile = files.find(({ path }) => path === 'prisma/solutions-data.json')
  assert.ok(solutionFile, 'Solution source unavailable')
  const solutions = sourceSolutionsSchema.parse(JSON.parse(solutionFile.bytes.toString('utf8')))
  const matches = solutions.filter(({ slug }) => slug === SOLUTION_SLUG)
  assert.equal(matches.length, 1, 'Expected one source Solution')
  const solution = sourceSolutionSchema.parse(matches[0])
  assert.ok(solution.isActive, 'Source Solution must remain active')
  const sections = solution.sections.filter(({ key }) => key === SECTION_KEY)
  assert.equal(sections.length, 1, 'Expected one source RFQ section')
  const section = sections[0]
  assert.ok(section?.enabled && section.type === 'paragraphs', 'Source RFQ section changed')
  assert.equal(section.title, 'Prepare a Mining PPE RFQ and Sample Review', 'Source RFQ title changed')
  const sourceParagraphs = paragraphDataSchema.parse(section.data).paragraphs
  const paragraph = sourceParagraphs.at(-1)
  assert.ok(paragraph, 'Source Solution paragraph unavailable')
  assert.equal(sha256(paragraph), SOLUTION_PARAGRAPH_SHA256, 'Reviewed Solution paragraph changed')
  assert.equal(caseReferences(sourceParagraphs), 1, 'Source Solution has duplicate case references')
  assert.equal(caseReferences(solution.sections.map(({ data }) => data)), 1, 'Source Solution has another case reference')
  inlineParagraph(paragraph)
  return { files, blogs, solution: { paragraph } }
}

type Sources = Awaited<ReturnType<typeof readSources>>
type Reader = Pick<Prisma.TransactionClient, 'blogPost' | 'solution' | 'caseStudy'>

async function readPublicSnapshot(reader: Reader) {
  const now = new Date()
  const [blogs, solution, caseStudy] = await Promise.all([
    reader.blogPost.findMany({
      where: { slug: { in: BLOG_TARGETS.map(({ slug }) => slug) }, isPublished: true, publishedAt: { lte: now } },
      orderBy: { slug: 'asc' },
    }),
    reader.solution.findFirst({
      where: { slug: SOLUTION_SLUG, isActive: true },
      include: { sections: { orderBy: [{ sort: 'asc' }, { id: 'asc' }] }, productLinks: { orderBy: { id: 'asc' } } },
    }),
    reader.caseStudy.findFirst({
      where: { id: CASE_ID, slug: CASE_SLUG, status: 'PUBLISHED', publicationApproved: true, publishedAt: { lte: now } },
    }),
  ])
  assert.equal(blogs.length, BLOG_TARGETS.length, 'All three Blog targets must be public and current')
  assert.ok(solution, 'Mining Solution must be active')
  assert.ok(caseStudy, 'Case must be the current approved public record')
  return { blogs, solution, caseStudy }
}

type Snapshot = Awaited<ReturnType<typeof readPublicSnapshot>>

function preparePlan(snapshot: Snapshot, sources: Sources) {
  const blogs = sources.blogs.map((source) => {
    const record = snapshot.blogs.find(({ slug }) => slug === source.slug)
    assert.ok(record, `${source.slug}: public target unavailable`)
    const content = jsonObject(record.content, `${source.slug}: invalid EditorJS content`)
    assert.ok(Array.isArray(content.blocks), `${source.slug}: EditorJS blocks unavailable`)
    const blocks = content.blocks.map((value) => jsonObject(value, `${source.slug}: invalid EditorJS block`))
    const ids = blocks.map((block) => block.id)
    assert.ok(ids.every((id) => typeof id === 'string' && id.length > 0), `${source.slug}: block identity unavailable`)
    assert.equal(new Set(ids).size, ids.length, `${source.slug}: duplicate block identities`)
    const h2s = blocks.flatMap((block, index) => {
      if (block.type !== 'header') return []
      const data = jsonObject(block.data, 'Invalid heading data')
      return data.level === 2 ? [{ index, text: data.text }] : []
    })
    const anchors = h2s.filter(({ text }) => text === source.followingHeading)
    assert.equal(anchors.length, 1, `${source.slug}: target H2 must be unique`)
    const anchor = anchors[0]
    assert.ok(anchor, 'Following H2 unavailable')
    const preceding = h2s.filter(({ index }) => index < anchor.index).at(-1)
    assert.equal(preceding?.text, source.precedingHeading, `${source.slug}: preceding H2 changed`)
    const newBlock = { id: source.blockId, type: 'paragraph', data: { text: source.html } }
    const count = caseReferences(content)
    assert.ok(count === 0 || count === 1, `${source.slug}: duplicate case references`)
    if (count === 1) {
      assert.deepEqual(blocks[anchor.index - 1], newBlock, `${source.slug}: different or misplaced existing case link`)
      return { source, record, nextContent: content, action: 'unchanged' as const, currentLinkCount: count, precedingParagraph: blocks[anchor.index - 2] }
    }
    assert.ok(!ids.includes(source.blockId), `${source.slug}: new block identity collision`)
    const nextContent = { ...content, blocks: [...blocks.slice(0, anchor.index), newBlock, ...blocks.slice(anchor.index)] }
    assert.equal(caseReferences(nextContent), 1)
    return { source, record, nextContent, action: 'apply' as const, currentLinkCount: count, precedingParagraph: blocks[anchor.index - 1] }
  })
  const sectionMatches = snapshot.solution.sections.filter(({ key }) => key === SECTION_KEY)
  assert.equal(sectionMatches.length, 1, 'Expected one current RFQ section')
  const section = sectionMatches[0]
  assert.ok(section?.enabled && section.type === 'paragraphs', 'Current RFQ section must be enabled paragraphs')
  assert.equal(section.title, 'Prepare a Mining PPE RFQ and Sample Review', 'Current RFQ section title changed')
  const data = jsonObject(section.data, 'Invalid RFQ section data')
  const paragraphs = paragraphDataSchema.parse(data).paragraphs
  assert.ok(paragraphs.length > 0, 'Existing RFQ paragraphs unavailable')
  const solutionCount = caseReferences(snapshot.solution.sections.map(({ data: sectionData }) => sectionData))
  assert.ok(solutionCount === 0 || solutionCount === 1, 'Solution has duplicate case references')
  if (solutionCount === 1) {
    assert.equal(paragraphs.at(-1), sources.solution.paragraph, 'Different or misplaced existing Solution case link')
    assert.equal(caseReferences(data), 1, 'Existing Solution case link is outside the target section')
  }
  const nextData = solutionCount === 0 ? { ...data, paragraphs: [...paragraphs, sources.solution.paragraph] } : data
  const action = blogs[0]?.action
  assert.ok(action, 'Blog plan unavailable')
  assert.ok(blogs.every((blog) => blog.action === action), 'Partial prior Blog update; reconcile read-only before retrying')
  assert.equal(solutionCount === 0 ? 'apply' : 'unchanged', action, 'Partial prior Solution update; reconcile read-only before retrying')
  return { action, blogs, section, nextData, solutionCount, solutionParagraphs: paragraphs }
}

type Plan = ReturnType<typeof preparePlan>

function summary(snapshot: Snapshot, plan: Plan) {
  return {
    action: plan.action,
    blogs: plan.blogs.map(({ source, record, currentLinkCount, precedingParagraph }) => ({
      slug: record.slug, id: record.id, updatedAt: record.updatedAt,
      currentLinkCount, expectedLinkCount: 1,
      precedingHeading: source.precedingHeading, followingHeading: source.followingHeading,
      currentPrecedingBlock: precedingParagraph,
      paragraphToAdd: source.paragraph, htmlToAdd: source.html,
    })),
    solution: {
      slug: snapshot.solution.slug, id: snapshot.solution.id, updatedAt: snapshot.solution.updatedAt,
      sectionId: plan.section.id, sectionKey: plan.section.key, sectionUpdatedAt: plan.section.updatedAt,
      currentLinkCount: plan.solutionCount, expectedLinkCount: 1,
      currentParagraphs: plan.solutionParagraphs, paragraphToAdd: plan.nextData.paragraphs instanceof Array ? plan.nextData.paragraphs.at(-1) : null,
    },
    case: { id: snapshot.caseStudy.id, slug: snapshot.caseStudy.slug, version: snapshot.caseStudy.version, updatedAt: snapshot.caseStudy.updatedAt },
  }
}

async function backupSnapshot(snapshot: Snapshot, sources: Sources): Promise<string> {
  await mkdir(EVIDENCE_DIRECTORY, { recursive: true, mode: 0o700 })
  const path = resolve(EVIDENCE_DIRECTORY, `before-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
  const bytes = Buffer.from(`${JSON.stringify({ capturedAt: new Date().toISOString(), sourceHashes: sources.files.map(({ path, bytes }) => ({ path, sha256: sha256(bytes) })), ...snapshot }, null, 2)}\n`)
  await writeFile(path, bytes, { flag: 'wx', mode: 0o600 })
  const saved = await readFile(path)
  assert.ok(saved.equals(bytes), 'Backup readback bytes differ; refusing to write')
  assert.deepEqual(JSON.parse(saved.toString('utf8')), JSON.parse(bytes.toString('utf8')), 'Backup JSON differs')
  return path
}

function assertProtectedFields(before: Snapshot, after: Snapshot, plan: Plan): void {
  assert.deepEqual(after.caseStudy, before.caseStudy, 'Case changed during update')
  assert.equal(after.blogs.length, before.blogs.length)
  plan.blogs.forEach(({ record, nextContent }) => {
    const saved = after.blogs.find(({ id }) => id === record.id)
    assert.ok(saved, 'Saved Blog unavailable')
    assert.deepEqual({ ...saved, updatedAt: record.updatedAt }, { ...record, content: nextContent }, `${record.slug}: protected fields changed`)
  })
  const expectedSolution = {
    ...before.solution,
    sections: before.solution.sections.map((section) => section.id === plan.section.id ? { ...section, data: plan.nextData } : section),
  }
  const normalizedSolution = {
    ...after.solution,
    updatedAt: before.solution.updatedAt,
    sections: after.solution.sections.map((section) => section.id === plan.section.id ? { ...section, updatedAt: plan.section.updatedAt } : section),
  }
  assert.deepEqual(normalizedSolution, expectedSolution, 'Protected Solution fields, media or relationships changed')
}

async function applyPlan(prisma: PrismaClient, before: Snapshot, sources: Sources) {
  const backup = await backupSnapshot(before, sources)
  await Promise.all(sources.files.map(async ({ path, bytes }) => {
    assert.ok((await readFile(resolve(ROOT, path))).equals(bytes), `${path}: source changed since review`)
  }))
  const after = await prisma.$transaction(async (transaction) => {
    const current = await readPublicSnapshot(transaction)
    assert.deepEqual(current, before, 'Records changed since the backed-up snapshot')
    const freshPlan = preparePlan(current, sources)
    assert.equal(freshPlan.action, 'apply', 'Unexpected prior update; refusing to write')
    const results = await Promise.all(freshPlan.blogs.map(({ record, nextContent }) => transaction.blogPost.updateMany({
      where: {
        id: record.id, slug: record.slug, updatedAt: record.updatedAt,
        isPublished: true, publishedAt: { equals: record.publishedAt, lte: new Date() },
      },
      data: { content: inputObject(nextContent) },
    })))
    assert.ok(results.every(({ count }) => count === 1), 'Blog version race; refusing to overwrite')
    const sectionResult = await transaction.solutionSection.updateMany({
      where: {
        id: freshPlan.section.id, solutionId: current.solution.id, key: SECTION_KEY,
        updatedAt: freshPlan.section.updatedAt, enabled: true, type: 'paragraphs',
        solution: { id: current.solution.id, slug: SOLUTION_SLUG, isActive: true, updatedAt: current.solution.updatedAt },
      },
      data: { data: inputObject(freshPlan.nextData) },
    })
    assert.equal(sectionResult.count, 1, 'Solution section version race; refusing to overwrite')
    const solutionResult = await transaction.solution.updateMany({
      where: { id: current.solution.id, slug: SOLUTION_SLUG, updatedAt: current.solution.updatedAt, isActive: true },
      data: { updatedAt: new Date() },
    })
    assert.equal(solutionResult.count, 1, 'Solution version race; refusing to overwrite')
    const saved = await readPublicSnapshot(transaction)
    assertProtectedFields(current, saved, freshPlan)
    assert.equal(preparePlan(saved, sources).action, 'unchanged', 'Saved result is not exactly idempotent')
    return saved
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 10_000, timeout: 30_000 })
  return { backup, after }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  assert.ok(args.length <= 1 && args.every((argument) => argument === '--inspect' || argument === '--apply'), 'Use no arguments (dry-run), --inspect, or --apply only')
  const mode = args[0] === '--apply' ? 'apply' : args[0] === '--inspect' ? 'inspect' : 'dry-run'
  const sources = await readSources()
  const prisma = new PrismaClient()
  try {
    const before = await readPublicSnapshot(prisma)
    const plan = preparePlan(before, sources)
    if (mode !== 'apply' || plan.action === 'unchanged') {
      process.stdout.write(`${JSON.stringify({ success: true, mode, databaseWrites: 0, ...summary(before, plan) }, null, 2)}\n`)
      return
    }
    const result = await applyPlan(prisma, before, sources)
    process.stdout.write(`${JSON.stringify({ success: true, mode, action: 'applied', databaseWrites: 5, backup: result.backup, protectedFieldsRetained: true, idempotent: true, result: summary(result.after, preparePlan(result.after, sources)) }, null, 2)}\n`)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error: unknown) => {
  const category = error instanceof assert.AssertionError ? 'CONTENT_GUARD_REJECTED'
    : error instanceof z.ZodError ? 'SOURCE_SHAPE_REJECTED'
      : error instanceof Prisma.PrismaClientInitializationError ? 'DATABASE_UNAVAILABLE'
        : error instanceof Prisma.PrismaClientKnownRequestError ? 'DATABASE_REQUEST_FAILED'
          : 'UNCONFIRMED_FAILURE'
  const candidateCode = error instanceof Prisma.PrismaClientInitializationError ? error.errorCode
    : error instanceof Prisma.PrismaClientKnownRequestError ? error.code : undefined
  const databaseCode = candidateCode && /^P\d{4}$/.test(candidateCode) ? candidateCode : undefined
  process.stderr.write(`${JSON.stringify({
    success: false,
    category,
    databaseCode,
    reason: 'Content sync failed or could not be confirmed. Error details are withheld to protect snapshot fields and database credentials.',
    nextStep: 'Do not automatically retry an apply. Run --inspect to reconcile the current public records first.',
  })}\n`)
  process.exitCode = 1
})
