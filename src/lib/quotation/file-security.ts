export function canAcceptQuotationUpload(environment: NodeJS.ProcessEnv = process.env): boolean {
  if (environment.NODE_ENV !== 'production') return true
  // Stage A has no scanner adapter yet. An environment flag alone must never turn
  // unscanned production uploads into accepted files.
  return false
}
