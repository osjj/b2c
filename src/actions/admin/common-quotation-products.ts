'use server'

import { Prisma } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { assertQuotationWorkbenchEnabled } from '@/lib/quotation/feature'
import { QuotationError, toQuotationActionError } from '@/lib/quotation/errors'
import { allocateQuotationProductNumber } from '@/lib/quotation/numbering'
import { commonProductSaveSchema } from '@/lib/quotation/simple-input'
import { writeQuotationAudit } from '@/lib/quotation/services/audit'

async function replaceCommonProductImages(tx: Prisma.TransactionClient, productId: string, sourceIds: string[]) {
  if (new Set(sourceIds).size !== sourceIds.length) throw new QuotationError('DUPLICATE_FILE', '图片重复')
  const files = await tx.quotationSourceFile.findMany({
    where: { id: { in: sourceIds }, securityStatus: 'CLEAN', deletedAt: null, salesQuotationId: null, contentType: { in: ['image/png', 'image/jpeg'] }, sizeBytes: { gt: 0, lte: 5 * 1024 * 1024 } },
    select: { id: true, displayName: true, objectKey: true, contentType: true, sizeBytes: true, sha256: true },
  })
  if (files.length !== sourceIds.length) throw new QuotationError('FILE_NOT_CLEAN', '请选择已通过安全检查、非空且不超过 5 MB 的可复用 PNG 或 JPEG 图片')
  const images = sourceIds.map((id, index) => {
    const file = files.find((entry) => entry.id === id)
    if (!file) throw new QuotationError('FILE_NOT_CLEAN', '图片不存在或不允许复用，请重新选择')
    return { quotationProductId: productId, sourceFileId: id, displayName: file.displayName, objectKey: file.objectKey, contentType: file.contentType, sizeBytes: file.sizeBytes, sha256: file.sha256, sortOrder: index }
  })
  await tx.quotationProductImage.deleteMany({ where: { quotationProductId: productId } })
  if (images.length) await tx.quotationProductImage.createMany({ data: images })
}

export async function saveCommonQuotationProduct(input: unknown) {
  try {
    assertQuotationWorkbenchEnabled()
    const actor = await requireAdmin()
    const data = commonProductSaveSchema.parse(input)
    const product = await prisma.$transaction(async (tx) => {
      const fields = { nameEn: data.name, nameZh: null, unit: data.unit, specifications: (data.specifications ?? data.description).split(/\r?\n/).map((line) => line.trim()).filter(Boolean), status: data.active ? 'ACTIVE' as const : 'INACTIVE' as const, ...(data.productSource !== undefined ? { productSource: data.productSource } : {}), ...(data.costPriceText !== undefined ? { costPriceText: data.costPriceText } : {}) }
      let id: string
      if (data.id) {
        if (!data.expectedUpdatedAt) throw new QuotationError('VERSION_CONFLICT', '请刷新产品后再修改')
        const changed = await tx.quotationProduct.updateMany({ where: { id: data.id, updatedAt: new Date(data.expectedUpdatedAt) }, data: fields })
        if (changed.count !== 1) throw new QuotationError('VERSION_CONFLICT', '产品已被修改，请刷新后再保存')
        id = data.id
      } else {
        const created = await tx.quotationProduct.create({ data: { ...fields, internalNumber: await allocateQuotationProductNumber(tx) } })
        id = created.id
      }
      const key = `quotation.product-defaults.${id}`
      const value = { unitPrice: data.unitPrice, currency: data.currency, unitCost: data.unitCost ?? null, description: data.specifications === undefined ? '' : data.description, packaging: data.packaging ?? '' }
      await tx.setting.upsert({ where: { key }, create: { key, value }, update: { value } })
      if (data.sourceIds !== undefined) await replaceCommonProductImages(tx, id, data.sourceIds)
      await writeQuotationAudit(tx, { entityType: 'QuotationProduct', entityId: id, action: data.id ? 'UPDATE' : 'CREATE', actorId: actor.id })
      return { id }
    })
    revalidatePath('/admin/quotation-products')
    revalidatePath(`/admin/quotation-products/${product.id}`)
    return { success: true as const, reason: '常用产品已保存', data: product }
  } catch (error) { return toQuotationActionError(error) }
}

