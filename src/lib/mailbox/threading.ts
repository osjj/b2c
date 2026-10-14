import { z } from 'zod'

import { MailboxError } from './errors'
import type { MailboxAddress, MailboxMessage } from './types'

export const MAX_REPLY_RECIPIENTS = 50
const addressSchema = z.email()

export function isRfcMessageId(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 998 && /^<[^\s<>@\x00-\x1f\x7f]+@[^\s<>@\x00-\x1f\x7f]+>$/.test(value)
}

export function isSrsAddress(address: string) {
  return /^srs[01][=+\-]/i.test(address)
}

export function buildReplyReferences(parent: { messageId: string | null; references: string[]; inReplyTo: string[] }) {
  if (!isRfcMessageId(parent.messageId)) {
    throw new MailboxError('PARENT_MESSAGE_ID_MISSING', 'This email has no valid original Message-ID and cannot be safely replied to.', 422)
  }
  // RFC 5322 3.6.4: use the parent's References, or its single In-Reply-To.
  const previous = parent.references.length ? parent.references : parent.inReplyTo.length === 1 ? parent.inReplyTo : []
  const references = [...new Set(previous.filter(isRfcMessageId).filter(value => value !== parent.messageId))]
  // Bound hostile headers while retaining the original thread root and latest links.
  const bounded = references.length > 49 ? [references[0], ...references.slice(-48)] : references
  return { inReplyTo: parent.messageId, references: [...bounded, parent.messageId] }
}

export function replySubject(subject: string) {
  const safe = subject.replace(/[\x00-\x1f\x7f]/g, ' ').trim().slice(0, 4000)
  return /^re\s*:/i.test(safe) ? safe : `Re: ${safe || '(no subject)'}`
}

export function defaultReplyRecipients(
  parent: Pick<MailboxMessage, 'direction' | 'from' | 'replyTo' | 'to' | 'cc'>,
  ownAddresses: string[],
  mode: 'reply' | 'replyAll',
) {
  const seen = new Set(ownAddresses.map(value => value.toLowerCase()))
  const distinct = (values: MailboxAddress[]) => values.filter(value => {
    const address = value.address.toLowerCase()
    if (seen.has(address) || isSrsAddress(address) || !addressSchema.safeParse(address).success) return false
    seen.add(address)
    return true
  })
  const targets = parent.direction === 'OUTBOUND' ? parent.to : parent.replyTo.length ? parent.replyTo : [parent.from]
  const to = distinct(targets)
  if (mode === 'replyAll') to.push(...distinct(parent.to))
  const cc = mode === 'replyAll' ? distinct(parent.cc) : []
  return { to, cc }
}

export function parseReplyRecipients(toInput: string, ccInput: string, ownAddresses: string[]) {
  const own = new Set(ownAddresses.map(value => value.toLowerCase()))
  const seen = new Set<string>()
  const parse = (input: string): MailboxAddress[] => {
    if (input.length > 16000 || /[\x00-\x1f\x7f]/.test(input)) {
      throw new MailboxError('INVALID_RECIPIENTS', 'Use comma-separated email addresses without line breaks.')
    }
    return input.split(/[,;]+/).map(value => value.trim().toLowerCase()).filter(Boolean).flatMap(address => {
      if (!addressSchema.safeParse(address).success || isSrsAddress(address)) {
        throw new MailboxError('INVALID_RECIPIENTS', 'A recipient address is invalid or is a forwarding-only SRS address.')
      }
      if (own.has(address)) throw new MailboxError('OWN_ADDRESS_RECIPIENT', 'Remove your own mailbox and business aliases from the reply recipients.')
      if (seen.has(address)) return []
      seen.add(address)
      return [{ address }]
    })
  }
  const to = parse(toInput)
  const cc = parse(ccInput)
  if (!to.length || seen.size > MAX_REPLY_RECIPIENTS) {
    throw new MailboxError('INVALID_RECIPIENTS', `Include at least one To address and at most ${MAX_REPLY_RECIPIENTS} total recipients.`)
  }
  return { to, cc }
}
