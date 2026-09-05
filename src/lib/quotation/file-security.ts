import { isAbsolute } from 'node:path'

export function canAcceptQuotationUpload(environment: NodeJS.ProcessEnv = process.env): boolean {
  if (environment.NODE_ENV !== 'production') return true
  const scanner = environment.QUOTATION_CLAMSCAN_PATH
  return Boolean(scanner && isAbsolute(scanner))
}
