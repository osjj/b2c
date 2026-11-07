import { createHash } from 'node:crypto'
import sharp from 'sharp'

import { QuotationError } from './errors'
import type { QuotationPrivateStorage } from './private-storage'

const MAX_INPUT_BYTES = 12 * 1024 * 1024
const MAX_INPUT_PIXELS = 40_000_000
const THUMBNAIL_PROFILE = `webp-480-inside-q75-v1-${sharp.versions.sharp}-${sharp.versions.webp}-${sharp.versions.vips}`

type ThumbnailFile = {
  objectKey: string
  contentType: string
  sizeBytes: number
  sha256: string
  storageProvider?: string
}

type CacheOptions = {
  maxBytes?: number
  maxEntries?: number
  ttlMs?: number
  now?: () => number
  maxConcurrent?: number
  maxPending?: number
}

/** Stores derived bytes only; authorization and live file checks belong before every call. */
export function createThumbnailCache({
  maxBytes = 16 * 1024 * 1024,
  maxEntries = 128,
  ttlMs = 10 * 60 * 1000,
  now = Date.now,
  maxConcurrent = 2,
  maxPending = 32,
}: CacheOptions = {}) {
  const entries = new Map<string, { bytes: Buffer; expiresAt: number }>()
  const inFlight = new Map<string, Promise<Buffer>>()
  const queue: Array<() => void> = []
  let totalBytes = 0
  let active = 0

  function remove(key: string) {
    const entry = entries.get(key)
    if (!entry) return
    totalBytes -= entry.bytes.length
    entries.delete(key)
  }

  async function run(load: () => Promise<Buffer>) {
    if (active >= maxConcurrent) await new Promise<void>((resolve) => queue.push(resolve))
    else active++
    try {
      return await load()
    } finally {
      const next = queue.shift()
      if (next) next()
      else active--
    }
  }

  return {
    get(key: string, load: () => Promise<Buffer>): Promise<Buffer> {
      for (const [entryKey, entry] of entries) {
        if (entry.expiresAt <= now()) remove(entryKey)
      }
      const hit = entries.get(key)
      if (hit) {
        entries.delete(key)
        entries.set(key, hit)
        return Promise.resolve(hit.bytes)
      }
      const pending = inFlight.get(key)
      if (pending) return pending
      // The queue contains closures, never downloaded image bytes. Bound it as well as encoders.
      if (inFlight.size >= maxConcurrent + maxPending) {
        return Promise.reject(new QuotationError('INTERNAL_ERROR', '缩略图请求较多，请稍后重试'))
      }
      const work = run(load).then((bytes) => {
        if (bytes.length <= maxBytes) {
          while (entries.size >= maxEntries || totalBytes + bytes.length > maxBytes) {
            const oldest = entries.keys().next().value
            if (oldest === undefined) break
            remove(oldest)
          }
          entries.set(key, { bytes, expiresAt: now() + ttlMs })
          totalBytes += bytes.length
        }
        return bytes
      }).finally(() => { inFlight.delete(key) })
      inFlight.set(key, work)
      return work
    },
  }
}

const thumbnailCache = createThumbnailCache()

/** Call after feature, ADMIN, and current clean/nondeleted metadata checks, including for 304. */
export function quotationThumbnailEtag(file: ThumbnailFile, storage: QuotationPrivateStorage): string {
  if (file.storageProvider !== undefined && file.storageProvider !== storage.provider) {
    throw new QuotationError('FEATURE_DISABLED', '图片存储配置不匹配')
  }
  if (!Number.isSafeInteger(file.sizeBytes) || file.sizeBytes < 1 || file.sizeBytes > MAX_INPUT_BYTES) {
    throw new QuotationError('FILE_TOO_LARGE', '图片超过缩略图处理限制')
  }
  if (!['image/png', 'image/jpeg'].includes(file.contentType) || !/^[a-f0-9]{64}$/i.test(file.sha256)) {
    throw new QuotationError('VALIDATION_FAILED', '图片元数据无效')
  }
  const identity = JSON.stringify([THUMBNAIL_PROFILE, storage.provider, file.objectKey, file.contentType, file.sizeBytes, file.sha256])
  return `"${createHash('sha256').update(identity).digest('hex')}"`
}

export function thumbnailEtagMatches(ifNoneMatch: string | null, etag: string): boolean {
  return ifNoneMatch?.split(',').some((value) => {
    const candidate = value.trim().replace(/^W\//, '')
    return candidate === '*' || candidate === etag
  }) ?? false
}

export async function readQuotationThumbnail(file: ThumbnailFile, storage: QuotationPrivateStorage): Promise<Buffer> {
  const etag = quotationThumbnailEtag(file, storage)
  return thumbnailCache.get(etag, async () => {
    const stored = await storage.get(file.objectKey, file.contentType, { maxBytes: MAX_INPUT_BYTES })
    if (stored.bytes.length > MAX_INPUT_BYTES) throw new QuotationError('FILE_TOO_LARGE', '图片超过缩略图处理限制')
    if (stored.sha256 !== file.sha256 || stored.sizeBytes !== file.sizeBytes || stored.bytes.length !== file.sizeBytes) {
      throw new QuotationError('DOCUMENT_VALIDATION_FAILED', '图片完整性校验失败')
    }
    try {
      const image = sharp(stored.bytes, { failOn: 'warning', limitInputPixels: MAX_INPUT_PIXELS })
      const metadata = await image.metadata()
      const expectedFormat = file.contentType === 'image/png' ? 'png' : 'jpeg'
      if (metadata.format !== expectedFormat || !metadata.width || !metadata.height
        || metadata.width * metadata.height > MAX_INPUT_PIXELS || (metadata.pages ?? 1) > 1) {
        throw new Error('Invalid thumbnail image')
      }
      return await image.rotate().resize(480, 480, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 75, effort: 4 }).timeout({ seconds: 10 }).toBuffer()
    } catch {
      throw new QuotationError('VALIDATION_FAILED', '图片损坏或超过安全处理限制')
    }
  })
}
