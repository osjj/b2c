import { prisma } from '@/lib/prisma'
import type { CommonProductOption } from '../simple-input'
import { commonProductDefaultsSchema } from '../simple-input'

export async function readCommonProducts(): Promise<CommonProductOption[]> {
  const products = await prisma.quotationProduct.findMany({ where: { status: { not: 'INACTIVE' } }, orderBy: { updatedAt: 'desc' }, take: 500, include: { images: { where: { isCustomerVisible: true, sourceFile: { securityStatus: 'CLEAN', deletedAt: null, salesQuotationId: null } }, orderBy: { sortOrder: 'asc' }, take: 8 } } })
  const defaults = await prisma.setting.findMany({ where: { key: { in: products.map((product) => `quotation.product-defaults.${product.id}`) } } })
  return products.map((product) => {
    const price = commonProductDefaultsSchema.parse(defaults.find((entry) => entry.key.endsWith(`.${product.id}`))?.value ?? {})
    return { id: product.id, name: product.nameEn || product.nameZh || '', specifications: Array.isArray(product.specifications) ? product.specifications.filter((line) => typeof line === 'string').join('\n') : '', ...price, description: price.description ?? '', unit: product.unit, active: true, images: product.images.flatMap((image) => image.sourceFileId && ['image/jpeg', 'image/png'].includes(image.contentType) ? [{ id: image.sourceFileId, kind: 'source' as const, name: image.displayName || '产品图片' }] : []) }
  })
}
