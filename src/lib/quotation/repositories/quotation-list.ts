import { Prisma } from '@prisma/client'
import { z } from 'zod'

import { prisma } from '@/lib/prisma'

const listInputSchema = z.object({
  page: z.number().int().min(1).max(100000),
  search: z.string().trim().max(200),
})
const customerNameSchema = z.object({ companyName: z.string() })
const historicalNamesSchema = z.array(customerNameSchema.extend({ id: z.string() }))

export const QUOTATION_LIST_PAGE_SIZE = 20

// Called only after the page's feature gate and ADMIN authorization.
export async function readQuotationList(input: z.infer<typeof listInputSchema>) {
  const { page, search } = listInputSchema.parse(input)
  const where: Prisma.SalesQuotationWhereInput = search
    ? {
        OR: [
          { quotationNumber: { contains: search, mode: 'insensitive' } },
          { revisions: { some: { customerSnapshot: { path: ['companyName'], string_contains: search, mode: 'insensitive' } } } },
        ],
      }
    : {}
  const [quotations, count] = await Promise.all([
    prisma.salesQuotation.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      skip: (page - 1) * QUOTATION_LIST_PAGE_SIZE,
      take: QUOTATION_LIST_PAGE_SIZE,
      select: {
        id: true,
        quotationNumber: true,
        revisions: {
          orderBy: { revisionNumber: 'desc' },
          take: 1,
          select: {
            id: true,
            revisionNumber: true,
            state: true,
            quotationDate: true,
            currency: true,
            total: true,
            _count: { select: { items: true } },
          },
        },
      },
    }),
    prisma.salesQuotation.count({ where }),
  ])

  const revisionIds = quotations.flatMap((quotation) => quotation.revisions.map((revision) => revision.id))
  // Snapshots contain base64 brand images. Extract only the historical name in
  // PostgreSQL; selecting customerSnapshot in Prisma would transfer those bytes.
  const names = revisionIds.length
    ? historicalNamesSchema.parse(await prisma.$queryRaw<unknown>(Prisma.sql`
        SELECT id,
          CASE WHEN jsonb_typeof(customer_snapshot -> 'companyName') = 'string'
            THEN customer_snapshot ->> 'companyName'
            ELSE NULL
          END AS "companyName"
        FROM sales_quotation_revisions
        WHERE id IN (${Prisma.join(revisionIds)})
      `))
    : []
  const namesByRevision = new Map(names.map((row) => [row.id, row.companyName]))

  return {
    count,
    quotations: quotations.map((quotation) => ({
      ...quotation,
      revisions: quotation.revisions.map((revision) => ({
        ...revision,
        ...customerNameSchema.parse({ companyName: namesByRevision.get(revision.id) }),
      })),
    })),
  }
}
