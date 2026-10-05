import 'server-only'

import { createHash } from 'node:crypto'

import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import sharp from 'sharp'

import { parseCasePrivateImage } from './private-image-path'

const MAX_IMAGE_BYTES = 10 * 1024 * 1024
const TIMEOUT_MS = 30_000
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

function imageIdentity(caseId: string, filename: string) {
  const image = parseCasePrivateImage(`/api/admin/case-images/${caseId}/${filename}`)
  if (!image) throw new Error('Invalid private case image identifier')
  return {
    ...image,
    key: `cases/${image.caseId}/${image.sha256}.${image.extension}`,
    contentType: image.extension === 'png' ? 'image/png' : 'image/jpeg',
  }
}

function privateStorage(): { client: S3Client; bucket: string } {
  const endpoint = process.env.QUOTATION_PRIVATE_R2_ENDPOINT
  const accessKeyId = process.env.QUOTATION_PRIVATE_R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.QUOTATION_PRIVATE_R2_SECRET_ACCESS_KEY
  const bucket = process.env.QUOTATION_PRIVATE_R2_BUCKET
  if (process.env.QUOTATION_PRIVATE_STORAGE_PROVIDER !== 'r2-private'
    || !endpoint || !accessKeyId || !secretAccessKey || !bucket
    || bucket === (process.env.R2_BUCKET_NAME || 'medusa')) {
    throw new Error('Private case image storage is unavailable')
  }
  let url: URL
  try { url = new URL(endpoint) } catch { throw new Error('Private case image storage is unavailable') }
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) {
    throw new Error('Private case image storage is unavailable')
  }
  return {
    bucket,
    client: new S3Client({ region: 'auto', endpoint, credentials: { accessKeyId, secretAccessKey } }),
  }
}

function assertImageIntegrity(bytes: Buffer, contentType: string, sha256: string): void {
  if (!bytes.length || bytes.length > MAX_IMAGE_BYTES) throw new Error('Private case image validation failed')
  const hasPngSignature = bytes.length >= 8 && bytes.subarray(0, 8).equals(PNG_SIGNATURE)
  const hasJpegSignature = bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  if ((contentType === 'image/png' && !hasPngSignature)
    || (contentType === 'image/jpeg' && !hasJpegSignature)
    || !['image/png', 'image/jpeg'].includes(contentType)
    || createHash('sha256').update(bytes).digest('hex') !== sha256) {
    throw new Error('Private case image validation failed')
  }
}

async function withTimeout<T>(operation: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const controller = new AbortController()
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort()
      reject(new Error('Private case image operation timed out'))
    }, TIMEOUT_MS)
  })
  try {
    return await Promise.race([operation(controller.signal), timeout])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

export async function putCasePrivateImage(caseId: string, filename: string, bytes: Buffer, contentType: string): Promise<void> {
  const image = imageIdentity(caseId, filename)
  if (contentType !== image.contentType) throw new Error('Private case image validation failed')
  assertImageIntegrity(bytes, contentType, image.sha256)

  // Metadata alone accepts some truncated files. Decode every pixel before
  // accepting an original; the original bytes are stored without rewriting.
  try {
    const decoder = sharp(bytes, { failOn: 'warning', limitInputPixels: 40_000_000, animated: false }).timeout({ seconds: 30 })
    const metadata = await decoder.metadata()
    if (metadata.format !== (image.extension === 'png' ? 'png' : 'jpeg') || !metadata.width || !metadata.height) {
      throw new Error('Private case image validation failed')
    }
    await decoder.raw().toBuffer()
  } catch {
    throw new Error('Private case image validation failed')
  }
  const { client, bucket } = privateStorage()
  try {
    await withTimeout((signal) => client.send(new PutObjectCommand({
      Bucket: bucket, Key: image.key, Body: bytes, ContentType: contentType,
      Metadata: { sha256: image.sha256 },
    }), { abortSignal: signal }))
  } catch {
    throw new Error('Private case image storage is unavailable')
  } finally {
    client.destroy()
  }
}

export async function getCasePrivateImage(caseId: string, filename: string): Promise<{ bytes: Buffer; contentType: string }> {
  const image = imageIdentity(caseId, filename)
  const { client, bucket } = privateStorage()
  try {
    return await withTimeout(async (signal) => {
      const response = await client.send(new GetObjectCommand({ Bucket: bucket, Key: image.key }), { abortSignal: signal })
      if (!response.Body || response.ContentType !== image.contentType
        || (response.ContentLength !== undefined && (response.ContentLength < 1 || response.ContentLength > MAX_IMAGE_BYTES))) {
        throw new Error('Private case image validation failed')
      }
      const bytes = Buffer.from(await response.Body.transformToByteArray())
      assertImageIntegrity(bytes, image.contentType, image.sha256)
      if (response.ContentLength !== undefined && response.ContentLength !== bytes.length) {
        throw new Error('Private case image validation failed')
      }
      return { bytes, contentType: image.contentType }
    })
  } catch {
    throw new Error('Private case image storage or integrity validation is unavailable')
  } finally {
    client.destroy()
  }
}
