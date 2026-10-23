import { createHash, randomUUID } from 'node:crypto'

import MailComposer from 'nodemailer/lib/mail-composer'
import { simpleParser } from 'mailparser'
import { z } from 'zod'

import { MAX_RAW_MIME_BYTES } from './config'
import { MailboxError } from './errors'
import { buildProviderReplyHeaders } from './provider-headers'
import { extractProviderFailureDiagnostics, providerDiagnosticCode, providerFailureReason, readProviderFailureDiagnostics, safeProviderDiagnosticCode, type ProviderDiagnosticCode, type ProviderFailureDiagnostics } from './provider-diagnostics'
import { buildReplyBodies } from './reply-body'
import { readRichMailboxContent, type MailboxInlineImage } from './rich-content'
import { safeAttachmentFilename } from './mime'
import { buildReplyReferences, parseReplyRecipients, replySubject } from './threading'
import type { MailboxMessage } from './types'

export const MAX_REPLY_ATTACHMENT_BYTES = 25 * 1024 * 1024
export const MAX_REPLY_FORM_BYTES = MAX_REPLY_ATTACHMENT_BYTES + 1024 * 1024
const SEND_TIMEOUT_MS = 30000
const ATTEMPT_PENDING_MS = 90000
const replyFormSchema = z.object({
  parentId: z.string().min(1).max(128).regex(/^[a-zA-Z0-9_-]+$/),
  requestKey: z.uuid(), mode: z.enum(['reply', 'replyAll']),
  to: z.string().min(1).max(16000), cc: z.string().max(16000),
  text: z.string().trim().min(1).max(100000), includeQuote: z.enum(['true', 'false']),
})

type ReplyAttachment = { filename: string; contentType: string; buffer: Buffer }
export type ReplyInput = Omit<z.infer<typeof replyFormSchema>, 'includeQuote'> & { includeQuote: boolean; attachments: ReplyAttachment[] }
export type ReplyParent = MailboxMessage & { references: string[]; inReplyTo: string[]; rawMime?: Uint8Array | null }
export type PreparedReply = {
  account: string; parentId: string; requestKey: string; payloadHash: string;
  message: MailboxMessage; htmlBody: string; inlineImages: MailboxInlineImage[]; references: string[]; inReplyTo: string[]; rawMime: Buffer;
}
export type ReplyAttempt = {
  requestKey: string; account: string; parentId: string; payloadHash: string; status: string;
  outboundMessageId: string | null; providerRequestId: string | null; safeErrorCode: string | null; createdAt: Date;
  diagnostics?: ProviderFailureDiagnostics;
}
export interface ReplyRepository {
  getParent(account: string, id: string): Promise<ReplyParent | null>
  getAttempt(requestKey: string): Promise<ReplyAttempt | null>
  reserve(prepared: PreparedReply): Promise<{ created: boolean; attempt: ReplyAttempt }>
  getSentMessage(account: string, id: string): Promise<MailboxMessage | null>
  finish(prepared: PreparedReply, requestId?: string): Promise<MailboxMessage>
  markOutcome(requestKey: string, status: 'FAILED' | 'UNKNOWN', code: string, requestId?: string, diagnostics?: ProviderFailureDiagnostics): Promise<void>
}
export type ReplyConfig = { account: string | null; defaultSender: string; aliases: string[]; ownAddresses: string[]; apiKey: string | undefined }
export type ReplyDependencies = { repository: ReplyRepository; fetch?: typeof fetch; now?: () => Date }
export type ProviderOutcome = { state: 'accepted' | 'rejected' | 'unknown'; requestId?: string; errorCode?: ProviderDiagnosticCode; diagnostics?: ProviderFailureDiagnostics }

export async function readReplyForm(request: Request): Promise<FormData> {
  const contentType = request.headers.get('content-type') || ''
  if (!/^multipart\/form-data;/i.test(contentType) || !request.body) {
    throw new MailboxError('INVALID_REPLY', 'Submit the reply as a multipart form.')
  }
  if (Number(request.headers.get('content-length')) > MAX_REPLY_FORM_BYTES) {
    throw new MailboxError('REPLY_TOO_LARGE', 'The reply upload is too large.', 413)
  }
  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      total += value.byteLength
      if (total > MAX_REPLY_FORM_BYTES) {
        await reader.cancel()
        throw new MailboxError('REPLY_TOO_LARGE', 'The reply upload is too large.', 413)
      }
      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }
  const bytes = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength }
  try {
    return await new Response(bytes, { headers: { 'content-type': contentType } }).formData()
  } catch {
    throw new MailboxError('INVALID_REPLY', 'The reply upload could not be read.')
  }
}

