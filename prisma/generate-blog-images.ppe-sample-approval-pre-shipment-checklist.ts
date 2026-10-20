/** Upload reviewed built-in Image Gen outputs; this script never invokes an AI API. */
import 'dotenv/config'
import assert from 'node:assert/strict'
import { createHash, randomUUID } from 'node:crypto'
import { readFile, rename, rm, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { GetObjectCommand, HeadObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import sharp from 'sharp'
import { assertR2Configured, r2BucketName, r2Client } from '../src/lib/r2'

const POST_SLUG = 'ppe-sample-approval-pre-shipment-checklist'
const OUTPUT_JSON = resolve('prisma', `blog-images.${POST_SLUG}.generated.json`)
const PUBLIC_ORIGIN = 'https://shop.laifappe.com'
const PUBLIC_BUCKET = 'medusa'
const REQUEST_TIMEOUT_MS = 30_000
const PLAN = [
  { key: 'hero', role: 'hero', aspectRatio: '16:9', prompt: 'Wide procurement review bench with unbranded mixed PPE samples and blank review paperwork; no readable text, logos, certificates or approval claims.' },
  { key: 'record-the-approved-sample-and-document-baseline', role: 'inspection', aspectRatio: '4:3', prompt: 'Top-down close-up of selected unbranded PPE samples, neutral version-control paperwork and a camera; no readable text, logos, certificates or approval claims.' },
  { key: 'use-a-pre-shipment-verification-record', role: 'procurement', aspectRatio: '4:3', prompt: 'Waist-level view of plain cartons and separated PPE packages at a warehouse verification table, hands only; no readable text, logos, customer identity or pass stamps.' },
] as const

function hash(bytes: Uint8Array) {
  return createHash('sha256').update(bytes).digest('hex')
}

function isMissing(error: unknown): boolean {
  return typeof error === 'object' && error !== null && '$metadata' in error
    && typeof error.$metadata === 'object' && error.$metadata !== null
    && 'httpStatusCode' in error.$metadata && error.$metadata.httpStatusCode === 404
}

function report(event: Record<string, unknown>) {
  process.stdout.write(JSON.stringify(event) + '\n')
}

async function readGenerated(): Promise<Record<string, string>> {
  let input: string
  try {
    input = await readFile(OUTPUT_JSON, 'utf8')
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT') return {}
    throw error
  }
  const parsed: unknown = JSON.parse(input)
  assert.ok(typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed), 'Invalid image manifest')
  const entries = Object.entries(parsed)
  for (const [key, value] of entries) {
    assert.ok(PLAN.some((image) => image.key === key), 'Unexpected manifest key')
    assert.ok(typeof value === 'string' && value.startsWith(`${PUBLIC_ORIGIN}/blog/${POST_SLUG}/${key}-`)
      && /^[a-f0-9]{12}\.webp$/.test(value.slice(`${PUBLIC_ORIGIN}/blog/${POST_SLUG}/${key}-`.length)), 'Invalid manifest URL')
  }
  return Object.fromEntries(entries)
}

async function saveGenerated(generated: Record<string, string>) {
  const temporaryPath = `${OUTPUT_JSON}.${randomUUID()}.tmp`
  try {
    await writeFile(temporaryPath, JSON.stringify(generated, null, 2) + '\n', { flag: 'wx' })
    await rename(temporaryPath, OUTPUT_JSON)
  } finally {
    await rm(temporaryPath, { force: true })
  }
}

async function uploadReviewed(key: string, bytes: Buffer, contentType: string, attachment = false) {
  const sha256 = hash(bytes)
  let exists = false
  try {
    await r2Client.send(new HeadObjectCommand({ Bucket: r2BucketName, Key: key }), { abortSignal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) })
    exists = true
  } catch (error) {
    if (!isMissing(error)) throw error
  }
  if (exists) {
    const current = await r2Client.send(new GetObjectCommand({ Bucket: r2BucketName, Key: key }), { abortSignal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) })
    assert.ok(current.Body, 'Remote asset unreadable')
    assert.equal(hash(await current.Body.transformToByteArray()), sha256, 'Remote asset conflict')
  } else {
    await r2Client.send(new PutObjectCommand({
      Bucket: r2BucketName, Key: key, Body: bytes, ContentType: contentType,
      IfNoneMatch: '*', Metadata: { sha256 },
      CacheControl: attachment ? 'public, max-age=3600' : 'public, max-age=31536000, immutable',
      ...(attachment ? { ContentDisposition: `attachment; filename="${POST_SLUG}.txt"` } : {}),
    }), { abortSignal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) })
  }
  const url = `${PUBLIC_ORIGIN}/${key}`
  const response = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS), redirect: 'error' })
  assert.equal(response.status, 200, 'Public asset unavailable')
  assert.ok(response.headers.get('content-type')?.startsWith(contentType.split(';')[0]), 'Public content type mismatch')
  assert.equal(hash(new Uint8Array(await response.arrayBuffer())), sha256, 'Public readback mismatch')
  report({ key, url, sha256, objectWrites: exists ? 0 : 1 })
  return url
}

async function main() {
  const args = process.argv.slice(2)
  assert.ok(args.length === 0 || (args.length === 1 && args[0] === '--apply'), 'Unsupported arguments')
  const images = await Promise.all(PLAN.map(async (shot) => {
    const bytes = await readFile(resolve('public/blog', POST_SLUG, `${shot.key}.webp`))
    const metadata = await sharp(bytes).metadata()
    assert.equal(metadata.format, 'webp', 'Expected reviewed WebP')
    assert.ok(metadata.width && metadata.width >= 1000 && metadata.height && metadata.height >= 600, 'Image too small')
    return { ...shot, bytes, sha256: hash(bytes), width: metadata.width, height: metadata.height }
  }))
  const worksheet = await readFile(resolve('public/downloads', `${POST_SLUG}.txt`))
  assert.ok(worksheet.length > 500 && worksheet.toString('utf8').includes('PPE'), 'Worksheet unavailable')
  report({ mode: args.length ? 'apply' : 'inspect', slug: POST_SLUG, images: images.map(({ key, sha256, width, height }) => ({ key, sha256, width, height })), worksheetSha256: hash(worksheet) })
  if (args.length === 0) return
  assertR2Configured()
  assert.equal((process.env.R2_PUBLIC_URL || PUBLIC_ORIGIN).replace(/\/$/, ''), PUBLIC_ORIGIN, 'Unexpected public origin')
  assert.equal(r2BucketName, PUBLIC_BUCKET, 'Only the reviewed public bucket is allowed')
  assert.notEqual(r2BucketName, process.env.QUOTATION_PRIVATE_R2_BUCKET, 'Private bucket not allowed')
  const generated = await readGenerated()
  for (const image of images) {
    const key = `blog/${POST_SLUG}/${image.key}-${image.sha256.slice(0, 12)}.webp`
    generated[image.key] = await uploadReviewed(key, image.bytes, 'image/webp')
    await saveGenerated(generated)
  }
  await uploadReviewed(`blog/${POST_SLUG}/${POST_SLUG}.txt`, worksheet, 'text/plain; charset=utf-8', true)
  report({ complete: true, output: OUTPUT_JSON, images: Object.keys(generated).length })
}

main().catch(() => {
  process.stderr.write('SAMPLE_APPROVAL_ASSET_UPLOAD_FAILED: inspect local inputs or remote conflict before retrying\n')
  process.exitCode = 1
})
