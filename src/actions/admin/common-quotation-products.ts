'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { assertQuotationWorkbenchEnabled } from '@/lib/quotation/feature'
import { QuotationError, toQuotationActionError } from '@/lib/quotation/errors'
import { allocateQuotationProductNumber } from '@/lib/quotation/numbering'
import { commonProductSchema } from '@/lib/quotation/simple-input'
import { writeQuotationAudit } from '@/lib/quotation/services/audit'

export async function saveCommonQuotationProduct(input: unknown) {
  try {
    assertQuotationWorkbenchEnabled()
    const actor = await requireAdmin()
    const data = commonProductSchema.parse(input)
    const product = await prisma.$transaction(async (tx) => {
      const fields = { nameEn: data.name, nameZh: null, unit: data.unit, specifications: (data.specifications ?? data.description).split(/\r?\n/).map((line) => line.trim()).filter(Boolean), status: data.active ? 'ACTIVE' as const : 'INACTIVE' as const }
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
      await writeQuotationAudit(tx, { entityType: 'QuotationProduct', entityId: id, action: data.id ? 'UPDATE' : 'CREATE', actorId: actor.id })
      return { id }
    })
    revalidatePath('/admin/quotation-products')
    revalidatePath(`/admin/quotation-products/${product.id}`)
    return { success: true as const, reason: '常用产品已保存', data: product }
  } catch (error) { return toQuotationActionError(error) }
}

export async function saveCommonProductImages(input: unknown) {
  try {
    assertQuotationWorkbenchEnabled()
    const actor = await requireAdmin()
    const data = z.object({ id: z.string().cuid(), updatedAt: z.string().datetime(), sourceIds: z.array(z.string().uuid()).max(8) }).parse(input)
    await prisma.$transaction(async (tx) => {
      const updated = await tx.quotationProduct.updateMany({ where: { id: data.id, updatedAt: new Date(data.updatedAt) }, data: { updatedAt: new Date() } })
      if (updated.count !== 1) throw new QuotationError('VERSION_CONFLICT', '产品已更新，请刷新后重试')
      if (new Set(data.sourceIds).size !== data.sourceIds.length) throw new QuotationError('DUPLICATE_FILE', '图片重复')
      const files = await tx.quotationSourceFile.findMany({ where: { id: { in: data.sourceIds }, securityStatus: 'CLEAN', deletedAt: null, salesQuotationId: null, contentType: { in: ['image/png', 'image/jpeg'] }, sizeBytes: { lte: 5 * 1024 * 1024 } } })
      if (files.length !== data.sourceIds.length) throw new QuotationError('FILE_NOT_CLEAN', '图片未通过安全检查或不允许复用')
      await tx.quotationProductImage.deleteMany({ where: { quotationProductId: data.id } })
      const images = data.sourceIds.map((id, index) => {
        const file = files.find((entry) => entry.id === id)
        if (!file) throw new QuotationError('NOT_FOUND', '图片不存在')
        return { quotationProductId: data.id, sourceFileId: id, displayName: file.displayName, objectKey: file.objectKey, contentType: file.contentType, sizeBytes: file.sizeBytes, sha256: file.sha256, sortOrder: index }
      })
      if (images.length) await tx.quotationProductImage.createMany({ data: images })
      await writeQuotationAudit(tx, { entityType: 'QuotationProduct', entityId: data.id, action: 'UPDATE', actorId: actor.id, metadata: { field: 'images' } })
    })
    revalidatePath(`/admin/quotation-products/${data.id}`)
    revalidatePath('/admin/quotation-products')
    return { success: true as const, reason: '产品图片已保存' }
  } catch (error) { return toQuotationActionError(error) }
}
