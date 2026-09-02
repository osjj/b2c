import { randomUUID } from 'node:crypto'

const SAFE_FILENAME = /[^A-Za-z0-9._-]+/g

export function sanitizeQuotationFilename(filename: string): string {
  const leaf = filename.split(/[\\/]/).at(-1) ?? 'file'
  const sanitized = leaf.replace(/[\u0000-\u001f\u007f]/g, '').replace(SAFE_FILENAME, '_')
  return sanitized.slice(0, 180) || 'file'
}

export function quotationQuarantineKey(filename: string): string {
  return `quotation/quarantine/${randomUUID()}/${sanitizeQuotationFilename(filename)}`
}

export function quotationStagingKey(
  quotationId: string,
  revisionId: string,
  attemptId: string,
  filename: string,
): string {
  return `quotation/${quotationId}/revision/${revisionId}/staging/${attemptId}/${sanitizeQuotationFilename(filename)}`
}

export function quotationStagingPrefix(
  quotationId: string,
  revisionId: string,
  attemptId: string,
): string {
  return `quotation/${quotationId}/revision/${revisionId}/staging/${attemptId}/`
}

export function quotationFinalKey(
  quotationId: string,
  revisionId: string,
  documentId: string,
  filename: string,
): string {
  return `quotation/${quotationId}/revision/${revisionId}/final/${documentId}/${sanitizeQuotationFilename(filename)}`
}

export function quotationFinalPrefix(quotationId: string, revisionId: string): string {
  return `quotation/${quotationId}/revision/${revisionId}/final/`
}

export function quotationFinalAssetKey(
  quotationId: string,
  revisionId: string,
  assetId: string,
  filename: string,
): string {
  return `quotation/${quotationId}/revision/${revisionId}/assets/${assetId}/${sanitizeQuotationFilename(filename)}`
}

export function quotationFinalAssetsPrefix(quotationId: string, revisionId: string): string {
  return `quotation/${quotationId}/revision/${revisionId}/assets/`
}
