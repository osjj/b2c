import { z } from 'zod'
import { MailboxError } from './errors'

const email = z.email()
export const MAX_RAW_MIME_BYTES = 25 * 1024 * 1024

export function parseHistoryDate(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new MailboxError('INVALID_HISTORY_DATE', 'History date must use YYYY-MM-DD.')
  const result = new Date(`${value}T00:00:00.000Z`)
  if (!Number.isFinite(result.getTime()) || result.toISOString().slice(0, 10) !== value || result > new Date()) {
    throw new MailboxError('INVALID_HISTORY_DATE', 'History date must be a valid date on or before today.')
  }
  return result
}

export function getMailboxConfig(env: Record<string, string | undefined> = process.env) {
  const user = env.MAILBOX_IMAP_USER?.trim().toLowerCase() || ''
  const password = env.MAILBOX_IMAP_PASSWORD || ''
  const defaultSender = (env.SMTP2GO_DEFAULT_SENDER || 'sales@laifappe.com').trim().toLowerCase()
  const aliases = [...new Set((env.MAILBOX_ALIASES || defaultSender).split(',').map(value => value.trim().toLowerCase()).filter(Boolean))]
  if (!email.safeParse(defaultSender).success || !aliases.length || aliases.some(value => !email.safeParse(value).success) || (user && !email.safeParse(user).success)) {
    throw new MailboxError('INVALID_MAILBOX_CONFIG', 'Mailbox login, sender and business aliases must be valid email addresses.', 503)
  }
  if (!aliases.includes(defaultSender)) throw new MailboxError('INVALID_MAILBOX_CONFIG', 'The default sender must be one of the approved business aliases.', 503)
  const host = (env.MAILBOX_IMAP_HOST || 'imap.qq.com').trim()
  const port = Number(env.MAILBOX_IMAP_PORT || '993')
  if (!/^[a-z0-9.-]+$/i.test(host) || !Number.isInteger(port) || port < 1 || port > 65535) {
    throw new MailboxError('INVALID_MAILBOX_CONFIG', 'IMAP host or TLS port is invalid.', 503)
  }
  const folders = env.MAILBOX_IMAP_FOLDERS?.split(',').map(value => value.trim()).filter(Boolean) || null
  if (folders && (folders.length > 10 || folders.some(value => value.length > 255 || /[\r\n\0]/.test(value)))) {
    throw new MailboxError('INVALID_MAILBOX_CONFIG', 'IMAP folder configuration is invalid.', 503)
  }
  const since = env.MAILBOX_SYNC_SINCE ? parseHistoryDate(env.MAILBOX_SYNC_SINCE) : new Date(Date.now() - 90 * 86400000)
  since.setUTCHours(0, 0, 0, 0)
  return {
    account: user || null, aliases, ownAddresses: [...new Set([...aliases, ...(user ? [user] : [])])], defaultSender,
    smtpConfigured: Boolean(env.SMTP2GO_API_KEY), configured: Boolean(user && password),
    imap: user && password ? { host, port, user, password } : null, since, folders,
  }
}
export type MailboxConfig = ReturnType<typeof getMailboxConfig>
