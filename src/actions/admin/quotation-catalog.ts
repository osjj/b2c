'use server'

import { randomUUID } from 'node:crypto'
import { GetObjectCommand } from '@aws-sdk/client-s3'
import sharp from 'sharp'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { assertR2Configured, r2Client, r2BucketName } from '@/lib/r2'
import { assertQuotationWorkbenchEnabled } from '@/lib/quotation/feature'
import { QuotationError, toQuotationActionError } from '@/lib/quotation/errors'
import { catalogImageKey, catalogSpecifications, catalogOptionsSchema } from '@/lib/quotation/catalog-product'
import { commonProductSchema } from '@/lib/quotation/simple-input'
import { allocateQuotationProductNumber } from '@/lib/quotation/numbering'
import { getQuotationPrivateStorage } from '@/lib/quotation/private-storage'
import { quotationQuarantineKey } from '@/lib/quotation/object-keys'
import { validateQuotationImage } from '@/lib/quotation/file-validation'
import { writeQuotationAudit } from '@/lib/quotation/services/audit'

export async function searchQuotationCatalog(input: unknown) {
  try {
  assertQuotationWorkbenchEnabled(); await requireAdmin()
  const { search } = z.object({ search: z.string().trim().max(200) }).parse(input)
  const rows = await prisma.product.findMany({ where: { isActive: true, ...(search ? { OR: [{ name: { contains: search, mode: 'insensitive' } }, { sku: { contains: search, mode: 'insensitive' } }] } : {}) }, orderBy: { updatedAt: 'desc' }, take: 20, select: { id: true, name: true, price: true, cost: true, updatedAt: true, images: { select: { id: true }, take: 8 } } })
  return { success: true as const, reason: '商城商品已加载', data: catalogOptionsSchema.parse(rows.map((row) => ({ id: row.id, name: row.name, unitPrice: row.price.toString(), unitCost: row.cost?.toString() ?? null, updatedAt: row.updatedAt.toISOString(), imageIds: row.images.map((image) => image.id) }))) }
  } catch (error) { return toQuotationActionError(error) }
}

export async function importQuotationCatalogProduct(input: unknown) {
  try {
    assertQuotationWorkbenchEnabled(); const actor = await requireAdmin()
    const data = z.object({ productId: z.string().cuid(), updatedAt: z.string().datetime(), includeImages: z.boolean() }).parse(input)
    const product = await prisma.product.findUnique({ where: { id: data.productId }, include: { images: { orderBy: { sortOrder: 'asc' }, take: 8 } } })
    if (!product || !product.isActive) throw new QuotationError('NOT_FOUND', '商城商品不存在或未上架')
    if (product.updatedAt.toISOString() !== data.updatedAt) throw new QuotationError('VERSION_CONFLICT', '商城商品已更新，请重新搜索确认')
    const alreadyImported = await prisma.quotationProduct.findFirst({ where: { productId: product.id }, select: { id: true } })
    if (alreadyImported) return { success: true as const, reason: '已导入过此商品，打开现有常用产品；未覆盖手动修改', data: { id: alreadyImported.id, reused: true } }
    const fields = commonProductSchema.parse({ name: product.name, description: product.description || '', specifications: catalogSpecifications(product.specifications), packaging: '', unit: 'pcs', unitPrice: product.price.toString(), unitCost: product.cost?.toString() ?? null, currency: 'USD', active: true })
    const importedImages: Array<{ id: string; objectKey: string; displayName: string; contentType: string; sizeBytes: number; sha256: string }> = []
    const storage = data.includeImages && product.images.length ? getQuotationPrivateStorage() : undefined
    const storedKeys: string[] = []
    let committed = false
    try {
      if (storage) for (const [index, image] of product.images.entries()) {
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
      const result = await prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`quotation.catalog.${product.id}`}))`
        const existing = await tx.quotationProduct.findFirst({ where: { productId: product.id }, select: { id: true } })
        if (existing) return { id: existing.id, reused: true }
        const current = await tx.product.findUnique({ where: { id: product.id }, select: { updatedAt: true, isActive: true } })
        if (!current?.isActive || current.updatedAt.toISOString() !== data.updatedAt) throw new QuotationError('VERSION_CONFLICT', '导入期间商城商品已变更，请重新搜索确认')
        const created = await tx.quotationProduct.create({ data: { internalNumber: await allocateQuotationProductNumber(tx), productId: product.id, nameEn: fields.name, unit: fields.unit, status: 'ACTIVE', specifications: (fields.specifications || '').split('\n').filter(Boolean) } })
        const key = `quotation.product-defaults.${created.id}`
        const value = { unitPrice: fields.unitPrice, unitCost: fields.unitCost ?? null, currency: 'USD', description: fields.description, packaging: '' }
        await tx.setting.create({ data: { key, value } })
        if (importedImages.length) {
          if (!storage) throw new QuotationError('FEATURE_DISABLED', '报价私有存储未配置')
          await tx.quotationSourceFile.createMany({ data: importedImages.map((image) => ({ ...image, originalFilename: image.displayName, storageProvider: storage.provider, securityStatus: 'CLEAN', uploadedBy: actor.id })) })
          await tx.quotationProductImage.createMany({ data: importedImages.map(({ id: sourceFileId, ...metadata }, sortOrder) => ({ ...metadata, sourceFileId, quotationProductId: created.id, sortOrder })) })
        }
        await writeQuotationAudit(tx, { entityType: 'QuotationProduct', entityId: created.id, action: 'CREATE', actorId: actor.id, metadata: { source: 'CATALOG', productId: product.id } })
        return { id: created.id, reused: false }
      })
      committed = !result.reused
      revalidatePath('/admin/quotation-products')
      return { success: true as const, reason: result.reused ? '已导入过此商品，打开现有常用产品；未覆盖手动修改' : '已复制到常用产品，请检查规格、包装和单位', data: result }
    } finally {
      if (!committed && storage) await Promise.allSettled(storedKeys.map((key) => storage.delete(key)))
    }
  } catch (error) { return toQuotationActionError(error) }
}
