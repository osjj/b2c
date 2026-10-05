// Owner-authorized import of original Notion images into an existing PRIVATE
// draft. Default is read-only; --apply and an explicit version are mandatory.
import 'dotenv/config'

import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { PrismaClient } from '@prisma/client'
import sharp from 'sharp'
import { z } from 'zod'

import { casePrivateImageUrl } from '../src/lib/cases/private-image-path'
import { getCasePrivateImage, putCasePrivateImage } from '../src/lib/cases/private-media'
import { southAfricaMiningDraft } from '../src/lib/cases/south-africa-draft'
import { caseInputSchema, toAdminCaseView } from '../src/lib/cases/types'

const TARGET_ID = 'cmuu1gcon0000um188vsx2o88'
const TASK_ROOT = path.resolve('.trellis/tasks/10-05-procurement-cases')
const MAX_BYTES = 10 * 1024 * 1024
const manifestSchema = z.array(z.object({
  order: z.number().int().min(1).max(14),
  filename: z.string().regex(/^source-(?:[1-9]|1[0-4])\.(png|jpg)$/),
  bytes: z.number().int().positive().max(MAX_BYTES),
  width: z.number().int().positive(), height: z.number().int().positive(),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
})).length(14)
const captionsSchema = z.array(z.object({
  order: z.number().int().min(1).max(14), filename: z.string(),
  alt: z.string().trim().min(1).max(300), caption: z.string().trim().min(1).max(1000),
})).length(14)
const client = new PrismaClient()

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(name)
  return index < 0 ? undefined : process.argv[index + 1]
}

function preserveContent(record: Record<string, unknown>): string {
  // Only these image/editorial bookkeeping fields may change in this import.
  const kept = Object.fromEntries(Object.entries(record).filter(([key]) => ![
    'coverImage', 'coverAlt', 'gallery', 'privateNotes', 'version', 'updatedAt',
  ].includes(key)))
  return JSON.stringify(kept)
}