export async function parseReplyForm(form: FormData): Promise<ReplyInput> {
  const parsed = replyFormSchema.safeParse({
    parentId: form.get('parentId'), requestKey: form.get('requestKey'), mode: form.get('mode'),
    to: form.get('to'), cc: form.get('cc') ?? '', text: form.get('text'), includeQuote: form.get('includeQuote'),
  })
  if (!parsed.success) throw new MailboxError('INVALID_REPLY', 'Check the reply, recipients and request identifier. A reply may contain up to 100,000 characters.')
  const values = form.getAll('attachments')
  if (values.some(value => typeof value === 'string') || values.length > 5) {
    throw new MailboxError('INVALID_ATTACHMENTS', 'Attach up to five files.')
  }
  const files = values.filter((value): value is File => typeof value !== 'string')
  if (files.reduce((total, file) => total + file.size, 0) > MAX_REPLY_ATTACHMENT_BYTES) {
    throw new MailboxError('ATTACHMENTS_TOO_LARGE', 'Attachments must total 25 MiB or less before encoding.', 413)
  }
  const attachments = await Promise.all(files.map(async file => ({
    filename: file.name.replace(/[\\/\x00-\x1f\x7f]/g, '_').trim().slice(0, 200) || 'attachment',
    contentType: /^[\w.+-]+\/[\w.+-]+$/.test(file.type) ? file.type : 'application/octet-stream',
    buffer: Buffer.from(await file.arrayBuffer()),
  })))
  return { ...parsed.data, includeQuote: parsed.data.includeQuote === 'true', attachments }
}

export async function prepareReply(input: ReplyInput, parent: ReplyParent, config: ReplyConfig, now: Date): Promise<PreparedReply> {
  if (!config.account || !z.email().safeParse(config.defaultSender).success || !config.aliases.includes(config.defaultSender)) {
    throw new MailboxError('INVALID_MAILBOX_CONFIG', 'Configure the mailbox account and an approved enterprise sender before replying.', 503)
  }
  const recipients = parseReplyRecipients(input.to, input.cc, config.ownAddresses)
  const headers = buildReplyReferences(parent)
  const messageId = `<${randomUUID()}@${config.defaultSender.split('@')[1]}>`
  const subject = replySubject(parent.subject)
  const richContent = input.includeQuote ? await readRichMailboxContent(parent.rawMime || null) : null
  const inlineImages = richContent?.inlineImages || []
  const { textBody, htmlBody } = buildReplyBodies(input, parent, { quotedHtml: richContent?.html })
  const message: MailboxMessage = {
    id: randomUUID(), threadKey: parent.threadKey, direction: 'OUTBOUND', messageId,
    from: { address: config.defaultSender }, replyTo: [], ...recipients, subject, textBody,
    sentAt: now.toISOString(), attachments: input.attachments.map((attachment, index) => ({
      index, filename: attachment.filename, contentType: attachment.contentType, size: attachment.buffer.length,
    })),
  }
  const rawMime = await new MailComposer({
    from: config.defaultSender, to: recipients.to, cc: recipients.cc, subject, text: textBody, html: htmlBody,
    date: now, messageId, inReplyTo: headers.inReplyTo, references: headers.references,
    attachments: [...input.attachments.map(attachment => ({
      filename: attachment.filename, contentType: attachment.contentType, content: attachment.buffer,
    })), ...inlineImages.map(image => ({ filename: image.filename, contentType: image.contentType, content: image.buffer, cid: image.cid, contentDisposition: 'inline' as const }))],
    disableFileAccess: true, disableUrlAccess: true,
  }).compile().build()
  if (rawMime.length > MAX_RAW_MIME_BYTES) {
    throw new MailboxError('MIME_TOO_LARGE', 'The encoded email exceeds 25 MiB. Reduce attachments to about 18 MiB or remove quoted history.', 413)
  }
  // Related inline images are serialized before ordinary attachments. Store the
  // parser's actual indexes so every private attachment download returns its file.
  if (inlineImages.length) {
    const archived = await simpleParser(rawMime, { skipHtmlToText: true, skipTextToHtml: true, skipImageLinks: true })
    message.attachments = archived.attachments.map((attachment, index) => ({
      index, filename: safeAttachmentFilename(attachment.filename || `attachment-${index + 1}`),
      contentType: attachment.contentType, size: attachment.size,
    }))
  }
  const payloadHash = createHash('sha256').update(JSON.stringify({
    account: config.account, parentId: input.parentId, mode: input.mode,
    sender: config.defaultSender, ...recipients, text: input.text, includeQuote: input.includeQuote,
    attachments: input.attachments.map(attachment => ({
      filename: attachment.filename, contentType: attachment.contentType,
      hash: createHash('sha256').update(attachment.buffer).digest('hex'),
    })),
  })).digest('hex')
  return {
    account: config.account, parentId: input.parentId, requestKey: input.requestKey, payloadHash,
    message, htmlBody, inlineImages, references: headers.references, inReplyTo: [headers.inReplyTo], rawMime,
  }
}

