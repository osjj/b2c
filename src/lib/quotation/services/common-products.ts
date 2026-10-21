import { prisma } from '@/lib/prisma'
import type { CommonProductOption } from '../simple-input'
import { commonProductDefaultsSchema } from '../simple-input'

export async function readCommonProducts(): Promise<CommonProductOption[]> {
  const products = await prisma.quotationProduct.findMany({
    where: { status: { not: 'INACTIVE' } },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true, nameEn: true, nameZh: true, internalNumber: true, model: true, sku: true,
      unit: true, specifications: true,
      images: {
        where: {
          isCustomerVisible: true,
          contentType: { in: ['image/jpeg', 'image/png'] },
          sourceFile: {
            securityStatus: 'CLEAN', deletedAt: null, salesQuotationId: null,
            contentType: { in: ['image/jpeg', 'image/png'] },
            sizeBytes: { gt: 0, lte: 5 * 1024 * 1024 },
          },
        },
        orderBy: { sortOrder: 'asc' }, take: 8,
        select: { sourceFileId: true, displayName: true },
      },
    },
  })
  if (!products.length) return []
  const defaults = await prisma.setting.findMany({
    where: { key: { in: products.map((product) => `quotation.product-defaults.${product.id}`) } },
    select: { key: true, value: true },
  })
  const defaultsByKey = new Map(defaults.map((entry) => [entry.key, entry.value]))
  return products.map((product) => {
    const price = commonProductDefaultsSchema.parse(defaultsByKey.get(`quotation.product-defaults.${product.id}`) ?? {})
    return {
      id: product.id, name: product.nameEn || product.nameZh || '',
      nameEn: product.nameEn, nameZh: product.nameZh, internalNumber: product.internalNumber,
      model: product.model, sku: product.sku,
      specifications: Array.isArray(product.specifications) ? product.specifications.filter((line) => typeof line === 'string').join('\n') : '',
      ...price, description: price.description ?? '', unit: product.unit, active: true,
      images: product.images.flatMap((image) => image.sourceFileId ? [{ id: image.sourceFileId, kind: 'source' as const, name: image.displayName || '产品图片' }] : []),
    }
  })
}
