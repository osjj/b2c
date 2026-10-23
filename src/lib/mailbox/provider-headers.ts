import { MailboxError } from './errors'
import { isRfcMessageId } from './threading'

// Confirmed by SMTP2GO's field validation, including References values.
export const SMTP2GO_MAX_CUSTOM_HEADER_VALUE_LENGTH = 255

function requireProviderMessageId(value: string, header: 'Message-ID' | 'In-Reply-To') {
  if (!isRfcMessageId(value)) {
    throw new MailboxError('INVALID_THREAD_HEADER', 'The reply has an invalid conversation identifier.', 422)
  }
  if (value.length > SMTP2GO_MAX_CUSTOM_HEADER_VALUE_LENGTH) {
    throw new MailboxError('THREAD_HEADER_TOO_LONG', `SMTP2GO 的 ${header} 邮件头超过 255 字符，无法在保留完整邮件编号的情况下发送。`, 422)
  }
}

/** Compact transport metadata only; never mutate or truncate archived IDs. */
export function buildProviderReplyHeaders(messageId: string, inReplyTo: string, references: readonly string[]) {
  requireProviderMessageId(messageId, 'Message-ID')
  requireProviderMessageId(inReplyTo, 'In-Reply-To')
  const ancestors = [...new Set(references.filter(id => isRfcMessageId(id) && id !== inReplyTo))]
  const selected = new Set<string>()
  let length = inReplyTo.length
  function include(id: string) {
    if (selected.has(id) || length + 1 + id.length > SMTP2GO_MAX_CUSTOM_HEADER_VALUE_LENGTH) return
    selected.add(id)
    length += 1 + id.length
  }
  // Prefer the thread root, then the newest ancestors that fit as complete IDs.
  const root = ancestors[0]
  if (root) include(root)
  for (let index = ancestors.length - 1; index >= 0; index--) include(ancestors[index])
  const compact = [...ancestors.filter(id => selected.has(id)), inReplyTo].join(' ')
  return [
    { header: 'Message-ID', value: messageId },
    { header: 'In-Reply-To', value: inReplyTo },
    { header: 'References', value: compact },
  ]
}