const providerPayloadSchema = z.object({
  request_id: z.string().max(200).optional(), error: z.unknown().optional(), error_code: z.unknown().optional(),
  field_validation_errors: z.unknown().optional(),
  data: z.object({
    failed: z.number().int().nonnegative().optional(), succeeded: z.number().int().nonnegative().optional(),
    failures: z.array(z.unknown()).optional(), error: z.unknown().optional(), error_code: z.unknown().optional(),
    field_validation_errors: z.unknown().optional(),
  }).optional(),
})

export function classifyProviderResponse(status: number, raw: unknown): ProviderOutcome {
  const parsed = providerPayloadSchema.safeParse(raw)
  if (!parsed.success) return { state: 'unknown' }
  const { data, request_id: rawRequestId } = parsed.data
  const requestId = rawRequestId && /^[\w.-]+$/.test(rawRequestId) ? rawRequestId : undefined
  // Server errors can occur after acceptance. Even a failure-shaped body does
  // not prove non-delivery, so it must never unlock a new send attempt.
  if (status >= 500) return { state: 'unknown', requestId }
  const error = Boolean(parsed.data.error || parsed.data.error_code || data?.error || data?.error_code)
  const hasFailures = (data?.failures?.length || 0) > 0 || (data?.failed || 0) > 0
  // SMTP2GO standard email endpoint counts multiple recipients as ONE email.
  // Require the synchronous acceptance tuple; HTTP 200 alone is insufficient.
  if (status >= 200 && status < 300 && !error && data?.succeeded === 1 && data.failed === 0 && !data.failures?.length) {
    return { state: 'accepted', requestId }
  }
  if ((data?.succeeded || 0) > 0) return { state: 'unknown', requestId }
  if ((data?.succeeded === 0 && (hasFailures || error)) || (error && status >= 400 && status < 500)) {
    return {
      state: 'rejected', requestId, errorCode: providerDiagnosticCode(parsed.data, status),
      diagnostics: extractProviderFailureDiagnostics(parsed.data, status),
    }
  }
  // 5xx, malformed or contradictory results may follow acceptance. Never resend.
  return { state: 'unknown', requestId }
}

async function submitReply(prepared: PreparedReply, attachments: ReplyAttachment[], apiKey: string, fetcher: typeof fetch, providerHeaders: ReturnType<typeof buildProviderReplyHeaders>): Promise<ProviderOutcome> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS)
  try {
    // Use the same standard-send permission as the existing admin composer.
    // The locally built MIME is a private archive, not the provider's wire MIME.
    const response = await fetcher('https://api.smtp2go.com/v3/email/send', {
      method: 'POST', headers: { 'Content-Type': 'application/json', accept: 'application/json', 'X-Smtp2go-Api-Key': apiKey },
      body: JSON.stringify({
        sender: prepared.message.from.address,
        to: prepared.message.to.map(recipient => recipient.address),
        cc: prepared.message.cc.map(recipient => recipient.address),
        subject: prepared.message.subject,
        text_body: prepared.message.textBody,
        html_body: prepared.htmlBody,
        custom_headers: providerHeaders,
        attachments: attachments.map(attachment => ({
          filename: attachment.filename, mimetype: attachment.contentType, fileblob: attachment.buffer.toString('base64'),
        })),
        inlines: prepared.inlineImages.map(image => ({ filename: image.cid, mimetype: image.contentType, fileblob: image.buffer.toString('base64') })),
        fastaccept: false,
      }),
      signal: controller.signal, cache: 'no-store', redirect: 'error',
    })
    return classifyProviderResponse(response.status, await response.json())
  } catch {
    // A failed request/read does not prove the provider did not accept the email.
    return { state: 'unknown' }
  } finally {
    clearTimeout(timeout)
  }
}

function unknownDelivery() {
  return new MailboxError('DELIVERY_UNKNOWN', 'Delivery could not be confirmed. Do not send again. Check the conversation and SMTP2GO activity using this request identifier.', 502)
}

