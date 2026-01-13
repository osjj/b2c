'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { QuoteStatus } from '@prisma/client'

interface GetQuotesParams {
  page?: number
  limit?: number
  search?: string
  status?: QuoteStatus
}

export async function getAdminQuotes({
  page = 1,
  limit = 20,
  search = '',
  status,
}: GetQuotesParams = {}) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') {
    throw new Error('Unauthorized')
  }

  const where = {
    ...(search && {
      OR: [
        { quoteNumber: { contains: search, mode: 'insensitive' as const } },
        { name: { contains: search, mode: 'insensitive' as const } },
        { email: { contains: search, mode: 'insensitive' as const } },
        { companyName: { contains: search, mode: 'insensitive' as const } },
      ],
    }),
    ...(status && { status }),
  }

  const [quotes, total] = await Promise.all([
    prisma.quote.findMany({
      where,
      include: {
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.quote.count({ where }),
  ])

  return {
    quotes,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }
}

export async function getAdminQuote(quoteId: string) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') {
    throw new Error('Unauthorized')
  }

  return prisma.quote.findUnique({
    where: { id: quoteId },
    include: {
      items: {
        include: {
          product: {
            include: { images: { take: 1 } },
          },
        },
      },
    },
  })
}

export async function updateQuoteStatus(quoteId: string, status: QuoteStatus) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') {
    throw new Error('Unauthorized')
  }

  await prisma.quote.update({
    where: { id: quoteId },
    data: { status },
  })

  revalidatePath('/admin/quotes')
  revalidatePath(`/admin/quotes/${quoteId}`)

  return { success: true }
}

export async function deleteQuote(quoteId: string) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') {
    throw new Error('Unauthorized')
  }

  await prisma.quote.delete({
    where: { id: quoteId },
  })

  revalidatePath('/admin/quotes')

  return { success: true }
}