async function main(): Promise<void> {
  const apply = process.argv.includes('--apply')
  if (argument('--case-id') !== TARGET_ID) throw new Error('Explicit source-case ID required')
  const expectedVersion = Number(argument('--expected-version'))
  if (!Number.isInteger(expectedVersion) || expectedVersion < 1) throw new Error('Explicit version required')

  const manifest = manifestSchema.parse(JSON.parse(await readFile(path.join(TASK_ROOT, 'notion-images-local.json'), 'utf8')))
  const captions = captionsSchema.parse(JSON.parse(await readFile(path.join(TASK_ROOT, 'notion-image-captions.json'), 'utf8')))
  manifest.sort((a, b) => a.order - b.order)
  assert.equal(new Set(manifest.map((item) => item.sha256)).size, 14)
  assert.deepEqual(manifest.map((item) => item.order), Array.from({ length: 14 }, (_, i) => i + 1))
  assert.equal(new Set(captions.map((item) => item.order)).size, 14)

  const originals = []
  for (const item of manifest) {
    const caption = captions.find((entry) => entry.order === item.order && entry.filename === item.filename)
    if (!caption) throw new Error('Caption/source mismatch')
    const bytes = await readFile(path.join(TASK_ROOT, 'notion-images', item.filename))
    assert.equal(bytes.length, item.bytes)
    assert.equal(createHash('sha256').update(bytes).digest('hex'), item.sha256)
    const decoder = sharp(bytes, { failOn: 'warning', limitInputPixels: 40_000_000 }).timeout({ seconds: 30 })
    const metadata = await decoder.metadata()
    assert.equal(metadata.width, item.width)
    assert.equal(metadata.height, item.height)
    const extension = item.filename.endsWith('.png') ? 'png' : 'jpg'
    assert.equal(metadata.format, extension === 'png' ? 'png' : 'jpeg')
    await decoder.raw().toBuffer() // FULL decode, not only header/metadata.
    originals.push({
      bytes, filename: `${item.sha256}.${extension}`, contentType: extension === 'png' ? 'image/png' : 'image/jpeg',
      image: { url: casePrivateImageUrl(TARGET_ID, item.sha256, extension), alt: caption.alt, caption: caption.caption },
    })
  }
  const record = await client.caseStudy.findUnique({ where: { id: TARGET_ID } })
  if (!record || record.slug !== southAfricaMiningDraft.slug || record.status !== 'DRAFT'
    || record.publicationApproved || record.publishedAt) throw new Error('Existing unpublished source draft required')
  const before = toAdminCaseView(record)
  assert.deepEqual(before.procurement, southAfricaMiningDraft.procurement)
  assert.equal(before.cooperationDate, '2026-08-02')
  const gallery = originals.map((item) => item.image)
  const first = gallery[0]
  if (!first) throw new Error('Cover missing')
  if (JSON.stringify(before.gallery) === JSON.stringify(gallery) && before.coverImage === first.url && before.coverAlt === first.alt) {
    process.stdout.write(`${JSON.stringify({ action: 'unchanged', status: before.status, version: before.version, galleryCount: gallery.length, publicationApproved: false })}\n`)
    return
  }
  if (record.version !== expectedVersion || before.gallery.length || before.coverImage) {
    throw new Error('Source draft changed; existing image fields will not be overwritten')
  }
  const current = 'All 14 original Notion images were fully decoded and SHA-256 verified, then attached through administrator-only private storage. Originals are not redacted or transformed. Faces, commercial identities, document references, shipment identifiers and precise logistics details remain private. Public use still requires a separate permission/redaction review. Tracking progress is not final delivery evidence.'
  const paragraphs = before.privateNotes.split('\n\n')
  const privateNotes = paragraphs.some((paragraph) => paragraph.startsWith('Images are deliberately absent:'))
    ? paragraphs.map((paragraph) => paragraph.startsWith('Images are deliberately absent:') ? current : paragraph).join('\n\n')
    : `${before.privateNotes}\n\nPRIVATE IMAGE IMPORT: ${current}`
  // Apply the same runtime editor/publication validation used by the app.
  caseInputSchema.parse({ ...before, coverImage: first.url, coverAlt: first.alt, gallery, privateNotes })
  const preserved = preserveContent(record)
  if (!apply) {
    process.stdout.write(`${JSON.stringify({ action: 'dry-run', id: TARGET_ID, status: before.status, expectedVersion, fullyDecodedImages: originals.length, originalBytes: originals.reduce((sum, item) => sum + item.bytes.length, 0), privateStorageOnly: true, databaseWrites: 0, storageWrites: 0 })}\n`)
    return
  }

  // Validate all originals and the draft before writing. Verify every private
  // object before ONE optimistic DB update. No public storage fallback exists.
  for (let offset = 0; offset < originals.length; offset += 2) {
    const chunk = originals.slice(offset, offset + 2)
    const results = await Promise.allSettled(chunk.map(async (item) => {
      await putCasePrivateImage(TARGET_ID, item.filename, item.bytes, item.contentType)
      const stored = await getCasePrivateImage(TARGET_ID, item.filename)
      assert.equal(stored.contentType, item.contentType)
      assert.equal(stored.bytes.equals(item.bytes), true)
    }))
    if (results.some((result) => result.status === 'rejected')) throw new Error('Private upload/readback failed; no DB update')
    process.stdout.write(`${JSON.stringify({ privateOriginalsVerified: Math.min(offset + 2, originals.length), total: originals.length, databaseWrites: 0 })}\n`)
  }
  const updated = await client.caseStudy.updateMany({
    where: { id: TARGET_ID, version: expectedVersion, status: 'DRAFT', publicationApproved: false, publishedAt: null },
    data: { coverImage: first.url, coverAlt: first.alt, gallery, privateNotes, version: { increment: 1 } },
  })
  if (updated.count !== 1) throw new Error('Draft version conflict; private originals retained, no DB overwrite')
  const after = await client.caseStudy.findUnique({ where: { id: TARGET_ID } })
  if (!after) throw new Error('Post-import record unavailable')
  assert.equal(preserveContent(after), preserved, 'Non-image content must remain unchanged')
  assert.equal(after.status, 'DRAFT')
  assert.equal(after.publicationApproved, false)
  assert.equal(after.publishedAt, null)
  assert.deepEqual(after.gallery, gallery)
  assert.equal(after.version, expectedVersion + 1)
  process.stdout.write(`${JSON.stringify({ action: 'imported', id: TARGET_ID, status: after.status, version: after.version, galleryCount: gallery.length, privateOriginalsVerified: originals.length, nonImageFieldsUnchanged: true, publishedAt: null, publicationApproved: false })}\n`)
}

main().catch(() => {
  // Never print raw SDK/DB errors: they can contain secrets/customer evidence.
  process.stderr.write('Private draft import not confirmed. Check current draft version and private storage; do not blindly retry or publish. Private objects may remain for reconciliation.\n')
  process.exitCode = 1
}).finally(() => client.$disconnect())
