import { randomUUID } from 'node:crypto'
import sharp from 'sharp'
import { catalogImageKey } from '../catalog-product'
import { CatalogImportError, catalogImportStepError } from '../catalog-import-error'
import { QuotationError } from '../errors'
import { validateQuotationImage } from '../file-validation'
import { quotationQuarantineKey } from '../object-keys'
import type { QuotationPrivateStorage } from '../private-storage'

const MAX_BYTES = 5 * 1024 * 1024
const CONCURRENCY = 3
const BATCH_TIMEOUT_MS = 45_000
const DOWNLOAD_TIMEOUT_MS = 20_000
const UPLOAD_TIMEOUT_MS = 15_000
const CONVERSION_TIMEOUT_MS = 10_000
const CLEANUP_TIMEOUT_MS = 5_000

type ImportedCatalogImage = {
  id: string; objectKey: string; displayName: string; contentType: string; sizeBytes: number; sha256: string
}

async function withDeadline<T>(parent: AbortSignal, milliseconds: number, work: (signal: AbortSignal) => Promise<T>): Promise<T> {
  parent.throwIfAborted()
  const controller = new AbortController()
  const abort = () => controller.abort(parent.reason)
  parent.addEventListener('abort', abort, { once: true })
  const timer = setTimeout(() => controller.abort(new DOMException('Image operation timed out', 'TimeoutError')), milliseconds)
  try {
    const result = await work(controller.signal)
    controller.signal.throwIfAborted()
    return result
  } finally {
    clearTimeout(timer)
    parent.removeEventListener('abort', abort)
  }
}

async function downloadImage(url: string, signal: AbortSignal): Promise<Buffer> {
  // Validate before fetch: no arbitrary database URL, redirects or public-bucket credentials.
  try { catalogImageKey(url, process.env.R2_PUBLIC_URL || 'https://shop.laifappe.com') }
  catch (error) {
    if (error instanceof QuotationError) throw error
    throw new QuotationError('VALIDATION_FAILED', '商品图片路径无效，请检查商城商品图片或手动上传。')
  }
  const response = await fetch(url, { signal, redirect: 'error', credentials: 'omit', cache: 'no-store' })
  if (!response.ok) {
    await response.body?.cancel().catch(() => undefined)
    const code = response.status === 404 ? 'NOT_FOUND' : response.status === 403 ? 'FORBIDDEN' : 'INTERNAL_ERROR'
    throw new QuotationError(code, `商城图片下载失败（HTTP ${response.status}），请检查图片是否可访问，或取消复制图片后导入文字资料。`)
  }
  const declaredLength = Number(response.headers.get('content-length') ?? 0)
  if (declaredLength > MAX_BYTES) {
    await response.body?.cancel().catch(() => undefined)
    throw new QuotationError('FILE_TOO_LARGE', '商品图片超过 5 MiB，请压缩后手动上传。')
  }
  if (!response.body) throw new QuotationError('VALIDATION_FAILED', '商品图片内容为空，请检查商城商品图片。')
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let length = 0
  try {
    for (;;) {
      signal.throwIfAborted()
      const chunk = await reader.read()
      if (chunk.done) break
      length += chunk.value.length
      if (length > MAX_BYTES) throw new QuotationError('FILE_TOO_LARGE', '商品图片超过 5 MiB，请压缩后手动上传。')
      chunks.push(chunk.value)
    }
  } catch (error) {
    await reader.cancel().catch(() => undefined)
    throw error
  } finally { reader.releaseLock() }
  if (!length) throw new QuotationError('VALIDATION_FAILED', '商品图片内容为空，请检查商城商品图片。')
  return Buffer.concat(chunks, length)
}

