import { readProviderFailureDiagnostics, type ProviderFailureDiagnostics } from './provider-diagnostics'

type MailboxErrorDetails = { requestId?: string; diagnostics?: ProviderFailureDiagnostics }

export class MailboxError extends Error {
  constructor(public readonly code: string, message: string, public readonly status = 400, public readonly details?: MailboxErrorDetails) {
    super(message)
    this.name = 'MailboxError'
  }
}

export function safeMailboxError(error: unknown) {
  if (error instanceof MailboxError) {
    const diagnostics = readProviderFailureDiagnostics(error.details?.diagnostics)
    const requestId = error.details?.requestId
    return {
      code: error.code, reason: error.message, status: error.status,
      ...(requestId && /^[\w.-]{1,200}$/.test(requestId) ? { requestId } : {}),
      ...(diagnostics ? { diagnostics } : {}),
    }
  }
  return { code: 'MAILBOX_UNAVAILABLE', reason: 'Mailbox operation failed. Check database setup and mailbox connection, then retry.', status: 503 }
}

export function requireMailboxMutationRequest(request: Request) {
  // A custom header makes authenticated cross-origin form posts/preflightless
  // requests fail. This does not depend on reverse proxies preserving URL origins.
  const site = request.headers.get('sec-fetch-site')
  if (request.headers.get('x-mailbox-request') !== '1' || site === 'cross-site' || site === 'same-site') {
    throw new MailboxError('INVALID_REQUEST_ORIGIN', 'Submit mailbox changes from the administration page.', 403)
  }
}

type MailboxUserResolver = () => Promise<{ role?: string } | null | undefined>

export async function requireMailboxAdmin(resolveUser?: MailboxUserResolver) {
  // Keep auth lazy so isolated authorization tests never initialize the live
  // auth configuration or database. Production callers use the session resolver.
  const user = resolveUser ? await resolveUser() : await (await import('@/lib/auth-utils')).getCurrentUser()
  if (!user) throw new MailboxError('UNAUTHORIZED', 'Sign in to access the mailbox.', 401)
  if (user.role !== 'ADMIN') throw new MailboxError('FORBIDDEN', 'Administrator access is required.', 403)
  return user
}
