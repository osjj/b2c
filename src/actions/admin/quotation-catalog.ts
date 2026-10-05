'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { assertQuotationWorkbenchEnabled } from '@/lib/quotation/feature'
import { QuotationError, toQuotationActionError } from '@/lib/quotation/errors'
import { catalogSpecifications, catalogOptionsSchema } from '@/lib/quotation/catalog-product'
import { commonProductSchema } from '@/lib/quotation/simple-input'
import { allocateQuotationProductNumber } from '@/lib/quotation/numbering'
import { getQuotationPrivateStorage } from '@/lib/quotation/private-storage'
import { writeQuotationAudit } from '@/lib/quotation/services/audit'
import { copyCatalogImages } from '@/lib/quotation/services/catalog-images'

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
    const product = await prisma.product.findUnique({ where: { id: data.productId }, include: { images: { orderBy: { sortOrder: 'asc' }, take: 8 }, source: { select: { value: true, costPriceText: true } } } })
    if (!product || !product.isActive) throw new QuotationError('NOT_FOUND', '商城商品不存在或未上架')
    if (product.updatedAt.toISOString() !== data.updatedAt) throw new QuotationError('VERSION_CONFLICT', '商城商品已更新，请重新搜索确认')
    const alreadyImported = await prisma.quotationProduct.findFirst({ where: { productId: product.id }, select: { id: true } })
    if (alreadyImported) return { success: true as const, reason: '已导入过此商品，打开现有常用产品；未覆盖手动修改', data: { id: alreadyImported.id, reused: true } }
    const fields = commonProductSchema.parse({ name: product.name, productSource: product.source?.value ?? null, costPriceText: product.source?.costPriceText ?? null, description: product.description || '', specifications: catalogSpecifications(product.specifications), packaging: '', unit: 'pcs', unitPrice: product.price.toString(), unitCost: product.cost?.toString() ?? null, currency: 'USD', active: true })
    const storage = data.includeImages && product.images.length ? getQuotationPrivateStorage() : undefined
    const storedKeys: string[] = []
    let committed = false
    try {
      const importedImages = storage ? await copyCatalogImages(product.images, storage, storedKeys) : []
      const result = await prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`quotation.catalog.${product.id}`})::bigint)`
        const existing = await tx.quotationProduct.findFirst({ where: { productId: product.id }, select: { id: true } })
        if (existing) return { id: existing.id, reused: true }
        const current = await tx.product.findUnique({ where: { id: product.id }, select: { updatedAt: true, isActive: true } })
        if (!current?.isActive || current.updatedAt.toISOString() !== data.updatedAt) throw new QuotationError('VERSION_CONFLICT', '导入期间商城商品已变更，请重新搜索确认')
        const created = await tx.quotationProduct.create({ data: { internalNumber: await allocateQuotationProductNumber(tx), productId: product.id, nameEn: fields.name, productSource: fields.productSource, costPriceText: fields.costPriceText, unit: fields.unit, status: 'ACTIVE', specifications: (fields.specifications || '').split('\n').filter(Boolean) } })
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

export async function reimportCommonProductImages(input: unknown) {
  try {
    assertQuotationWorkbenchEnabled(); const actor = await requireAdmin()
    const data = z.object({ id: z.string().cuid(), updatedAt: z.string().datetime() }).parse(input)
    const commonProduct = await prisma.quotationProduct.findUnique({ where: { id: data.id }, select: { id: true, productId: true, updatedAt: true } })
    if (!commonProduct?.productId) throw new QuotationError('NOT_FOUND', '此常用产品未关联商城商品，无法重新导入主图')
    if (commonProduct.updatedAt.toISOString() !== data.updatedAt) throw new QuotationError('VERSION_CONFLICT', '常用产品已更新，请刷新后再重新导入主图')
    const gallerySelect = { id: true, updatedAt: true, images: { orderBy: { sortOrder: 'asc' }, take: 8, select: { id: true, url: true } } } as const
    const product = await prisma.product.findUnique({ where: { id: commonProduct.productId }, select: gallerySelect })
    if (!product) throw new QuotationError('NOT_FOUND', '关联的商城商品不存在')
    if (!product.images.length) throw new QuotationError('NOT_FOUND', '关联的商城商品没有主图，请先在商城商品中添加图片')
    const storage = getQuotationPrivateStorage()
    const storedKeys: string[] = []
    let committed = false
    try {
      const importedImages = await copyCatalogImages(product.images, storage, storedKeys)
      const result = await prisma.$transaction(async (tx) => {
        const current = await tx.product.findUnique({ where: { id: product.id }, select: gallerySelect })
        if (!current || current.updatedAt.getTime() !== product.updatedAt.getTime() || current.images.length !== product.images.length || current.images.some((image, index) => image.id !== product.images[index].id || image.url !== product.images[index].url)) {
          throw new QuotationError('VERSION_CONFLICT', '重新导入期间商城商品图片已变更，请刷新后重试')
        }
        const updatedAt = new Date(Math.max(Date.now(), commonProduct.updatedAt.getTime() + 1))
        const changed = await tx.quotationProduct.updateMany({ where: { id: commonProduct.id, updatedAt: new Date(data.updatedAt), productId: product.id }, data: { updatedAt } })
        if (changed.count !== 1) throw new QuotationError('VERSION_CONFLICT', '常用产品已更新，请刷新后再重新导入主图')
        await tx.quotationSourceFile.createMany({ data: importedImages.map((image) => ({ ...image, originalFilename: image.displayName, storageProvider: storage.provider, securityStatus: 'CLEAN', uploadedBy: actor.id })) })
        await tx.quotationProductImage.deleteMany({ where: { quotationProductId: commonProduct.id } })
        await tx.quotationProductImage.createMany({ data: importedImages.map(({ id: sourceFileId, ...metadata }, sortOrder) => ({ ...metadata, sourceFileId, quotationProductId: commonProduct.id, sortOrder })) })
        await writeQuotationAudit(tx, { entityType: 'QuotationProduct', entityId: commonProduct.id, action: 'UPDATE', actorId: actor.id, metadata: { field: 'images', source: 'CATALOG', productId: product.id } })
        return { id: commonProduct.id, updatedAt: updatedAt.toISOString(), images: importedImages.map((image) => ({ id: image.id, kind: 'source' as const, name: image.displayName })) }
      })
      committed = true
      revalidatePath('/admin/quotation-products')
      revalidatePath(`/admin/quotation-products/${commonProduct.id}`)
      return { success: true as const, reason: '商品主图已重新导入并保存，原有报价文件不受影响', data: result }
    } finally {
      if (!committed) await Promise.allSettled(storedKeys.map((key) => storage.delete(key)))
    }
  } catch (error) { return toQuotationActionError(error) }
}
