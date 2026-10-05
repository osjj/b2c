// One scoped owner-authorized editorial update. No media/storage/account writes.
import 'dotenv/config'

import assert from 'node:assert/strict'
import { PrismaClient } from '@prisma/client'

import { southAfricaMiningDraft } from '../src/lib/cases/south-africa-draft'
import { toAdminCaseView } from '../src/lib/cases/types'
import { refreshSouthAfricaCase, SOUTH_AFRICA_CASE_ID, SOUTH_AFRICA_CASE_SLUG } from '../src/lib/cases/south-africa-editorial-refresh'

const client = new PrismaClient()
let stage = 'input-validation'

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(name)
  return index < 0 ? undefined : process.argv[index + 1]
}

function preservedFields(record: Record<string, unknown>): string {
  return JSON.stringify(Object.fromEntries(Object.entries(record).filter(([key]) => ![
    'summary', 'buyerProfile', 'sections', 'gallery', 'version', 'updatedAt',
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
  const candidate = refreshSouthAfricaCase(before)
  const data = { summary: candidate.summary, buyerProfile: candidate.buyerProfile, sections: candidate.sections, gallery: candidate.gallery }
  const saved = { summary: before.summary, buyerProfile: before.buyerProfile, sections: before.sections, gallery: before.gallery }
  if (JSON.stringify(saved) === JSON.stringify(data)) {
    process.stdout.write(`${JSON.stringify({ action: 'unchanged', id: before.id, status: before.status, version: before.version, sections: before.sections.length, galleryCount: before.gallery.length, databaseWrites: 0, storageWrites: 0 })}\n`)
    return
  }
  assert.equal(record.version, expectedVersion)
  // Protect later editorial changes as well as the atomic version race.
  assert.equal(before.summary, southAfricaMiningDraft.summary)
  assert.equal(before.buyerProfile, southAfricaMiningDraft.buyerProfile)
  assert.deepEqual(before.sections, southAfricaMiningDraft.sections)
  assert.deepEqual(before.procurement, southAfricaMiningDraft.procurement)
  assert.equal(before.cooperationDate, southAfricaMiningDraft.cooperationDate)
  assert.equal(before.customization, southAfricaMiningDraft.customization)
  const preserved = preservedFields(record)
  const originals = before.gallery.map(({ url, alt, caption }) => ({ url, alt, caption }))
  const details = {
    id: before.id, status: before.status, expectedVersion, sectionsBefore: before.sections.length,
    sectionsAfter: candidate.sections.length, galleryCount: candidate.gallery.length,
    allImagesAssigned: candidate.gallery.every((image) => Boolean(image.placement)),
    storyWords: candidate.sections.reduce((sum, section) => sum + section.body.split(/\s+/).length, 0),
    storageWrites: 0, publicationApproved: false, publishedAt: null,
  }
  if (!process.argv.includes('--apply')) {
    process.stdout.write(`${JSON.stringify({ action: 'dry-run', ...details, databaseWrites: 0 })}\n`)
    return
  }
  stage = 'guarded-draft-update'
  const updated = await client.caseStudy.updateMany({
    where: { id: SOUTH_AFRICA_CASE_ID, slug: SOUTH_AFRICA_CASE_SLUG, version: expectedVersion, status: 'DRAFT', publicationApproved: false, publishedAt: null },
    data: { ...data, version: { increment: 1 } },
  })
  assert.equal(updated.count, 1, 'Conflict: no overwrite permitted')
  stage = 'post-write-verification'
  const after = await client.caseStudy.findUnique({ where: { id: SOUTH_AFRICA_CASE_ID } })
  if (!after) throw new Error('Saved result unavailable; reconcile read-only')
  assert.equal(preservedFields(after), preserved)
  const verified = toAdminCaseView(after)
  assert.deepEqual({ summary: verified.summary, buyerProfile: verified.buyerProfile, sections: verified.sections, gallery: verified.gallery }, data)
  assert.deepEqual(verified.gallery.map(({ url, alt, caption }) => ({ url, alt, caption })), originals)
  assert.equal(verified.version, expectedVersion + 1)
  process.stdout.write(`${JSON.stringify({ action: 'refreshed', ...details, version: verified.version, databaseWrites: 1, originalImagesAndCommercialFieldsUnchanged: true })}\n`)
}

main().catch((error: unknown) => {
  const rawCode = error && typeof error === 'object' && 'code' in error ? error.code : undefined
  const code = typeof rawCode === 'string' && /^P\d{4}$/.test(rawCode) ? rawCode : 'NOT_CONFIRMED'
  process.stderr.write(`${JSON.stringify({ success: false, stage, code, reason: 'Editorial refresh not confirmed. Inspect the saved draft before retrying; no blind overwrite or publication.' })}\n`)
  process.exitCode = 1
}).finally(() => client.$disconnect())
