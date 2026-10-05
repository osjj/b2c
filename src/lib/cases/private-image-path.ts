const CASE_ID_PATTERN = /^c[a-z0-9]{24}$/
const SHA256_PATTERN = /^[a-f0-9]{64}$/
const PRIVATE_IMAGE_PATTERN = /^\/api\/admin\/case-images\/(c[a-z0-9]{24})\/([a-f0-9]{64})\.(png|jpg)$/

export type CasePrivateImagePath = {
  caseId: string
  sha256: string
  extension: 'png' | 'jpg'
}

export function parseCasePrivateImage(value: string): CasePrivateImagePath | null {
  const matched = PRIVATE_IMAGE_PATTERN.exec(value)
  if (!matched) return null
  const [, caseId, sha256, extension] = matched
  if (!caseId || !sha256 || (extension !== 'png' && extension !== 'jpg')) return null
  return { caseId, sha256, extension }
}

export function isCasePrivateImage(value: string): boolean {
  return parseCasePrivateImage(value) !== null
}

export function casePrivateImageUrl(caseId: string, sha256: string, extension: 'png' | 'jpg'): string {
  if (!CASE_ID_PATTERN.test(caseId) || !SHA256_PATTERN.test(sha256) || !['png', 'jpg'].includes(extension)) {
    throw new Error('Invalid private case image identifier')
  }
  return `/api/admin/case-images/${caseId}/${sha256}.${extension}`
}
