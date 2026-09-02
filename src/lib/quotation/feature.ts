import { QuotationError } from './errors'

export function isQuotationWorkbenchEnabled(
  environment: NodeJS.ProcessEnv = process.env,
): boolean {
  if (environment.NODE_ENV === 'production') {
    return environment.QUOTATION_WORKBENCH_ENABLED === 'true'
  }

  return environment.QUOTATION_WORKBENCH_ENABLED !== 'false'
}

export function assertQuotationWorkbenchEnabled(): void {
  if (!isQuotationWorkbenchEnabled()) {
    throw new QuotationError('FEATURE_DISABLED', 'Quotation workbench is disabled')
  }
}
