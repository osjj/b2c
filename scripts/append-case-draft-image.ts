// Append ONLY the owner's explicitly supplied image/example to the
// existing source draft. No public upload, publication or other case updates.
import 'dotenv/config'

import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { PrismaClient } from '@prisma/client'
import sharp from 'sharp'

import { casePrivateImageUrl } from '../src/lib/cases/private-image-path'
import { getCasePrivateImage, putCasePrivateImage } from '../src/lib/cases/private-media'
import { caseInputSchema, toAdminCaseView } from '../src/lib/cases/types'

const TARGET_ID = 'cmuu1gcon0000um188vsx2o88'
const TARGET_SLUG = 'south-africa-mining-ppe-procurement-2026'
const APPEND_MODES = {
  '--append-container-photo': {
    alt: 'A forklift at the rear of an open shipping container containing stacked cartons at night.',
    caption: 'Night-time container loading with a forklift and stacked cartons. This photograph documents the loading stage, not final delivery or a signed receipt.',
    note: 'ADDITIONAL OWNER PHOTO: An original container-loading photograph was added privately after the 14 Notion images. Visible vehicle identifiers, carton labels and the operator remain private. No loading date, final-delivery status or signed receipt is inferred from this photograph.',
  },
  '--append-quotation-example': {
    alt: 'Quotation example screenshot showing a cotton reflective work coverall line item, with prices obscured.',
    caption: 'Quotation document example supplied by the owner, showing page 1 of 8 and part of the next page, with prices obscured. This screenshot is not confirmation of final order terms. Its workwear unit is pcs; the case retains the owner-confirmed unit of sets.',
    note: 'QUOTATION EXAMPLE: The owner supplied a screenshot, not the complete eight-page document or proof of final accepted order terms. Preserve the existing 200 sets of workwear despite the screenshot using 200 pcs. Visible example specifications/MOQ, the quotation date, numbering and work-coverall design are not promoted to case/order facts. Prices are obscured and must not be reconstructed. The quotation identifier/date correspondence and final ordered garment model remain unverified. Company/document references and the original screenshot stay private. This is a quotation example, not a pro forma invoice or payment/delivery evidence.',
  },
} as const
const client = new PrismaClient()
let appendStage = 'input-validation'

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(name)
  return index < 0 ? undefined : process.argv[index + 1]
}

function unchangedFields(record: Record<string, unknown>): string {
  return JSON.stringify(Object.fromEntries(Object.entries(record).filter(([key]) => ![
    'gallery', 'privateNotes', 'version', 'updatedAt',
  ].includes(key))))
}

