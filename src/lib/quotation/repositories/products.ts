import type { Prisma, QuotationProductStatus } from '@prisma/client'

import { prisma } from '@/lib/prisma'

export async function findQuotationProduct(id: string) {
  return prisma.quotationProduct.findUnique({
    where: { id },
    include: {
      images: { orderBy: { sortOrder: 'asc' } },
      sources: { orderBy: { createdAt: 'desc' } },
      costRecords: { orderBy: { effectiveAt: 'desc' }, take: 20 },
    },
  })
}

export async function searchQuotationProducts(input: {
  page: number
  pageSize: number
  search: string
  status?: QuotationProductStatus
}) {
  const where: Prisma.QuotationProductWhereInput = {
    ...(input.status ? { status: input.status } : {}),
    ...(input.search
      ? {
          OR: [
            { internalNumber: { contains: input.search, mode: 'insensitive' as const } },
            { nameZh: { contains: input.search, mode: 'insensitive' as const } },
            { nameEn: { contains: input.search, mode: 'insensitive' as const } },
            { model: { contains: input.search, mode: 'insensitive' as const } },
            { sku: { contains: input.search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  }
  const [total, products] = await Promise.all([
    prisma.quotationProduct.count({ where }),
    prisma.quotationProduct.findMany({
      where,
      include: { images: { orderBy: { sortOrder: 'asc' }, take: 1 } },
      orderBy: { updatedAt: 'desc' },
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize,
    }),
  ])
  return { products, total }
}
