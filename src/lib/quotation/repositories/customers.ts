import type { Prisma } from '@prisma/client'

import { prisma } from '@/lib/prisma'

export async function findBusinessCustomer(id: string) {
  return prisma.businessCustomer.findUnique({
    where: { id },
    include: { contacts: { orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }] } },
  })
}

export async function searchBusinessCustomers(input: {
  page: number
  pageSize: number
  search: string
  isActive?: boolean
}) {
  const where: Prisma.BusinessCustomerWhereInput = {
    ...(input.isActive === undefined ? {} : { isActive: input.isActive }),
    ...(input.search
      ? {
          OR: [
            { companyName: { contains: input.search, mode: 'insensitive' as const } },
            { email: { contains: input.search, mode: 'insensitive' as const } },
            { countryCode: { contains: input.search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  }
  const [total, customers] = await Promise.all([
    prisma.businessCustomer.count({ where }),
    prisma.businessCustomer.findMany({
      where,
      include: { contacts: { orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }] } },
      orderBy: { updatedAt: 'desc' },
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize,
    }),
  ])
  return { customers, total }
}