async function main(): Promise<void> {
  const modes = (Object.keys(APPEND_MODES) as Array<keyof typeof APPEND_MODES>).filter((mode) => process.argv.includes(mode))
  const mode = modes[0]
  if (modes.length !== 1 || !mode || argument('--case-id') !== TARGET_ID) throw new Error('Exactly one mode and explicit source draft required')
  const content = APPEND_MODES[mode]
  if (process.argv.includes('--check-private-object') && process.argv.includes('--apply')) throw new Error('Read-only inspection cannot apply')
  const expectedVersion = Number(argument('--expected-version'))
  const source = argument('--image-file')
  if (!source || !path.isAbsolute(source) || !source.toLowerCase().endsWith('.png')
    || !Number.isInteger(expectedVersion) || expectedVersion < 1) throw new Error('Explicit PNG source and version required')
  appendStage = 'original-decode'
  const bytes = await readFile(source)
  if (!bytes.length || bytes.length > 10 * 1024 * 1024) throw new Error('Source size rejected')
  const decoder = sharp(bytes, { failOn: 'warning', limitInputPixels: 40_000_000 }).timeout({ seconds: 30 })
  const metadata = await decoder.metadata()
  if (metadata.format !== 'png' || !metadata.width || !metadata.height) throw new Error('PNG required')
  await decoder.raw().toBuffer()
  const sha256 = createHash('sha256').update(bytes).digest('hex')
  const filename = `${sha256}.png`
  const url = casePrivateImageUrl(TARGET_ID, sha256, 'png')
  appendStage = 'draft-read'
  const record = await client.caseStudy.findUnique({ where: { id: TARGET_ID } })
  appendStage = 'draft-validation'
  if (!record || record.slug !== TARGET_SLUG || record.status !== 'DRAFT'
    || record.publicationApproved || record.publishedAt) throw new Error('Existing unpublished source draft required')
  const before = toAdminCaseView(record)
  if (before.gallery.some((image) => image.url === url)) {
    process.stdout.write(`${JSON.stringify({ action: 'unchanged', status: before.status, version: before.version, galleryCount: before.gallery.length, sha256, databaseWrites: 0, storageWrites: 0 })}\n`)
    return
  }
  if (record.version !== expectedVersion || before.gallery.length >= 30) throw new Error('Version conflict or full gallery')
  const gallery = [...before.gallery, { url, alt: content.alt, caption: content.caption }]
  const privateNotes = `${before.privateNotes}\n\n${content.note}`
  caseInputSchema.parse({ ...before, gallery, privateNotes })
  const preserved = unchangedFields(record)
  if (process.argv.includes('--check-private-object')) {
    appendStage = 'private-readback-inspection'
    const stored = await getCasePrivateImage(TARGET_ID, filename)
    assert.equal(stored.contentType, 'image/png')
    assert.equal(stored.bytes.equals(bytes), true)
    process.stdout.write(`${JSON.stringify({ action: 'private-object-verified', status: before.status, version: before.version, galleryCount: before.gallery.length, privateOriginalVerified: true, sha256, databaseWrites: 0, storageWrites: 0 })}\n`)
    return
  }
  if (!process.argv.includes('--apply')) {
    process.stdout.write(`${JSON.stringify({ action: 'dry-run', id: TARGET_ID, status: before.status, expectedVersion, galleryBefore: before.gallery.length, galleryAfter: gallery.length, fullyDecoded: true, bytes: bytes.length, width: metadata.width, height: metadata.height, sha256, databaseWrites: 0, storageWrites: 0 })}\n`)
    return
  }
  appendStage = 'private-upload'
  if (!process.argv.includes('--reuse-verified-private-object')) await putCasePrivateImage(TARGET_ID, filename, bytes, 'image/png')
  appendStage = 'private-readback'
  const stored = await getCasePrivateImage(TARGET_ID, filename)
  assert.equal(stored.contentType, 'image/png')
  assert.equal(stored.bytes.equals(bytes), true)
  appendStage = 'draft-update'
  const updated = await client.caseStudy.updateMany({
    where: { id: TARGET_ID, version: expectedVersion, status: 'DRAFT', publicationApproved: false, publishedAt: null },
    data: { gallery, privateNotes, version: { increment: 1 } },
  })
  if (updated.count !== 1) throw new Error('Version conflict; private object retained, no overwrite')
  appendStage = 'post-write-verification'
  const after = await client.caseStudy.findUnique({ where: { id: TARGET_ID } })
  if (!after) throw new Error('Post-write record unavailable')
  assert.equal(unchangedFields(after), preserved)
  assert.deepEqual(after.gallery, gallery)
  assert.equal(after.version, expectedVersion + 1)
  assert.equal(after.status, 'DRAFT')
  assert.equal(after.publicationApproved, false)
  assert.equal(after.publishedAt, null)
  process.stdout.write(`${JSON.stringify({ action: 'appended', id: TARGET_ID, status: after.status, version: after.version, galleryCount: gallery.length, previousGalleryUnchanged: true, coverAndCommercialFieldsUnchanged: true, privateOriginalVerified: true, sha256, publicationApproved: false, publishedAt: null })}\n`)
}

main().catch((error: unknown) => {
  const rawCode = error && typeof error === 'object' && 'code' in error ? error.code : undefined
  const code = typeof rawCode === 'string' && /^P\d{4}$/.test(rawCode) ? rawCode : 'NOT_CONFIRMED'
  process.stderr.write(`${JSON.stringify({ success: false, stage: appendStage, code, reason: 'Private image append not confirmed. Inspect current draft version and private storage; do not blindly retry or publish.' })}\n`)
  process.exitCode = 1
}).finally(() => client.$disconnect())
