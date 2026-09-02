import type { Prisma } from '@prisma/client'

export function formatQuotationNumber(now: Date, value: number): string {
  const period = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}`
  return `QT-${period}-${String(value).padStart(5, '0')}`
}

export function formatQuotationProductNumber(now: Date, value: number): string {
  return `QTP-${now.getUTCFullYear()}-${String(value).padStart(5, '0')}`
}

export async function allocateQuotationNumber(
  transaction: Prisma.TransactionClient,
  now = new Date(),
): Promise<string> {
  const period = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}`
  const counter = await transaction.quotationNumberCounter.upsert({
    where: { period },
    create: { period, value: 1 },
    update: { value: { increment: 1 } },
    select: { value: true },
  })
  return formatQuotationNumber(now, counter.value)
}

export async function allocateQuotationProductNumber(
  transaction: Prisma.TransactionClient,
  now = new Date(),
): Promise<string> {
  const period = `P-${now.getUTCFullYear()}`
  const counter = await transaction.quotationNumberCounter.upsert({
    where: { period },
    create: { period, value: 1 },
    update: { value: { increment: 1 } },
    select: { value: true },
  })
  return formatQuotationProductNumber(now, counter.value)
}
