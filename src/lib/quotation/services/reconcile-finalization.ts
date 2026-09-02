import { prisma } from '@/lib/prisma'

import { reconcileFinalizingInputSchema } from '../schemas'
import { quotationFinalAssetsPrefix, quotationFinalPrefix, quotationStagingPrefix } from '../object-keys'
import { getQuotationPrivateStorage } from '../private-storage'
import { writeQuotationAudit } from './audit'

export type FinalizationReconciliationResult = {
  inspected: number
  compensated: number
  attemptIds: string[]
  cleanupPendingAttemptIds: string[]
}

/**
 * Request-driven recovery hook for Stage A. It is deliberately not scheduled:
 * production scheduling requires separate deployment approval. Only expired
 * leases are claimed, and the attempt/revision compensation is atomic.
 */
export async function reconcileExpiredFinalizationAttempts(
  input: unknown,
  actorId: string,
  now = new Date(),
): Promise<FinalizationReconciliationResult> {
  const data = reconcileFinalizingInputSchema.parse(input)
  const expired = await prisma.quotationFinalizationAttempt.findMany({
    where: { status: 'RUNNING', leaseExpiresAt: { lt: now } },
    select: { id: true, revisionId: true, revision: { select: { salesQuotationId: true } } },
    orderBy: { leaseExpiresAt: 'asc' },
    take: data.limit,
  })
  const compensated: string[] = []
  const cleanupPending: string[] = []
  for (const candidate of expired) {
    const didCompensate = await prisma.$transaction(async (transaction) => {
      const claimed = await transaction.quotationFinalizationAttempt.updateMany({
        where: { id: candidate.id, status: 'RUNNING', leaseExpiresAt: { lt: now } },
        data: {
          status: 'FAILED',
          leaseOwner: null,
          leaseExpiresAt: null,
          failureCode: 'FINALIZATION_LEASE_EXPIRED',
          failureSummary: 'Finalization lease expired and was safely compensated',
        },
      })
      if (claimed.count !== 1) return false
      const revision = await transaction.salesQuotationRevision.updateMany({
        where: { id: candidate.revisionId, state: 'FINALIZING' },
        data: { state: 'READY', version: { increment: 1 } },
      })
      await writeQuotationAudit(transaction, {
        salesQuotationId: candidate.revision.salesQuotationId,
        entityType: 'QuotationFinalizationAttempt',
        entityId: candidate.id,
        action: 'STATE_CHANGE',
        actorId,
        metadata: {
          operation: 'RECONCILE_EXPIRED_FINALIZATION',
          revisionId: candidate.revisionId,
          revisionCompensated: revision.count === 1,
        },
      })
      return true
    })
    if (didCompensate) {
      compensated.push(candidate.id)
      try {
        const storage = getQuotationPrivateStorage()
        const documents = await prisma.salesQuotationDocument.count({ where: { revisionId: candidate.revisionId } })
        if (documents !== 0) throw new Error('Compensated revision unexpectedly retains formal documents')
        const prefixes = [
          quotationStagingPrefix(candidate.revision.salesQuotationId, candidate.revisionId, candidate.id),
          quotationFinalPrefix(candidate.revision.salesQuotationId, candidate.revisionId),
          quotationFinalAssetsPrefix(candidate.revision.salesQuotationId, candidate.revisionId),
        ]
        const cleanup = await Promise.allSettled(prefixes.map((prefix) => storage.deletePrefix(prefix)))
        if (cleanup.some((result) => result.status === 'rejected')) throw new Error('One or more private prefixes require cleanup retry')
      } catch {
        // State recovery is authoritative. Storage cleanup is reported for an
        // operator retry and never turns a compensated revision back to FINALIZING.
        cleanupPending.push(candidate.id)
      }
    }
  }
  return {
    inspected: expired.length,
    compensated: compensated.length,
    attemptIds: compensated,
    cleanupPendingAttemptIds: cleanupPending,
  }
}
