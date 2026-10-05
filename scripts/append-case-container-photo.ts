// Append ONLY the owner's additional container-loading photograph to the
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
const ALT = 'A forklift at the rear of an open shipping container containing stacked cartons at night.'
const CAPTION = 'Night-time container loading with a forklift and stacked cartons. This photograph documents the loading stage, not final delivery or a signed receipt.'
const client = new PrismaClient()

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
  if (!process.argv.includes('--append-container-photo') || argument('--case-id') !== TARGET_ID) throw new Error('Explicit source draft required')
  const expectedVersion = Number(argument('--expected-version'))
  const source = argument('--image-file')
  if (!source || !path.isAbsolute(source) || !source.toLowerCase().endsWith('.png')
    || !Number.isInteger(expectedVersion) || expectedVersion < 1) throw new Error('Explicit PNG source and version required')
  const bytes = await readFile(source)
  if (!bytes.length || bytes.length > 10 * 1024 * 1024) throw new Error('Source size rejected')
  const decoder = sharp(bytes, { failOn: 'warning', limitInputPixels: 40_000_000 }).timeout({ seconds: 30 })
  const metadata = await decoder.metadata()
  if (metadata.format !== 'png' || !metadata.width || !metadata.height) throw new Error('PNG required')
  await decoder.raw().toBuffer()
  const sha256 = createHash('sha256').update(bytes).digest('hex')
  const filename = `${sha256}.png`
  const url = casePrivateImageUrl(TARGET_ID, sha256, 'png')
  const record = await client.caseStudy.findUnique({ where: { id: TARGET_ID } })
  if (!record || record.slug !== TARGET_SLUG || record.status !== 'DRAFT'
    || record.publicationApproved || record.publishedAt) throw new Error('Existing unpublished source draft required')
  const before = toAdminCaseView(record)
  if (before.gallery.some((image) => image.url === url)) {
    process.stdout.write(`${JSON.stringify({ action: 'unchanged', status: before.status, version: before.version, galleryCount: before.gallery.length, sha256, databaseWrites: 0, storageWrites: 0 })}\n`)
    return
  }
  if (record.version !== expectedVersion || before.gallery.length >= 30) throw new Error('Version conflict or full gallery')
  const gallery = [...before.gallery, { url, alt: ALT, caption: CAPTION }]
  const note = 'ADDITIONAL OWNER PHOTO: An original container-loading photograph was added privately after the 14 Notion images. Visible vehicle identifiers, carton labels and the operator remain private. No loading date, final-delivery status or signed receipt is inferred from this photograph.'
  const privateNotes = `${before.privateNotes}\n\n${note}`
  caseInputSchema.parse({ ...before, gallery, privateNotes })
  const preserved = unchangedFields(record)
  if (!process.argv.includes('--apply')) {
    process.stdout.write(`${JSON.stringify({ action: 'dry-run', id: TARGET_ID, status: before.status, expectedVersion, galleryBefore: before.gallery.length, galleryAfter: gallery.length, fullyDecoded: true, bytes: bytes.length, width: metadata.width, height: metadata.height, sha256, databaseWrites: 0, storageWrites: 0 })}\n`)
    return
  }
  await putCasePrivateImage(TARGET_ID, filename, bytes, 'image/png')
  const stored = await getCasePrivateImage(TARGET_ID, filename)
  assert.equal(stored.contentType, 'image/png')
  assert.equal(stored.bytes.equals(bytes), true)
  const updated = await client.caseStudy.updateMany({
    where: { id: TARGET_ID, version: expectedVersion, status: 'DRAFT', publicationApproved: false, publishedAt: null },
    data: { gallery, privateNotes, version: { increment: 1 } },
  })
  if (updated.count !== 1) throw new Error('Version conflict; private object retained, no overwrite')
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

main().catch(() => {
  process.stderr.write('Private photo append not confirmed. Inspect the current draft version and private storage; do not blindly retry or publish.\n')
  process.exitCode = 1
}).finally(() => client.$disconnect())
