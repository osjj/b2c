// Only the explicitly approved originals; no publication, private deletion or bucket changes.
import 'dotenv/config'

import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { setTimeout as delay } from 'node:timers/promises'

import { PrismaClient } from '@prisma/client'
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import sharp from 'sharp'

import { assertR2Configured, r2Client, r2BucketName } from '../src/lib/r2'
import { getCasePrivateImage } from '../src/lib/cases/private-media'
import { parseCasePrivateImage } from '../src/lib/cases/private-image-path'
import { toAdminCaseView } from '../src/lib/cases/types'
import { makeSouthAfricaPublicImagePlan } from '../src/lib/cases/south-africa-public-images'
import { SOUTH_AFRICA_CASE_ID, SOUTH_AFRICA_CASE_SLUG } from '../src/lib/cases/south-africa-editorial-refresh'

const client = new PrismaClient()
const MAX_BYTES = 10 * 1024 * 1024
let stage = 'input-validation'
let uploaded = 0
let reused = 0

type PublicObject = ReturnType<typeof makeSouthAfricaPublicImagePlan>['objects'][number]

function argumentsForCopy(): { expectedVersion: number; apply: boolean } {
  const args = process.argv.slice(2)
  const seen = new Set<string>()
  let id = ''
  let version = ''
  let apply = false
  for (let index = 0; index < args.length; index++) {
    const flag = args[index]
    assert.equal(seen.has(flag), false)
    seen.add(flag)
    if (flag === '--apply') apply = true
    else if (flag === '--case-id') id = args[++index] ?? ''
    else if (flag === '--expected-version') version = args[++index] ?? ''
    else throw new Error('Unsupported argument')
  }
  assert.equal(id, SOUTH_AFRICA_CASE_ID)
  assert.match(version, /^[1-9]\d{0,8}$/)
  return { expectedVersion: Number(version), apply }
}

function codeName(error: unknown): string {
  return error && typeof error === 'object' && 'name' in error && typeof error.name === 'string' ? error.name : ''
}

function preservedFields(record: Record<string, unknown>): string {
  return JSON.stringify(Object.fromEntries(Object.entries(record).filter(([key]) => ![
    'coverImage', 'gallery', 'privateNotes', 'version', 'updatedAt',
  ].includes(key))))
}

function contentType(object: PublicObject): string {
  return object.extension === 'png' ? 'image/png' : 'image/jpeg'
}

function checkBytes(bytes: Buffer, object: PublicObject, mime: string): void {
  assert.equal(bytes.length > 0 && bytes.length <= MAX_BYTES, true)
  assert.equal(mime, contentType(object))
  assert.equal(createHash('sha256').update(bytes).digest('hex'), object.sha256)
}

async function readPublicObject(object: PublicObject): Promise<Buffer | null> {
  let result
  try {
    result = await r2Client.send(new GetObjectCommand({ Bucket: r2BucketName, Key: object.key }), { abortSignal: AbortSignal.timeout(30_000) })
  } catch (error) {
    if (['NoSuchKey', 'NotFound'].includes(codeName(error))) return null
    throw error
  }
  if (!result.Body || (result.ContentLength !== undefined && (result.ContentLength < 1 || result.ContentLength > MAX_BYTES))) {
    throw new Error('Public object verification unavailable')
  }
  const bytes = Buffer.from(await result.Body.transformToByteArray())
  checkBytes(bytes, object, result.ContentType ?? '')
  return bytes
}

async function verifyAnonymousUrl(object: PublicObject): Promise<void> {
  // Bounded retry covers propagation, never credential/bucket changes.
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await fetch(object.url, { redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(30_000) })
    if (response.status !== 200) {
      await response.body?.cancel()
      if (attempt === 2) throw new Error('Public URL verification unavailable')
      await delay(1000 * (attempt + 1))
      continue
    }
    const length = Number(response.headers.get('content-length'))
    if (length > MAX_BYTES) throw new Error('Public URL size failed')
    const bytes = Buffer.from(await response.arrayBuffer())
    checkBytes(bytes, object, (response.headers.get('content-type') ?? '').split(';')[0].trim())
    return
  }
}

