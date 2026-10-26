import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import 'dotenv/config'
import { Prisma, PrismaClient } from '@prisma/client'
import { EnvHttpProxyAgent, setGlobalDispatcher } from 'undici'
import { z } from 'zod'

import { prepareSouthAfricaContextualLinks, SOUTH_AFRICA_LINK_CASE_ID, SOUTH_AFRICA_LINK_CASE_SLUG } from '../src/lib/cases/south-africa-contextual-links'
import { toAdminCaseView } from '../src/lib/cases/types'

const ROOT = fileURLToPath(new URL('../', import.meta.url))
const DIRECTORY = resolve(ROOT, '.trellis/tasks/10-26-seo-links-and-content-diagnosis/evidence')
const BASELINE = resolve(DIRECTORY, 'case-links-reviewed-baseline.json')
const SOURCE = resolve(ROOT, 'src/lib/cases/south-africa-contextual-links.ts')
const digest = (bytes: string | Buffer) => createHash('sha256').update(bytes).digest('hex')
const json = (value: unknown): unknown => JSON.parse(JSON.stringify(value))
const baselineSchema = z.object({ sourceSha256: z.string().regex(/^[a-f0-9]{64}$/), record: z.record(z.string(), z.json()) })

async function checkedWrite(path: string, value: unknown): Promise<void> {
  const bytes = Buffer.from(`${JSON.stringify(value, null, 2)}\n`)
  await mkdir(DIRECTORY, { recursive: true })
  await writeFile(path, bytes, { flag: 'wx', mode: 0o600 })
  assert.ok((await readFile(path)).equals(bytes), 'Private evidence byte verification failed')
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  assert.ok(args.length <= 1 && args.every((arg) => ['--inspect', '--prepare', '--apply'].includes(arg)))
  const mode = args[0] ?? '--inspect'
  const prisma = new PrismaClient()
  try {
    const before = await prisma.caseStudy.findUniqueOrThrow({ where: { id: SOUTH_AFRICA_LINK_CASE_ID } })
    const plan = prepareSouthAfricaContextualLinks(toAdminCaseView(before))
    const sourceBytes = await readFile(SOURCE)
    if (mode === '--prepare') {
      assert.equal(plan.action, 'apply')
      await checkedWrite(BASELINE, { sourceSha256: digest(sourceBytes), record: before })
    }
    if (mode !== '--apply' || plan.action === 'unchanged') {
      process.stdout.write(`${JSON.stringify({ success: true, mode, action: plan.action, databaseWrites: 0, version: before.version, destinations: plan.destinations, baseline: mode === '--prepare' ? BASELINE : undefined }, null, 2)}\n`)
      return
    }
    const baseline = baselineSchema.parse(JSON.parse(await readFile(BASELINE, 'utf8')))
    assert.equal(baseline.sourceSha256, digest(sourceBytes), 'Reviewed source changed')
    assert.deepEqual(json(before), baseline.record, 'Reviewed case changed')
    setGlobalDispatcher(new EnvHttpProxyAgent())
    const destinations = await Promise.all(plan.destinations.map(async (path) => {
      const url = `https://www.laifappe.com${path}`
      const response = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(30000) })
      assert.equal(response.status, 200, 'Reviewed destination must be public without a redirect')
      assert.ok(!/noindex/i.test(response.headers.get('x-robots-tag') ?? ''), 'Reviewed destination must be indexable')
      const html = await response.text()
      const canonical = html.match(/<link\b[^>]*rel="canonical"[^>]*href="([^"]+)"/i)?.[1]
      assert.equal(canonical, url)
      assert.ok(!/<meta\b[^>]*name="robots"[^>]*content="[^"]*noindex/i.test(html))
      return { url, status: response.status, canonical }
    }))
    const backup = resolve(DIRECTORY, `case-links-backup-v${before.version}-${Date.now()}.json`)
    await checkedWrite(backup, before)
    assert.ok((await readFile(SOURCE)).equals(sourceBytes), 'Source changed before transaction')
    const saved = await prisma.$transaction(async (tx) => {
      const current = await tx.caseStudy.findUniqueOrThrow({ where: { id: SOUTH_AFRICA_LINK_CASE_ID } })
      assert.deepEqual(json(current), json(before), 'Concurrent case change')
      const fresh = prepareSouthAfricaContextualLinks(toAdminCaseView(current))
      assert.equal(fresh.action, 'apply')
      const result = await tx.caseStudy.updateMany({
        where: { id: current.id, slug: SOUTH_AFRICA_LINK_CASE_SLUG, version: current.version, updatedAt: current.updatedAt, status: 'PUBLISHED', publicationApproved: true, publishedAt: { equals: current.publishedAt, lte: new Date() } },
        data: { procurement: fresh.procurement, relatedLinks: fresh.relatedLinks, version: { increment: 1 } },
      })
      assert.equal(result.count, 1, 'Optimistic guard rejected the write')
      const after = await tx.caseStudy.findUniqueOrThrow({ where: { id: current.id } })
      assert.equal(after.version, current.version + 1)
      assert.deepEqual(json({ ...after, version: current.version, updatedAt: current.updatedAt }), json({ ...current, procurement: fresh.procurement, relatedLinks: fresh.relatedLinks }), 'Protected case fields changed')
      assert.equal(prepareSouthAfricaContextualLinks(toAdminCaseView(after)).action, 'unchanged')
      return after
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 10000, timeout: 30000 })
    process.stdout.write(`${JSON.stringify({ success: true, mode, action: 'applied', databaseWrites: 1, version: saved.version, protectedFieldsRetained: true, idempotent: true, backup, destinations }, null, 2)}\n`)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error: unknown) => {
  const code = error instanceof Prisma.PrismaClientKnownRequestError ? error.code : undefined
  process.stderr.write(`${JSON.stringify({ success: false, code: code && /^P\d{4}$/.test(code) ? code : undefined, reason: 'Case link sync failed or was not confirmed. Snapshot and credential details are withheld. Run --inspect before any further apply.' })}\n`)
  process.exitCode = 1
})
