import type { Prisma, SalesQuotationOutcomeStatus, SalesQuotationRevisionState } from '@prisma/client'

import { prisma } from '@/lib/prisma'

export async function findSalesQuotation(id: string) {
  return prisma.salesQuotation.findUnique({
    where: { id },
    include: {
      customer: { include: { contacts: true } },
      revisions: {
        orderBy: { revisionNumber: 'desc' },
        include: {
          items: { orderBy: { sortOrder: 'asc' }, include: { assets: true } },
          documents: { orderBy: { createdAt: 'asc' } },
        },
      },
    },
  })
}

export async function searchSalesQuotations(input: {
  page: number
  pageSize: number
  search: string
  outcomeStatus?: SalesQuotationOutcomeStatus
  revisionState?: SalesQuotationRevisionState
}) {
  const where: Prisma.SalesQuotationWhereInput = {
    ...(input.outcomeStatus ? { outcomeStatus: input.outcomeStatus } : {}),
    ...(input.search
      ? {
          OR: [
            { quotationNumber: { contains: input.search, mode: 'insensitive' as const } },
            { customer: { companyName: { contains: input.search, mode: 'insensitive' as const } } },
          ],
        }
      : {}),
    ...(input.revisionState ? { revisions: { some: { state: input.revisionState } } } : {}),
  }
  const [total, quotations] = await Promise.all([
    prisma.salesQuotation.count({ where }),
    prisma.salesQuotation.findMany({
      where,
      select: {
        id: true,
        quotationNumber: true,
        outcomeStatus: true,
        createdAt: true,
        updatedAt: true,
        customer: { select: { id: true, companyName: true, countryCode: true } },
        revisions: {
          orderBy: { revisionNumber: 'desc' },
          take: 1,
          select: {
            id: true,
            revisionNumber: true,
            version: true,
            state: true,
            quotationDate: true,
            validUntil: true,
            currency: true,
            total: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize,
    }),
  ])
  return { quotations, total }
}
