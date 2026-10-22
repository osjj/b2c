import { createHash } from 'node:crypto'

import sharp from 'sharp'

import { QuotationError } from '../errors'
import { sanitizeQuotationFilename } from '../object-keys'

export const MAX_OPTIMIZATION_INPUT_BYTES = 12 * 1024 * 1024
export const MAX_OPTIMIZATION_OUTPUT_BYTES = 5 * 1024 * 1024
export const SMALL_OPTIMIZATION_IMAGE_BYTES = 512 * 1024
export const IMAGE_OPTIMIZATION_PROFILE = 'v1-2560-jpeg92-444'

export type OptimizedImage = {
  bytes: Buffer
  contentType: 'image/png' | 'image/jpeg'
  displayName: string
  sizeBytes: number
  sha256: string
}

export async function encodeCommonProductImage(input: {
  bytes: Buffer
  contentType: string
  displayName: string
}): Promise<OptimizedImage | null> {
  if (input.contentType !== 'image/png' && input.contentType !== 'image/jpeg') {
    throw new QuotationError('VALIDATION_FAILED', '仅支持 PNG 或 JPEG 产品图片')
  }
  if (!input.bytes.length || input.bytes.length > MAX_OPTIMIZATION_INPUT_BYTES) {
    throw new QuotationError('FILE_TOO_LARGE', '原始图片必须大于 0 字节且不超过 12 MB')
  }
  const png = input.bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  const jpeg = input.bytes[0] === 0xff && input.bytes[1] === 0xd8 && input.bytes[2] === 0xff
  if ((input.contentType === 'image/png' && !png) || (input.contentType === 'image/jpeg' && !jpeg)) {
    throw new QuotationError('VALIDATION_FAILED', '图片内容与保存的格式不一致，请重新上传')
  }

  const deadline = Date.now() + 30_000
  const timeout = () => {
    const seconds = Math.floor((deadline - Date.now()) / 1000)
    if (seconds < 1) throw new QuotationError('VALIDATION_FAILED', '图片处理超时，请选择较小图片')
    return { seconds }
  }
  try {
    const decoder = () => sharp(input.bytes, { limitInputPixels: 40_000_000, failOn: 'warning' }).timeout(timeout())
    const metadata = await decoder().metadata()
    if (
      !metadata.width || !metadata.height || metadata.width * metadata.height > 40_000_000
      || metadata.format !== (input.contentType === 'image/png' ? 'png' : 'jpeg')
      || (metadata.pages ?? 1) > 1
    ) {
      throw new QuotationError('VALIDATION_FAILED', '图片尺寸或格式无效，仅支持 4000 万像素以内的静态图片')
    }
    // Decode and orient once. Further attempts resize these pixels without repeated JPEG decoding.
    const decoded = await decoder().rotate().resize({
      width: 2560, height: 2560, fit: 'inside', withoutEnlargement: true, kernel: 'lanczos3',
    }).toColourspace('srgb').ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    let transparent = false
    if (input.contentType === 'image/png') {
      for (let index = 3; index < decoded.data.length; index += 4) {
        if (decoded.data[index] !== 255) { transparent = true; break }
      }
    }
    let previousLimit = 0
    for (const limit of [2560, 2048, 1600, 1280]) {
      const edge = Math.min(limit, Math.max(decoded.info.width, decoded.info.height))
      if (edge === previousLimit) continue
      previousLimit = edge
      const resized = () => sharp(decoded.data, {
        raw: { width: decoded.info.width, height: decoded.info.height, channels: 4 },
      }).timeout(timeout()).resize({ width: limit, height: limit, fit: 'inside', withoutEnlargement: true, kernel: 'lanczos3' })
      let contentType: 'image/png' | 'image/jpeg' = input.contentType
      let bytes = contentType === 'image/png'
        ? await resized().png({ compressionLevel: 9, adaptiveFiltering: true }).toBuffer()
        : await resized().jpeg({ quality: 92, chromaSubsampling: '4:4:4' }).toBuffer()
      if (contentType === 'image/png' && !transparent) {
        const candidate = await resized().jpeg({ quality: 92, chromaSubsampling: '4:4:4' }).toBuffer()
        if (candidate.length <= bytes.length * 0.8) { bytes = candidate; contentType = 'image/jpeg' }
      }
      if (input.bytes.length <= MAX_OPTIMIZATION_OUTPUT_BYTES && bytes.length > input.bytes.length * 0.9) return null
      if (bytes.length > MAX_OPTIMIZATION_OUTPUT_BYTES) continue
      if (bytes.length > input.bytes.length * 0.9) return null
      const extension = contentType === 'image/png' ? 'png' : 'jpg'
      const basename = sanitizeQuotationFilename(input.displayName).replace(/\.[^.]*$/, '').slice(0, 175) || 'image'
      return {
        bytes, contentType, displayName: `${basename}.${extension}`, sizeBytes: bytes.length,
        sha256: createHash('sha256').update(bytes).digest('hex'),
      }
    }
    throw new QuotationError('FILE_TOO_LARGE', '图片压缩后仍超过 5 MB，原图已保留，请裁剪后重新上传')
  } catch (error) {
    if (error instanceof QuotationError) throw error
    throw new QuotationError('VALIDATION_FAILED', '图片无法安全解码或压缩，原图已保留，请重新上传有效图片')
  }
}
