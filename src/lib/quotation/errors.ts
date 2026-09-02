import { z } from 'zod'
import { unstable_rethrow } from 'next/navigation'

export const quotationErrorCodeSchema = z.enum([
  'FEATURE_DISABLED',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NOT_FOUND',
  'VALIDATION_FAILED',
  'VERSION_CONFLICT',
  'INVALID_STATE_TRANSITION',
  'CURRENCY_MISMATCH',
  'FILE_NOT_CLEAN',
  'FILE_TOO_LARGE',
  'DUPLICATE_FILE',
  'DOCUMENT_GENERATION_FAILED',
  'DOCUMENT_VALIDATION_FAILED',
  'IMMUTABLE_REVISION',
  'REFERENCED_RECORD',
  'INTERNAL_ERROR',
])

export type QuotationErrorCode = z.infer<typeof quotationErrorCodeSchema>

export class QuotationError extends Error {
  readonly code: QuotationErrorCode

  constructor(code: QuotationErrorCode, message: string) {
    super(message)
    this.name = 'QuotationError'
    this.code = code
  }
}

export const quotationActionResultSchema = z.discriminatedUnion('success', [
  z.object({
    success: z.literal(true),
    reason: z.string(),
    data: z.unknown().optional(),
  }),
  z.object({
    success: z.literal(false),
    reason: z.string(),
    code: quotationErrorCodeSchema,
    errors: z.record(z.string(), z.array(z.string())).optional(),
  }),
])

export type QuotationActionResult = z.infer<typeof quotationActionResultSchema>

export function toQuotationActionError(error: unknown): QuotationActionResult {
  unstable_rethrow(error)
  if (error instanceof QuotationError) {
    return { success: false, reason: error.message, code: error.code }
  }
  if (error instanceof z.ZodError) {
    return {
      success: false,
      reason: 'Validation failed',
      code: 'VALIDATION_FAILED',
      errors: error.flatten().fieldErrors,
    }
  }

  return {
    success: false,
    reason: 'The quotation operation could not be completed',
    code: 'INTERNAL_ERROR',
  }
}
