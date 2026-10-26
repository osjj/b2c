import 'server-only'

import { createHash } from 'node:crypto'

import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import sharp from 'sharp'

import { assertR2Configured, r2BucketName, r2Client } from '../r2'
import { getCasePrivateImage } from './private-media'
import { parseCasePrivateImage } from './private-image-path'

const MAX_IMAGE_BYTES = 10 * 1024 * 1024
const PREPARATION_TIMEOUT_MS = 45_000
const SAFE_FAILURE = 'This image could not be prepared for publication. No publication changes were saved. Retry after checking image storage.'

type PrivateImage = NonNullable<ReturnType<typeof parseCasePrivateImage>>

function errorName(error: unknown): string {
  return error && typeof error === 'object' && 'name' in error && typeof error.name === 'string' ? error.name : ''
}

function publicOrigin(): string {
  assertR2Configured()
  const privateBucket = process.env.QUOTATION_PRIVATE_R2_BUCKET
  if (!privateBucket || !r2BucketName || privateBucket === r2BucketName) throw new Error(SAFE_FAILURE)
  const configured = process.env.R2_PUBLIC_URL || 'https://shop.laifappe.com'
  const url = new URL(configured)
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash
    || ![url.origin, `${url.origin}/`].includes(configured)) throw new Error(SAFE_FAILURE)
  return url.origin
}

function expectedMime(image: PrivateImage): string {
  return image.extension === 'png' ? 'image/png' : 'image/jpeg'
}

function verifyBytes(bytes: Buffer, contentType: string, image: PrivateImage): void {
  if (!bytes.length || bytes.length > MAX_IMAGE_BYTES || contentType !== expectedMime(image)
    || createHash('sha256').update(bytes).digest('hex') !== image.sha256) throw new Error(SAFE_FAILURE)
}

function verifyLength(length: number | undefined, bytes?: Buffer): void {
  if (length !== undefined && (!Number.isInteger(length) || length < 1 || length > MAX_IMAGE_BYTES
    || (bytes && bytes.length !== length))) throw new Error(SAFE_FAILURE)
}

async function withDeadline<T>(operation: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const controller = new AbortController()
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort()
      reject(new Error(SAFE_FAILURE))
    }, PREPARATION_TIMEOUT_MS)
  })
  try {
    return await Promise.race([operation(controller.signal), timeout])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

/** Bound decoded transport bytes even when Content-Length is absent or false. */
async function readBoundedStream(stream: ReadableStream<Uint8Array>, signal: AbortSignal): Promise<Buffer> {
  if (signal.aborted) await stream.cancel()
  signal.throwIfAborted()
  const reader = stream.getReader()
  const cancel = () => { void reader.cancel().catch(() => undefined) }
  signal.addEventListener('abort', cancel, { once: true })
  const chunks: Buffer[] = []
  let size = 0
  let complete = false
  try {
    while (true) {
      const result = await reader.read()
      signal.throwIfAborted()
      if (result.done) {
        complete = true
        return Buffer.concat(chunks, size)
      }
      size += result.value.byteLength
      if (size > MAX_IMAGE_BYTES) throw new Error(SAFE_FAILURE)
      chunks.push(Buffer.from(result.value))
    }
  } finally {
    signal.removeEventListener('abort', cancel)
    if (!complete) cancel()
    reader.releaseLock()
  }
}

async function readPublicObject(key: string, image: PrivateImage, signal: AbortSignal): Promise<Buffer | null> {
  signal.throwIfAborted()
  let object
  try {
    object = await r2Client.send(new GetObjectCommand({ Bucket: r2BucketName, Key: key }), { abortSignal: signal })
  } catch (error) {
    signal.throwIfAborted()
    if (['NoSuchKey', 'NotFound'].includes(errorName(error))) return null
    throw error
  }
  if (!object.Body) throw new Error(SAFE_FAILURE)
  const stream = object.Body.transformToWebStream()
  try {
    verifyLength(object.ContentLength)
  } catch {
    await stream.cancel()
    throw new Error(SAFE_FAILURE)
  }
  const bytes = await readBoundedStream(stream, signal)
  verifyLength(object.ContentLength, bytes)
  verifyBytes(bytes, object.ContentType ?? '', image)
  return bytes
}

async function verifyPublicUrl(url: string, image: PrivateImage, original: Buffer, signal: AbortSignal): Promise<void> {
  signal.throwIfAborted()
  const response = await fetch(url, { redirect: 'error', cache: 'no-store', credentials: 'omit', signal })
  if (response.status !== 200 || !response.body) {
    await response.body?.cancel()
    throw new Error(SAFE_FAILURE)
  }
  const header = response.headers.get('content-length')
  const length = header === null ? undefined : Number(header)
  try {
    verifyLength(length)
  } catch {
    await response.body.cancel()
    throw new Error(SAFE_FAILURE)
  }
  const bytes = await readBoundedStream(response.body, signal)
  verifyLength(length, bytes)
  verifyBytes(bytes, (response.headers.get('content-type') ?? '').split(';')[0].trim(), image)
  if (!bytes.equals(original)) throw new Error(SAFE_FAILURE)
}

/** Caller must first authorize publication and verify current saved membership. */
export async function publishCasePrivateImage(caseId: string, sourceUrl: string): Promise<string> {
  try {
    return await withDeadline(async (signal) => {
      const image = parseCasePrivateImage(sourceUrl)
      if (!image || image.caseId !== caseId) throw new Error(SAFE_FAILURE)
      const origin = publicOrigin()
      const filename = `${image.sha256}.${image.extension}`
      const original = await getCasePrivateImage(caseId, filename)
      signal.throwIfAborted()
      verifyBytes(original.bytes, original.contentType, image)
      const decoder = sharp(original.bytes, { failOn: 'warning', limitInputPixels: 40_000_000, animated: false }).timeout({ seconds: 30 })
      const metadata = await decoder.metadata()
      if (metadata.format !== (image.extension === 'png' ? 'png' : 'jpeg') || !metadata.width || !metadata.height) throw new Error(SAFE_FAILURE)
      await decoder.raw().toBuffer()
      signal.throwIfAborted()

      const key = `cases/${caseId}/${filename}`
      const url = `${origin}/${key}`
      const existing = await readPublicObject(key, image, signal)
      if (existing && !existing.equals(original.bytes)) throw new Error(SAFE_FAILURE)
      if (!existing) {
        signal.throwIfAborted()
        try {
          await r2Client.send(new PutObjectCommand({
            Bucket: r2BucketName, Key: key, Body: original.bytes, ContentType: expectedMime(image),
            IfNoneMatch: '*', Metadata: { sha256: image.sha256 },
          }), { abortSignal: signal })
        } catch (error) {
          signal.throwIfAborted()
          if (errorName(error) !== 'PreconditionFailed') throw error
          // A concurrent publisher may have copied it. Verify, never overwrite.
        }
        const copied = await readPublicObject(key, image, signal)
        if (!copied || !copied.equals(original.bytes)) throw new Error(SAFE_FAILURE)
      }
      await verifyPublicUrl(url, image, original.bytes, signal)
      signal.throwIfAborted()
      return url
    })
  } catch {
    // SDK, image decoder and configuration errors can contain private details.
    throw new Error(SAFE_FAILURE)
  }
}