export async function deleteCommonQuotationProduct(input: unknown) {
  const referencedReason = '此常用产品已被报价行或成本记录引用，无法删除。请在编辑页面取消“在常用产品选择器中显示”并保存来停用。'
  try {
    assertQuotationWorkbenchEnabled()
    const actor = await requireAdmin()
    const data = z.object({ id: z.string().cuid(), expectedUpdatedAt: z.string().datetime() }).parse(input)
    const expectedUpdatedAt = new Date(data.expectedUpdatedAt)
    const product = await prisma.$transaction(async (tx) => {
      const existing = await tx.quotationProduct.findUnique({
        where: { id: data.id }, select: { id: true, updatedAt: true },
      })
      if (!existing) throw new QuotationError('NOT_FOUND', '常用产品不存在，请刷新列表')
      if (existing.updatedAt.getTime() !== expectedUpdatedAt.getTime()) {
        throw new QuotationError('VERSION_CONFLICT', '常用产品已更新，请刷新后确认最新资料再删除')
      }
      const [quotationItems, costRecords] = await Promise.all([
        tx.salesQuotationItem.count({ where: { quotationProductId: data.id } }),
        tx.quotationProductCostRecord.count({ where: { quotationProductId: data.id } }),
      ])
      if (quotationItems || costRecords) throw new QuotationError('REFERENCED_RECORD', referencedReason)
      const deleted = await tx.quotationProduct.deleteMany({ where: { id: data.id, updatedAt: expectedUpdatedAt } })
      if (deleted.count !== 1) throw new QuotationError('VERSION_CONFLICT', '常用产品已变更，请刷新后检查再删除')
      await tx.setting.deleteMany({ where: { key: `quotation.product-defaults.${data.id}` } })
      await writeQuotationAudit(tx, {
        entityType: 'QuotationProduct', entityId: data.id, action: 'ARCHIVE', actorId: actor.id,
        metadata: { deleted: true },
      })
      return { id: data.id }
    })
    revalidatePath('/admin/quotation-products')
    revalidatePath(`/admin/quotation-products/${product.id}`)
    revalidatePath('/admin/sales-quotations')
    revalidatePath('/admin/sales-quotations/new')
    revalidatePath('/admin/sales-quotations/[id]', 'page')
    return { success: true as const, reason: '常用产品已删除，已保存的报价和文件保持不变', data: product }
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
      return toQuotationActionError(new QuotationError('REFERENCED_RECORD', referencedReason))
    }
    return toQuotationActionError(error)
  }
}

export async function saveCommonProductImages(input: unknown) {
  try {
    assertQuotationWorkbenchEnabled()
    const actor = await requireAdmin()
    const data = z.object({ id: z.string().cuid(), updatedAt: z.string().datetime(), sourceIds: z.array(z.string().uuid()).max(8) }).parse(input)
    await prisma.$transaction(async (tx) => {
      const updated = await tx.quotationProduct.updateMany({ where: { id: data.id, updatedAt: new Date(data.updatedAt) }, data: { updatedAt: new Date() } })
      if (updated.count !== 1) throw new QuotationError('VERSION_CONFLICT', '产品已更新，请刷新后重试')
      await replaceCommonProductImages(tx, data.id, data.sourceIds)
      await writeQuotationAudit(tx, { entityType: 'QuotationProduct', entityId: data.id, action: 'UPDATE', actorId: actor.id, metadata: { field: 'images' } })
    })
    revalidatePath(`/admin/quotation-products/${data.id}`)
    revalidatePath('/admin/quotation-products')
    return { success: true as const, reason: '产品图片已保存' }
  } catch (error) { return toQuotationActionError(error) }
}
