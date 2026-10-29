import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import 'dotenv/config'
import { Prisma, PrismaClient } from '@prisma/client'
import { EnvHttpProxyAgent, setGlobalDispatcher } from 'undici'
import { z } from 'zod'

import { southAfricaNarrativeCandidate } from '../src/lib/cases/south-africa-narrative'
import { caseInputSchema, caseViewSchema, publicCaseView, toAdminCaseView, type CaseView } from '../src/lib/cases/types'

const ROOT = fileURLToPath(new URL('../', import.meta.url))
const DIRECTORY = resolve(ROOT, '.trellis/tasks/10-29-south-africa-case-narrative/evidence')
const BASELINE = resolve(DIRECTORY, 'reviewed-baseline.json')
const SOURCE = resolve(ROOT, 'src/lib/cases/south-africa-narrative.ts')
const ID = 'cmuu1gcon0000um188vsx2o88'
const SLUG = 'south-africa-mining-ppe-procurement-2026'
const digest = (bytes: string | Buffer) => createHash('sha256').update(bytes).digest('hex')
const json = (value: unknown): unknown => JSON.parse(JSON.stringify(value))
const baselineSchema = z.object({
  sourceSha256: z.string().regex(/^[a-f0-9]{64}$/),
  candidateSha256: z.string().regex(/^[a-f0-9]{64}$/),
  record: z.record(z.string(), z.json()),
  candidate: caseViewSchema,
})
let stage = 'arguments'

function content(candidate: CaseView) {
  return {
    title: candidate.title, summary: candidate.summary, buyerProfile: candidate.buyerProfile,
    sections: candidate.sections, gallery: candidate.gallery, relatedLinks: candidate.relatedLinks,
    seoTitle: candidate.seoTitle, seoDescription: candidate.seoDescription,
  }
}

function verifyCandidate(source: CaseView, candidate: CaseView): void {
  assert.deepEqual({ ...candidate, ...content(source) }, source, 'Protected public case fields changed')
  assert.deepEqual(candidate.gallery.map(({ url, alt }) => ({ url, alt })), source.gallery.map(({ url, alt }) => ({ url, alt })), 'Original media changed')
  assert.equal(new Set(candidate.gallery.map(({ url }) => url)).size, 16, 'Expected sixteen distinct originals')
  caseInputSchema.parse({ ...candidate, status: 'PUBLISHED', publicationApproved: true, privateNotes: '' })
}

