import type { Prisma, QuotationAuditAction } from '@prisma/client'

export async function writeQuotationAudit(
  transaction: Prisma.TransactionClient,
  input: {
    salesQuotationId?: string | null
    entityType: string
    entityId: string
    action: QuotationAuditAction
    actorId: string
    metadata?: Prisma.InputJsonValue
  },
): Promise<void> {
  await transaction.quotationAuditLog.create({
    data: {
      salesQuotationId: input.salesQuotationId,
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      actorId: input.actorId,
      metadata: input.metadata,
    },
  })
}
