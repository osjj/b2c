import 'dotenv/config'
import assert from 'node:assert/strict'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PrismaClient } from '@prisma/client'

import { SOUTH_AFRICA_READING_ID, SOUTH_AFRICA_READING_SLUG } from '../src/lib/cases/south-africa-reading-candidate'
import { CASE_READING_RELEASE_FIELDS, prepareSouthAfricaReadingRelease } from '../src/lib/cases/south-africa-reading-release'
import { caseViewSchema, toAdminCaseView } from '../src/lib/cases/types'

async function main() {
  const args = process.argv.slice(2)
  if (args.some((argument) => argument !== '--apply' && !argument.startsWith('--directory=')) || args.filter((argument) => argument === '--apply').length > 1 || args.filter((argument) => argument.startsWith('--directory=')).length > 1) throw new Error('Invalid release arguments')
  const directoryArg = args.find((argument) => argument.startsWith('--directory='))?.slice('--directory='.length)
  if (directoryArg === '') throw new Error('Empty review directory')
  const directory = resolve(directoryArg || 'output/case-improvement-20261006')
  const source = caseViewSchema.parse(JSON.parse(await readFile(resolve(directory, 'before.json'), 'utf8')))
  const candidate = caseViewSchema.parse(JSON.parse(await readFile(resolve(directory, 'candidate.json'), 'utf8')))
  const prisma = new PrismaClient()
  try {
    const original = await prisma.caseStudy.findUnique({ where: { id: SOUTH_AFRICA_READING_ID } })
    assert.ok(original, 'Source unavailable')
    const plan = prepareSouthAfricaReadingRelease(toAdminCaseView(original), source, candidate)
    if (plan.action === 'unchanged' || !args.includes('--apply')) {
      console.log(JSON.stringify({ mode: args.includes('--apply') ? 'apply' : 'dry-run', action: plan.action, id: original.id, currentVersion: original.version, changedFields: plan.action === 'apply' ? CASE_READING_RELEASE_FIELDS : [], galleryCount: candidate.gallery.length }))
      return
    }
    // Anchor backups outside public/ even if the CLI is launched from another cwd.
    const backupDirectory = fileURLToPath(new URL('../output/case-release-20261006/', import.meta.url))
    await mkdir(backupDirectory, { recursive: true })
    const backup = resolve(backupDirectory, `${original.id}-v${original.version}-${Date.now()}.json`)
    await writeFile(backup, `${JSON.stringify(original, null, 2)}\n`, { encoding: 'utf8', flag: 'wx', mode: 0o600 })
    const saved = await prisma.$transaction(async (transaction) => {
      const current = await transaction.caseStudy.findUnique({ where: { id: SOUTH_AFRICA_READING_ID } })
      assert.ok(current, 'Source unavailable')
      assert.deepEqual(current, original, 'Source changed since the backed-up snapshot')
      const freshPlan = prepareSouthAfricaReadingRelease(toAdminCaseView(current), source, candidate)
      assert.equal(freshPlan.action, 'apply', 'Source changed during release')
      if (freshPlan.action !== 'apply') throw new Error('Source changed during release')
      const result = await transaction.caseStudy.updateMany({
        where: {
          id: SOUTH_AFRICA_READING_ID, slug: SOUTH_AFRICA_READING_SLUG,
          version: freshPlan.expectedVersion, updatedAt: new Date(freshPlan.expectedUpdatedAt),
          status: 'PUBLISHED', publicationApproved: true, publishedAt: { lte: new Date() },
        },
        data: { ...freshPlan.data, version: { increment: 1 } },
      })
      assert.equal(result.count, 1, 'Version race; refusing to overwrite')
      const updated = await transaction.caseStudy.findUnique({ where: { id: SOUTH_AFRICA_READING_ID } })
      assert.ok(updated, 'Saved record unavailable')
      assert.equal(updated.version, original.version + 1)
      assert.deepEqual(
        JSON.parse(JSON.stringify({ ...updated, version: current.version, updatedAt: current.updatedAt })),
        JSON.parse(JSON.stringify({ ...current, ...freshPlan.data })),
        'Unexpected field change',
      )
      return updated
    })
    assert.equal(prepareSouthAfricaReadingRelease(toAdminCaseView(saved), source, candidate).action, 'unchanged')
    console.log(JSON.stringify({ mode: 'apply', action: 'applied', id: saved.id, version: saved.version, backup, retainedOtherFields: true, galleryCount: saved.gallery instanceof Array ? saved.gallery.length : null }))
  } finally { await prisma.$disconnect() }
}

main().catch(() => {
  console.error('Case release failed or could not be confirmed. No automatic retry: run a read-only dry-run to reconcile source and version.')
  process.exitCode = 1
})
