import type { Prisma } from '@prisma/client'

import { readProviderFailureDiagnostics } from './provider-diagnostics'

export function readReplyAttemptDiagnostics(response: unknown) {
  if (!response || typeof response !== 'object' || Array.isArray(response)) return undefined
  return readProviderFailureDiagnostics('providerDiagnostics' in response ? response.providerDiagnostics : undefined)
}

/** Keep the private prepared archive intact; add only revalidated diagnostics. */
export function addReplyAttemptDiagnostics(response: Prisma.JsonValue | null, value: unknown): Prisma.InputJsonObject {
  const archive = response && typeof response === 'object' && !Array.isArray(response) ? response : {}
  const diagnostics = readProviderFailureDiagnostics(value)
  return { ...archive, ...(diagnostics ? { providerDiagnostics: diagnostics } : {}) }
}