async function main(): Promise<void> {
  const { expectedVersion, apply } = argumentsForCopy()
  assertR2Configured()
  assert.equal(Boolean(process.env.R2_BUCKET_NAME), true)
  assert.equal(Boolean(process.env.QUOTATION_PRIVATE_R2_BUCKET), true)
  assert.notEqual(r2BucketName, process.env.QUOTATION_PRIVATE_R2_BUCKET)
  stage = 'draft-read'
  const record = await client.caseStudy.findUnique({ where: { id: SOUTH_AFRICA_CASE_ID } })
  if (!record || record.slug !== SOUTH_AFRICA_CASE_SLUG) throw new Error('Approved source draft missing')
  assert.equal(record.version, expectedVersion)
  const before = toAdminCaseView(record)
  assert.deepEqual(record.gallery, before.gallery)
  assert.equal(record.privateNotes, before.privateNotes)
  stage = 'candidate-validation'
  const plan = makeSouthAfricaPublicImagePlan(before, process.env.R2_PUBLIC_URL || 'https://shop.laifappe.com')
  if (plan.alreadyPublic) {
    stage = 'existing-public-readback'
    for (const object of plan.objects) {
      assert.equal(Boolean(await readPublicObject(object)), true)
      await verifyAnonymousUrl(object)
    }
    process.stdout.write(`${JSON.stringify({ action: 'unchanged', version: record.version, galleryCount: plan.objects.length, publicUrlsVerified: plan.objects.length, databaseWrites: 0, storageWrites: 0, status: before.status })}\n`)
    return
  }
  const preserved = preservedFields(record)
  stage = 'original-preflight'
  const originals: Buffer[] = []
  for (const [index, object] of plan.objects.entries()) {
    const privateImage = parseCasePrivateImage(object.sourceUrl)
    if (!privateImage || privateImage.caseId !== record.id) throw new Error('Unknown original')
    const original = await getCasePrivateImage(record.id, `${privateImage.sha256}.${privateImage.extension}`)
    checkBytes(original.bytes, object, original.contentType)
    const decoder = sharp(original.bytes, { failOn: 'warning', limitInputPixels: 40_000_000, animated: false }).timeout({ seconds: 30 })
    const metadata = await decoder.metadata()
    assert.equal(metadata.format, object.extension === 'png' ? 'png' : 'jpeg')
    assert.equal(Boolean(metadata.width && metadata.height), true)
    await decoder.raw().toBuffer()
    originals.push(original.bytes)
    process.stdout.write(`${JSON.stringify({ stage, checked: index + 1, total: plan.objects.length, databaseWrites: 0, storageWrites: 0 })}\n`)
  }
  if (!apply) {
    process.stdout.write(`${JSON.stringify({ action: 'dry-run', version: before.version, galleryCount: plan.objects.length, originalBytes: originals.reduce((sum, bytes) => sum + bytes.length, 0), databaseWrites: 0, storageWrites: 0, status: before.status })}\n`)
    return
  }
  for (const [index, object] of plan.objects.entries()) {
    stage = 'public-object-check'
    const existing = await readPublicObject(object)
    if (existing) {
      assert.deepEqual(existing, originals[index])
      reused++
    } else {
      stage = 'conditional-public-upload'
      try {
        await r2Client.send(new PutObjectCommand({
          Bucket: r2BucketName, Key: object.key, Body: originals[index], ContentType: contentType(object),
          IfNoneMatch: '*', Metadata: { sha256: object.sha256 },
        }), { abortSignal: AbortSignal.timeout(30_000) })
        uploaded++
      } catch (error) {
        if (codeName(error) !== 'PreconditionFailed') throw error
        // Another approved writer may have won; never overwrite it.
        const concurrent = await readPublicObject(object)
        assert.deepEqual(concurrent, originals[index])
        reused++
      }
    }
    stage = 'public-original-readback'
    assert.deepEqual(await readPublicObject(object), originals[index])
    await verifyAnonymousUrl(object)
    process.stdout.write(`${JSON.stringify({ stage, verified: index + 1, total: plan.objects.length, uploaded, reused, databaseWrites: 0 })}\n`)
  }
  stage = 'guarded-draft-image-update'
  const data = { coverImage: plan.candidate.coverImage, gallery: plan.candidate.gallery, privateNotes: plan.candidate.privateNotes }
  const updated = await client.caseStudy.updateMany({
    where: { id: SOUTH_AFRICA_CASE_ID, slug: SOUTH_AFRICA_CASE_SLUG, version: expectedVersion, status: 'DRAFT', publicationApproved: false, publishedAt: null },
    data: { ...data, version: { increment: 1 } },
  })
  assert.equal(updated.count, 1, 'Conflict: no overwrite permitted')
  stage = 'post-write-verification'
  const after = await client.caseStudy.findUnique({ where: { id: SOUTH_AFRICA_CASE_ID } })
  if (!after) throw new Error('Saved result unavailable; reconcile read-only')
  assert.equal(preservedFields(after), preserved)
  assert.deepEqual({ coverImage: after.coverImage, gallery: after.gallery, privateNotes: after.privateNotes }, data)
  assert.equal(after.version, expectedVersion + 1)
  assert.equal(await client.caseStudy.count({ where: { id: after.id, status: 'PUBLISHED' } }), 0)
  process.stdout.write(`${JSON.stringify({ action: 'public-originals-copied', version: after.version, galleryCount: plan.objects.length, publicUrlsVerified: plan.objects.length, storageWrites: uploaded, reused, databaseWrites: 1, status: after.status, publicationApproved: after.publicationApproved, publishedAt: after.publishedAt, contentFactsAndPlacementsUnchanged: true, privateOriginalsRetained: true })}\n`)
}

main().catch((error: unknown) => {
  const rawCode = error && typeof error === 'object' && 'code' in error ? error.code : undefined
  const code = typeof rawCode === 'string' && /^P\d{4}$/.test(rawCode) ? rawCode : 'NOT_CONFIRMED'
  process.stderr.write(`${JSON.stringify({ success: false, stage, code, uploaded, reused, reason: 'Public image copy not confirmed. Reconcile objects and saved draft read-only before retrying; do not publish or overwrite.' })}\n`)
  process.exitCode = 1
}).finally(async () => {
  r2Client.destroy()
  await client.$disconnect()
})
