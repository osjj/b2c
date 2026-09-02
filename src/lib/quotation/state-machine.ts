import type { z } from 'zod'

import { QuotationError } from './errors'
import type { quotationRevisionStateSchema } from './schemas'

export type QuotationRevisionState = z.infer<typeof quotationRevisionStateSchema>

const ALLOWED_TRANSITIONS: Record<QuotationRevisionState, readonly QuotationRevisionState[]> = {
  DRAFT: ['READY'],
  READY: ['DRAFT', 'FINALIZING'],
  FINALIZING: ['FINALIZED', 'READY'],
  FINALIZED: ['ISSUED', 'VOID'],
  ISSUED: ['SUPERSEDED'],
  SUPERSEDED: [],
  VOID: [],
}

export function isEditableRevisionState(state: QuotationRevisionState): boolean {
  return state === 'DRAFT' || state === 'READY'
}

export function canTransitionRevision(
  from: QuotationRevisionState,
  to: QuotationRevisionState,
): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to)
}

export function assertRevisionTransition(
  from: QuotationRevisionState,
  to: QuotationRevisionState,
): void {
  if (!canTransitionRevision(from, to)) {
    throw new QuotationError(
      'INVALID_STATE_TRANSITION',
      `Revision cannot transition from ${from} to ${to}`,
    )
  }
}

export function assertEditableRevision(state: QuotationRevisionState): void {
  if (!isEditableRevisionState(state)) {
    throw new QuotationError('IMMUTABLE_REVISION', 'This quotation revision is immutable')
  }
}
