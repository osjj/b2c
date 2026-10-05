// Metadata-only repair for the authorized source draft; no storage/publication writes.
import 'dotenv/config'
import assert from 'node:assert/strict'
import { PrismaClient } from '@prisma/client'
import { toAdminCaseView } from '../src/lib/cases/types'
import { repairSouthAfricaCaseLayout, SOUTH_AFRICA_CASE_ID, SOUTH_AFRICA_CASE_SLUG } from '../src/lib/cases/south-africa-editorial-refresh'

const client = new PrismaClient()
let stage = 'input-validation'

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(name)
  return index < 0 ? undefined : process.argv[index + 1]
}

function preservedFields(record: Record<string, unknown>): string {
  return JSON.stringify(Object.fromEntries(Object.entries(record).filter(([key]) => ![
    'sections', 'gallery', 'version', 'updatedAt',
  ].includes(key))))
}

async function main(): Promise<void> {
  const expectedVersion = Number(argument('--expected-version'))
  assert.equal(argument('--case-id'), SOUTH_AFRICA_CASE_ID)
  assert.equal(Number.isInteger(expectedVersion) && expectedVersion > 0, true)
  stage = 'draft-read'
  const record = await client.caseStudy.findUnique({ where: { id: SOUTH_AFRICA_CASE_ID } })
  if (!record || record.slug !== SOUTH_AFRICA_CASE_SLUG) throw new Error('Authorized source draft missing')
  stage = 'candidate-validation'
  const before = toAdminCaseView(record)
  assert.equal(record.version, expectedVersion)
  // Reject unknown JSON/normalization differences instead of silently losing them.
  assert.deepEqual(record.sections, before.sections)
  assert.deepEqual(record.gallery, before.gallery)
  const candidate = repairSouthAfricaCaseLayout(before)
  const data = { sections: candidate.sections, gallery: candidate.gallery }
  const saved = { sections: before.sections, gallery: before.gallery }
  const details = {
    id: before.id, status: before.status, version: before.version,
    sections: before.sections.length, galleryCount: before.gallery.length,
    allImagesAssigned: candidate.gallery.every((image) => Boolean(image.placement)),
    storageWrites: 0, publicationApproved: false, publishedAt: null,
  }
  if (JSON.stringify(saved) === JSON.stringify(data)) {
    process.stdout.write(`${JSON.stringify({ action: 'unchanged', ...details, databaseWrites: 0 })}\n`)
    return
  }
  const preserved = preservedFields(record)
  const originalSections = before.sections.map(({ title, body }) => ({ title, body }))
  const originalImages = before.gallery.map(({ url, alt, caption }) => ({ url, alt, caption }))
  if (!process.argv.includes('--apply')) {
    process.stdout.write(`${JSON.stringify({ action: 'dry-run', ...details, expectedVersion, databaseWrites: 0 })}\n`)
    return
  }
  stage = 'guarded-layout-update'
  const updated = await client.caseStudy.updateMany({
    where: { id: SOUTH_AFRICA_CASE_ID, slug: SOUTH_AFRICA_CASE_SLUG, version: expectedVersion, status: 'DRAFT', publicationApproved: false, publishedAt: null },
    data: { ...data, version: { increment: 1 } },
  })
  assert.equal(updated.count, 1, 'Conflict: no overwrite permitted')
  stage = 'post-write-verification'
  const after = await client.caseStudy.findUnique({ where: { id: SOUTH_AFRICA_CASE_ID } })
  if (!after) throw new Error('Saved result unavailable; reconcile read-only')
  assert.equal(preservedFields(after), preserved)
  assert.deepEqual({ sections: after.sections, gallery: after.gallery }, data)
  const verified = toAdminCaseView(after)
  assert.deepEqual(verified.sections.map(({ title, body }) => ({ title, body })), originalSections)
  assert.deepEqual(verified.gallery.map(({ url, alt, caption }) => ({ url, alt, caption })), originalImages)
  assert.equal(verified.version, expectedVersion + 1)
  process.stdout.write(`${JSON.stringify({ action: 'layout-repaired', ...details, version: verified.version, databaseWrites: 1, proseOriginalsAndAllOtherFieldsUnchanged: true })}\n`)
}

main().catch((error: unknown) => {
  const rawCode = error && typeof error === 'object' && 'code' in error ? error.code : undefined
  const code = typeof rawCode === 'string' && /^P\d{4}$/.test(rawCode) ? rawCode : 'NOT_CONFIRMED'
  process.stderr.write(`${JSON.stringify({ success: false, stage, code, reason: 'Layout repair not confirmed. Reconcile the saved draft read-only before retrying; no blind overwrite or publication.' })}\n`)
  process.exitCode = 1
}).finally(() => client.$disconnect())