async function normalizeImage(bytes: Buffer, index: number, batchSignal: AbortSignal, batchDeadline: number) {
  const deadline = Math.min(batchDeadline, Date.now() + CONVERSION_TIMEOUT_MS)
  const timeout = () => {
    batchSignal.throwIfAborted()
    const remaining = deadline - Date.now()
    if (remaining < 1) throw new DOMException('Image conversion timed out', 'TimeoutError')
    return { seconds: Math.max(1, Math.ceil(remaining / 1000)) }
  }
  const decoder = () => sharp(bytes, { limitInputPixels: 40_000_000, failOn: 'warning' }).timeout(timeout())
  const metadata = await decoder().metadata()
  if (!metadata.width || !metadata.height || metadata.width * metadata.height > 40_000_000
    || !['png', 'jpeg', 'webp'].includes(metadata.format ?? '') || (metadata.pages ?? 1) > 1) {
    throw new QuotationError('VALIDATION_FAILED', '仅支持 4000 万像素以内的静态 PNG、JPEG 或 WebP 商品图片。')
  }
  const decoded = await decoder().rotate().resize({
    width: 1800, height: 1800, fit: 'inside', withoutEnlargement: true,
  }).toColourspace('srgb').ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  let transparent = false
  for (let offset = 3; offset < decoded.data.length; offset += 4) {
    if (decoded.data[offset] !== 255) { transparent = true; break }
  }
  const encoder = sharp(decoded.data, {
    raw: { width: decoded.info.width, height: decoded.info.height, channels: 4 },
  }).timeout(timeout())
  const normalized = transparent
    ? await encoder.png({ compressionLevel: 6 }).toBuffer()
    : await encoder.jpeg({ quality: 92, chromaSubsampling: '4:4:4' }).toBuffer()
  if (normalized.length > MAX_BYTES) throw new QuotationError('FILE_TOO_LARGE', '转换后的商品图片超过 5 MiB，请压缩后手动上传。')
  batchSignal.throwIfAborted()
  const extension = transparent ? 'png' : 'jpg'
  return validateQuotationImage({ bytes: normalized, filename: `catalog-${index + 1}.${extension}`, contentType: transparent ? 'image/png' : 'image/jpeg' })
}

export async function copyCatalogImages(images: Array<{ url: string }>, storage: QuotationPrivateStorage, storedKeys: string[]) {
  if (images.length > 8) throw new CatalogImportError('preparation', 'VALIDATION_FAILED', '每次最多导入 8 张商品主图。')
  const importedImages: ImportedCatalogImage[] = new Array(images.length)
  const batch = new AbortController()
  const deadline = Date.now() + BATCH_TIMEOUT_MS
  const timer = setTimeout(() => batch.abort(new DOMException('Image batch timed out', 'TimeoutError')), BATCH_TIMEOUT_MS)
  let next = 0
  let failure: unknown
  async function worker() {
    while (!failure && next < images.length) {
      const index = next++
      let stage: 'download' | 'conversion' | 'storage' = 'download'
      try {
        const bytes = await withDeadline(batch.signal, DOWNLOAD_TIMEOUT_MS, (signal) => downloadImage(images[index].url, signal))
        stage = 'conversion'
        const file = await normalizeImage(bytes, index, batch.signal, deadline)
        batch.signal.throwIfAborted()
        const objectKey = quotationQuarantineKey(file.filename)
        // Capture partial writes too, before the PUT is dispatched.
        storedKeys.push(objectKey)
        stage = 'storage'
        await withDeadline(batch.signal, UPLOAD_TIMEOUT_MS, (signal) => storage.put(objectKey, file.bytes, file.contentType, { signal }))
        importedImages[index] = { id: randomUUID(), objectKey, displayName: file.filename, contentType: file.contentType, sizeBytes: file.sizeBytes, sha256: file.sha256 }
      } catch (error) {
        if (!failure) {
          failure = catalogImportStepError(error, stage, index + 1)
          batch.abort()
        }
      }
    }
  }
  try {
    // Join every worker even on failure; cleanup must never race an in-flight PUT.
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, images.length) }, () => worker()))
    if (failure) throw failure
    return importedImages
  } finally { clearTimeout(timer) }
}

export async function cleanupCatalogImages(storage: QuotationPrivateStorage, storedKeys: readonly string[]): Promise<void> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(new DOMException('Image cleanup timed out', 'TimeoutError')), CLEANUP_TIMEOUT_MS)
  try {
    await Promise.allSettled(storedKeys.map((key) => storage.delete(key, { signal: controller.signal })))
  } finally { clearTimeout(timer) }
}
