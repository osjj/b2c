import { QuotationError } from './errors'

const stageLabels = {
  prepare: 'Quotation preparation',
  images: 'Private image preparation',
  snapshot: 'Quotation snapshot',
  ai: 'AI quotation layout',
  pdf: 'PDF generation',
  excel: 'Excel generation',
  validation: 'Document validation',
  storage: 'Private document storage',
  database: 'Document database save',
} as const

export type FinalizationStage = keyof typeof stageLabels

class FinalizationStageError extends QuotationError {}

// Never forward SDK messages/stacks: they may contain credentials, URLs or private object keys.
export function finalizationError(error: unknown, stage: FinalizationStage): QuotationError {
  if (error instanceof FinalizationStageError) return error
  if (error instanceof QuotationError) {
    return new FinalizationStageError(error.code, `${stageLabels[stage]}: ${error.message}`)
  }
  const name = error && typeof error === 'object' && 'name' in error ? error.name : undefined
  let reason = 'This step could not be completed. Contact the administrator with the failure reference.'
  if (stage === 'storage' || stage === 'images') {
    switch (name) {
      case 'SignatureDoesNotMatch':
      case 'InvalidAccessKeyId':
        reason = 'R2 credentials were rejected. Check the matching QUOTATION_PRIVATE_R2_ACCESS_KEY_ID and QUOTATION_PRIVATE_R2_SECRET_ACCESS_KEY on the server, then restart the application.'
        break
      case 'AccessDenied':
        reason = 'R2 denied access. Check Object Read & Write permission for the configured private quotation bucket.'
        break
      case 'NoSuchBucket':
        reason = 'The configured private R2 bucket was not found. Check QUOTATION_PRIVATE_R2_BUCKET and its account endpoint.'
        break
      case 'NoSuchKey':
        reason = 'A required private quotation file was not found. Check the selected images before retrying.'
        break
      case 'TimeoutError':
      case 'RequestTimeout':
      case 'AbortError':
        reason = 'The private storage request timed out. Check server connectivity and refresh the quotation status before retrying.'
        break
    }
  }
  return new FinalizationStageError('DOCUMENT_GENERATION_FAILED', `${stageLabels[stage]}: ${reason}`)
}

export async function atFinalizationStage<T>(stage: FinalizationStage, operation: () => Promise<T>): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    throw finalizationError(error, stage)
  }
}