async function resolvePreviousAttempt(attempt: ReplyAttempt, prepared: PreparedReply, repository: ReplyRepository, now: Date) {
  if (attempt.account !== prepared.account || attempt.parentId !== prepared.parentId || attempt.payloadHash !== prepared.payloadHash) {
    throw new MailboxError('REQUEST_KEY_CONFLICT', 'This request identifier belongs to a different reply. Check the previous send before starting another.', 409)
  }
  if (attempt.status === 'SENT' && attempt.outboundMessageId) {
    const message = await repository.getSentMessage(prepared.account, attempt.outboundMessageId)
    if (!message) throw unknownDelivery()
    return { message, requestId: attempt.providerRequestId || undefined }
  }
  if (attempt.status === 'FAILED') {
    throw new MailboxError('SEND_ALREADY_FAILED', providerFailureReason(attempt.safeErrorCode), 409, {
      requestId: attempt.providerRequestId || undefined, diagnostics: readProviderFailureDiagnostics(attempt.diagnostics),
    })
  }
  if (attempt.status === 'UNKNOWN' || now.getTime() - attempt.createdAt.getTime() > ATTEMPT_PENDING_MS) throw unknownDelivery()
  throw new MailboxError('SEND_IN_PROGRESS', 'This reply is already being processed. Check its status before sending again.', 409)
}

export async function sendMailboxReply(input: ReplyInput, config: ReplyConfig, dependencies: ReplyDependencies) {
  const { repository } = dependencies
  if (!config.account || !config.apiKey) throw new MailboxError('MAILBOX_NOT_CONFIGURED', 'Configure the mailbox account and SMTP2GO before replying.', 503)
  const parent = await repository.getParent(config.account, input.parentId)
  if (!parent) throw new MailboxError('PARENT_NOT_FOUND', 'The original email was not found in this mailbox.', 404)
  const now = dependencies.now?.() || new Date()
  const prepared = await prepareReply(input, parent, config, now)
  // Resolve durable outcomes before new transport preflight rules. An old
  // UNKNOWN/SENT attempt must never turn into an editable/retryable input error.
  const previous = await repository.getAttempt(input.requestKey)
  if (previous) return resolvePreviousAttempt(previous, prepared, repository, now)
  const providerHeaders = buildProviderReplyHeaders(prepared.message.messageId || '', prepared.inReplyTo[0], prepared.references)
  // Reserve the identity and private MIME archive before the only external send.
  const reservation = await repository.reserve(prepared)
  if (!reservation.created) return resolvePreviousAttempt(reservation.attempt, prepared, repository, now)
  const outcome = await submitReply(prepared, input.attachments, config.apiKey, dependencies.fetch || fetch, providerHeaders)
  if (outcome.state === 'accepted') {
    try {
      const message = await repository.finish(prepared, outcome.requestId)
      return { message, requestId: outcome.requestId }
    } catch {
      // The durable MIME remains available in the attempt for manual reconciliation.
      await retainUnknown(repository, input.requestKey, outcome.requestId)
      throw unknownDelivery()
    }
  }
  if (outcome.state === 'rejected') {
    try {
      await repository.markOutcome(input.requestKey, 'FAILED', outcome.errorCode || 'PROVIDER_REJECTED', outcome.requestId, outcome.diagnostics)
    } catch {
      throw unknownDelivery()
    }
    throw new MailboxError('PROVIDER_REJECTED', providerFailureReason(outcome.errorCode), 502, {
      requestId: outcome.requestId, diagnostics: outcome.diagnostics,
    })
  }
  await retainUnknown(repository, input.requestKey, outcome.requestId)
  throw unknownDelivery()
}

async function retainUnknown(repository: ReplyRepository, requestKey: string, requestId?: string) {
  try {
    await repository.markOutcome(requestKey, 'UNKNOWN', 'DELIVERY_UNKNOWN', requestId)
  } catch {
    // A DB outage leaves SENDING reserved; replay/status treats it as non-retryable.
    throw unknownDelivery()
  }
}

export async function getReplyAttemptStatus(requestKey: string, account: string, repository: ReplyRepository, now = new Date()) {
  if (!z.uuid().safeParse(requestKey).success) throw new MailboxError('INVALID_REQUEST_KEY', 'A valid request identifier is required.')
  const attempt = await repository.getAttempt(requestKey)
  if (!attempt || attempt.account !== account) throw new MailboxError('ATTEMPT_NOT_FOUND', 'This reply attempt was not found. Do not retry automatically.', 404)
  const requestId = attempt.providerRequestId || undefined
  if (attempt.status === 'SENT' && attempt.outboundMessageId) {
    const message = await repository.getSentMessage(account, attempt.outboundMessageId)
    if (message) return { status: 'SENT' as const, message, requestId }
  }
  if (attempt.status === 'FAILED') return {
    status: 'FAILED' as const, requestId,
    errorCode: safeProviderDiagnosticCode(attempt.safeErrorCode),
    reason: providerFailureReason(attempt.safeErrorCode),
    diagnostics: readProviderFailureDiagnostics(attempt.diagnostics),
  }
  if (attempt.status === 'UNKNOWN' || attempt.status === 'SENT' || now.getTime() - attempt.createdAt.getTime() > ATTEMPT_PENDING_MS) {
    return { status: 'UNKNOWN' as const, requestId }
  }
  return { status: 'PENDING' as const, requestId }
}
