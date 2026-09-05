import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import type { CommonProductOption } from '../simple-input'

const defaultsSchema = z.object({ unitPrice: z.string(), currency: z.string() })
export async function readCommonProducts(): Promise<CommonProductOption[]> {
  const products = await prisma.quotationProduct.findMany({ where: { status: { not: 'INACTIVE' } }, orderBy: { updatedAt: 'desc' }, take: 500, include: { images: { where: { isCustomerVisible: true, sourceFile: { securityStatus: 'CLEAN', deletedAt: null, salesQuotationId: null } }, orderBy: { sortOrder: 'asc' }, take: 8 } } })
  const defaults = await prisma.setting.findMany({ where: { key: { in: products.map((product) => `quotation.product-defaults.${product.id}`) } } })
  return products.map((product) => {
    const parsed = defaultsSchema.safeParse(defaults.find((entry) => entry.key.endsWith(`.${product.id}`))?.value)
    return { id: product.id, name: product.nameEn || product.nameZh || '', description: Array.isArray(product.specifications) ? product.specifications.filter((line) => typeof line === 'string').join('\n') : '', unit: product.unit, unitPrice: parsed.success ? parsed.data.unitPrice : '0', currency: parsed.success ? parsed.data.currency : 'USD', active: true, images: product.images.flatMap((image) => image.sourceFileId && ['image/jpeg', 'image/png'].includes(image.contentType) ? [{ id: image.sourceFileId, kind: 'source' as const, name: image.displayName || '产品图片' }] : []) }
  })
}
