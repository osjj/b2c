import { randomUUID } from 'node:crypto'
import { GetObjectCommand } from '@aws-sdk/client-s3'
import sharp from 'sharp'
import { assertR2Configured, r2Client, r2BucketName } from '@/lib/r2'
import { catalogImageKey } from '../catalog-product'
import { QuotationError } from '../errors'
import { validateQuotationImage } from '../file-validation'
import { quotationQuarantineKey } from '../object-keys'
import type { QuotationPrivateStorage } from '../private-storage'

export async function copyCatalogImages(images: Array<{ url: string }>, storage: QuotationPrivateStorage, storedKeys: string[]) {
  const importedImages: Array<{ id: string; objectKey: string; displayName: string; contentType: string; sizeBytes: number; sha256: string }> = []
  for (const [index, image] of images.entries()) {
    assertR2Configured()
    const key = catalogImageKey(image.url, process.env.R2_PUBLIC_URL || 'https://shop.laifappe.com')
    const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 20000)
    let bytes: Buffer
    try {
      const response = await r2Client.send(new GetObjectCommand({ Bucket: r2BucketName, Key: key }), { abortSignal: controller.signal })
      if (!response.Body || (response.ContentLength ?? 0) > 5 * 1024 * 1024) throw new QuotationError('FILE_TOO_LARGE', '商品图片超过 5 MB，请压缩后手动上传')
      const chunks: Uint8Array[] = []; let length = 0
      for await (const chunk of response.Body as AsyncIterable<Uint8Array>) { length += chunk.length; if (length > 5 * 1024 * 1024) { controller.abort(); throw new QuotationError('FILE_TOO_LARGE', '商品图片超过 5 MB') } chunks.push(chunk) }
      bytes = Buffer.concat(chunks)
    } finally { clearTimeout(timer) }
    const normalized = await sharp(bytes, { limitInputPixels: 40000000, failOn: 'warning' }).rotate().resize({ width: 1800, height: 1800, fit: 'inside', withoutEnlargement: true }).png().toBuffer()
    if (normalized.length > 5 * 1024 * 1024) throw new QuotationError('FILE_TOO_LARGE', '转换后的商品图片过大，请手动上传')
    const file = await validateQuotationImage({ bytes: normalized, filename: `catalog-${index + 1}.png`, contentType: 'image/png' })
    const objectKey = quotationQuarantineKey(file.filename)
    storedKeys.push(objectKey)
    await storage.put(objectKey, file.bytes, file.contentType)
    importedImages.push({ id: randomUUID(), objectKey, displayName: file.filename, contentType: file.contentType, sizeBytes: file.sizeBytes, sha256: file.sha256 })
  }
  return importedImages
}