async function checkedWrite(path: string, value: unknown): Promise<void> {
  const bytes = Buffer.from(`${JSON.stringify(value, null, 2)}\n`)
  await mkdir(DIRECTORY, { recursive: true })
  await writeFile(path, bytes, { flag: 'wx', mode: 0o600 })
  assert.ok((await readFile(path)).equals(bytes), 'Evidence verification failed')
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  assert.ok(args.length <= 1 && args.every((arg) => ['--inspect', '--prepare', '--apply'].includes(arg)))
  const mode = args[0] ?? '--inspect'
  const prisma = new PrismaClient()
  try {
    stage = 'read-current'
    const before = await prisma.caseStudy.findUniqueOrThrow({ where: { id: ID } })
    stage = 'validate-current'
    assert.equal(before.slug, SLUG)
    assert.equal(before.status, 'PUBLISHED')
    assert.equal(before.publicationApproved, true)
    assert.ok(before.publishedAt && before.publishedAt <= new Date())
    stage = 'read-transform'
    const sourceBytes = await readFile(SOURCE)
    if (mode === '--inspect') {
      stage = 'project-current'
      process.stdout.write(`${JSON.stringify({ success: true, mode, databaseWrites: 0, version: before.version, title: before.title, sections: toAdminCaseView(before).sections.map(({ key, title }) => ({ key, title })), images: toAdminCaseView(before).gallery.length }, null, 2)}\n`)
      return
    }
    if (mode === '--prepare') {
      stage = 'prepare'
      const source = publicCaseView(toAdminCaseView(before))
      const candidate = southAfricaNarrativeCandidate(source)
      verifyCandidate(source, candidate)
      await checkedWrite(BASELINE, { sourceSha256: digest(sourceBytes), candidateSha256: digest(JSON.stringify(candidate)), record: before, candidate })
      await checkedWrite(resolve(DIRECTORY, 'before.json'), source)
      await checkedWrite(resolve(DIRECTORY, 'candidate.json'), candidate)
      process.stdout.write(`${JSON.stringify({ success: true, mode, databaseWrites: 0, sourceVersion: before.version, baseline: BASELINE, candidate: resolve(DIRECTORY, 'candidate.json') }, null, 2)}\n`)
      return
    }
    stage = 'verify-review'
    const baselineBytes = await readFile(BASELINE)
    const baseline = baselineSchema.parse(JSON.parse(baselineBytes.toString('utf8')))
    assert.equal(baseline.sourceSha256, digest(sourceBytes), 'Reviewed source changed')
    assert.equal(baseline.candidateSha256, digest(JSON.stringify(baseline.candidate)), 'Reviewed candidate changed')
    assert.deepEqual(JSON.parse(await readFile(resolve(DIRECTORY, 'candidate.json'), 'utf8')), baseline.candidate, 'Candidate artifact changed')
    assert.equal(baseline.record.id, ID)
    assert.equal(baseline.record.slug, SLUG)
    if (before.version === Number(baseline.record.version) + 1) {
      assert.deepEqual(json({ ...before, updatedAt: baseline.record.updatedAt }), { ...baseline.record, ...content(baseline.candidate), version: before.version }, 'Case changed after release')
      process.stdout.write(`${JSON.stringify({ success: true, mode, action: 'unchanged', databaseWrites: 0, version: before.version })}\n`)
      return
    }
    assert.deepEqual(json(before), baseline.record, 'Reviewed case changed')
    const source = publicCaseView(toAdminCaseView(before))
    const candidate = southAfricaNarrativeCandidate(source)
    verifyCandidate(source, candidate)
    assert.deepEqual(candidate, baseline.candidate, 'Candidate regeneration changed')
    stage = 'verify-links'
    setGlobalDispatcher(new EnvHttpProxyAgent())
    const paths = [...new Set([...candidate.procurement.flatMap(({ href }) => href ? [href] : []), ...candidate.relatedLinks.map(({ href }) => href)])]
    const destinations = await Promise.all(paths.map(async (path) => {
      const url = `https://www.laifappe.com${path}`
      const response = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(30000) })
      assert.equal(response.status, 200, 'Destination is not public')
      const html = await response.text()
      assert.equal(html.match(/<link\b[^>]*rel="canonical"[^>]*href="([^"]+)"/i)?.[1], url)
      // Inquiry forms may deliberately be noindex; editorial/category destinations must be indexable.
      if (path !== '/quote') {
        assert.ok(!/noindex/i.test(response.headers.get('x-robots-tag') ?? ''))
        assert.ok(!/<meta\b[^>]*name="robots"[^>]*content="[^"]*noindex/i.test(html))
      }
      return { path, status: response.status }
    }))
    stage = 'backup'
    const backup = resolve(DIRECTORY, `backup-v${before.version}-${Date.now()}.json`)
    await checkedWrite(backup, before)
    assert.ok((await readFile(SOURCE)).equals(sourceBytes), 'Source changed before write')
    assert.ok((await readFile(BASELINE)).equals(baselineBytes), 'Review changed before write')
    stage = 'transaction'
    const saved = await prisma.$transaction(async (tx) => {
      const current = await tx.caseStudy.findUniqueOrThrow({ where: { id: ID } })
      assert.deepEqual(json(current), baseline.record, 'Concurrent case change')
      const fresh = southAfricaNarrativeCandidate(publicCaseView(toAdminCaseView(current)))
      assert.deepEqual(fresh, candidate)
      const result = await tx.caseStudy.updateMany({
        where: { id: ID, slug: SLUG, version: current.version, updatedAt: current.updatedAt, status: 'PUBLISHED', publicationApproved: true, publishedAt: { equals: current.publishedAt, lte: new Date() } },
        data: { ...content(fresh), version: { increment: 1 } },
      })
      assert.equal(result.count, 1, 'Optimistic write rejected')
      const after = await tx.caseStudy.findUniqueOrThrow({ where: { id: ID } })
      assert.equal(after.version, current.version + 1)
      assert.deepEqual(json({ ...after, updatedAt: current.updatedAt }), json({ ...current, ...content(fresh), version: after.version }), 'Protected fields changed')
      return after
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 10000, timeout: 30000 })
    stage = 'readback'
    const readback = await prisma.caseStudy.findUniqueOrThrow({ where: { id: ID } })
    assert.deepEqual(json(readback), json(saved))
    await checkedWrite(resolve(DIRECTORY, 'published-public.json'), publicCaseView(toAdminCaseView(readback)))
    process.stdout.write(`${JSON.stringify({ success: true, mode, action: 'applied', databaseWrites: 1, version: saved.version, images: candidate.gallery.length, protectedFieldsRetained: true, backup, destinations }, null, 2)}\n`)
  } finally { await prisma.$disconnect() }
}

main().catch((error: unknown) => {
  const code = error instanceof Prisma.PrismaClientKnownRequestError ? error.code
    : error instanceof Prisma.PrismaClientInitializationError ? error.errorCode : undefined
  const errorName = error instanceof Error && /^[A-Za-z][A-Za-z0-9]{0,79}$/.test(error.name) ? error.name : undefined
  process.stderr.write(`${JSON.stringify({ success: false, stage, errorName, code: code && /^P\d{4}$/.test(code) ? code : undefined, reason: 'Case refresh failed or was not confirmed. Private details withheld. Run --inspect before any further apply.' })}\n`)
  process.exitCode = 1
})
