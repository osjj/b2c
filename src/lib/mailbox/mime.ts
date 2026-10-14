import { createHash } from 'node:crypto'
import { simpleParser, type AddressObject, type ParsedMail } from 'mailparser'
import { MAX_RAW_MIME_BYTES } from './config'
import { MailboxError } from './errors'
import { mailboxAddressSchema, type MailboxAddress } from './types'

export function extractMessageIds(value: string | string[] | undefined): string[] {
  const joined = Array.isArray(value) ? value.join(' ') : value || ''
  return [...new Set((joined.match(/<[^<>\s\x00-\x1f\x7f]+@[^<>\s\x00-\x1f\x7f]+>/g) || []).filter(item => item.length <= 998))].slice(-100)
}

export function computeDedupeKey(messageId: string | null, raw: Buffer): string {
  return `${messageId ? 'id' : 'mime'}:${createHash('sha256').update(messageId || raw).digest('hex')}`
}

function addresses(value?: AddressObject | AddressObject[]): MailboxAddress[] {
  return (Array.isArray(value) ? value : value ? [value] : []).flatMap(item => item.value).flatMap(item => {
    const address = item.address?.trim().toLowerCase()
    if (!address || /[\r\n\0]/.test(address)) return []
    const parsed = mailboxAddressSchema.safeParse({ address, ...(item.name ? { name: item.name.replace(/\0/g, '').slice(0, 500) } : {}) })
    return parsed.success ? [parsed.data] : []
  })
}

export function metadataFromParsed(mail: ParsedMail) {
  const messageId = extractMessageIds(mail.messageId)[0] || null
  const references = extractMessageIds(mail.references)
  const inReplyTo = extractMessageIds(mail.inReplyTo)
  const deliveredTo = mail.headerLines.filter(item => ['delivered-to', 'x-original-to', 'envelope-to'].includes(item.key.toLowerCase()))
    .flatMap(item => (item.line.match(/[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9.-]+/gi) || []).map(value => value.toLowerCase()))
  return {
    messageId, references, inReplyTo, from: addresses(mail.from)[0] || { address: '' },
    replyTo: addresses(mail.replyTo), to: addresses(mail.to), cc: addresses(mail.cc), deliveredTo,
    subject: (mail.subject || '(No subject)').replace(/[\r\n\0]/g, ' ').slice(0, 2000),
  }
}

export function isBusinessMessage(metadata: ReturnType<typeof metadataFromParsed>, aliases: string[]): boolean {
  const approved = new Set(aliases.map(value => value.toLowerCase()))
  return [metadata.from.address, ...metadata.to.map(item => item.address), ...metadata.cc.map(item => item.address), ...metadata.deliveredTo]
    .some(address => approved.has(address.toLowerCase()))
}

export function isScopedMailboxMessage(metadata: ReturnType<typeof metadataFromParsed>, aliases: string[], knownReferenceIds: Set<string>): boolean {
  return isBusinessMessage(metadata, aliases) || [...(metadata.messageId ? [metadata.messageId] : []), ...metadata.references, ...metadata.inReplyTo].some(reference => knownReferenceIds.has(reference))
}

export async function parseMailboxHeaders(raw: Buffer) {
  return metadataFromParsed(await simpleParser(raw, { skipHtmlToText: true, skipTextToHtml: true, skipImageLinks: true }))
}

export async function parseMailboxMime(raw: Buffer, fallbackDate = new Date()) {
  if (raw.length > MAX_RAW_MIME_BYTES) throw new MailboxError('MESSAGE_TOO_LARGE', 'A relevant message exceeds the 25 MiB import limit. The scan has stopped before this message.', 413)
  let mail: ParsedMail
  try { mail = await simpleParser(raw, { skipTextToHtml: true, skipImageLinks: true }) }
  catch { throw new MailboxError('INVALID_MIME', 'A relevant message could not be parsed. The scan has stopped before this message.', 422) }
  const metadata = metadataFromParsed(mail)
  if (!metadata.from.address) throw new MailboxError('INVALID_MIME', 'A relevant message has no usable sender. The scan has stopped before this message.', 422)
  return {
    ...metadata,
    dedupeKey: computeDedupeKey(metadata.messageId, raw),
    // PostgreSQL text cannot store NUL; original unmodified MIME stays preserved in Bytes.
    textBody: (mail.text || '').replace(/\0/g, ''),
    sentAt: mail.date && Number.isFinite(mail.date.getTime()) ? mail.date : fallbackDate,
    attachments: mail.attachments.map((attachment, index) => ({
      index, filename: safeAttachmentFilename(attachment.filename || `attachment-${index + 1}`),
      contentType: attachment.contentType || 'application/octet-stream', size: attachment.size,
    })),
    rawMime: raw,
  }
}

export function safeAttachmentFilename(value: string): string {
  return value.replace(/[\r\n\0/\\]/g, '_').slice(0, 200) || 'attachment'
}

export type ParsedMailboxMessage = Awaited<ReturnType<typeof parseMailboxMime>>
