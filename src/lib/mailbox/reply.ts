import { createHash, randomUUID } from 'node:crypto'

import MailComposer from 'nodemailer/lib/mail-composer'
import { z } from 'zod'

import { MAX_RAW_MIME_BYTES } from './config'
import { MailboxError } from './errors'
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
export type ReplyParent = MailboxMessage & { references: string[]; inReplyTo: string[] }
export type PreparedReply = {
  account: string; parentId: string; requestKey: string; payloadHash: string;
  message: MailboxMessage; references: string[]; inReplyTo: string[]; rawMime: Buffer;
}
export type ReplyAttempt = {
  requestKey: string; account: string; parentId: string; payloadHash: string; status: string;
  outboundMessageId: string | null; providerRequestId: string | null; createdAt: Date;
}
export interface ReplyRepository {
  getParent(account: string, id: string): Promise<ReplyParent | null>
  getAttempt(requestKey: string): Promise<ReplyAttempt | null>
  reserve(prepared: PreparedReply): Promise<{ created: boolean; attempt: ReplyAttempt }>
  getSentMessage(account: string, id: string): Promise<MailboxMessage | null>
  finish(prepared: PreparedReply, requestId?: string): Promise<MailboxMessage>
  markOutcome(requestKey: string, status: 'FAILED' | 'UNKNOWN', code: string, requestId?: string): Promise<void>
}
export type ReplyConfig = { account: string | null; defaultSender: string; aliases: string[]; ownAddresses: string[]; apiKey: string | undefined }
export type ReplyDependencies = { repository: ReplyRepository; fetch?: typeof fetch; now?: () => Date }
export type ProviderOutcome = { state: 'accepted' | 'rejected' | 'unknown'; requestId?: string }

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

function quotedBody(input: ReplyInput, parent: ReplyParent) {
  if (!input.includeQuote) return input.text
  const safeName = (parent.from.name || parent.from.address).replace(/[\x00-\x1f\x7f]/g, ' ')
  const original = parent.textBody.slice(0, 200000)
  const quoted = original.split(/\r?\n/).map(line => `> ${line}`).join('\n')
  const truncated = original.length < parent.textBody.length ? '\n> [Earlier quoted content omitted due to size.]' : ''
  return `${input.text}\n\nOn ${new Date(parent.sentAt).toISOString()}, ${safeName} <${parent.from.address}> wrote:\n${quoted}${truncated}`
}

export async function prepareReply(input: ReplyInput, parent: ReplyParent, config: ReplyConfig, now: Date): Promise<PreparedReply> {
  if (!config.account || !z.email().safeParse(config.defaultSender).success || !config.aliases.includes(config.defaultSender)) {
    throw new MailboxError('INVALID_MAILBOX_CONFIG', 'Configure the mailbox account and an approved enterprise sender before replying.', 503)
  }
  const recipients = parseReplyRecipients(input.to, input.cc, config.ownAddresses)
  const headers = buildReplyReferences(parent)
  const messageId = `<${randomUUID()}@${config.defaultSender.split('@')[1]}>`
  const subject = replySubject(parent.subject)
  const textBody = quotedBody(input, parent)
  const message: MailboxMessage = {
    id: randomUUID(), threadKey: parent.threadKey, direction: 'OUTBOUND', messageId,
    from: { address: config.defaultSender }, replyTo: [], ...recipients, subject, textBody,
    sentAt: now.toISOString(), attachments: input.attachments.map((attachment, index) => ({
      index, filename: attachment.filename, contentType: attachment.contentType, size: attachment.buffer.length,
    })),
  }
  const rawMime = await new MailComposer({
    from: config.defaultSender, to: recipients.to, cc: recipients.cc, subject, text: textBody,
    date: now, messageId, inReplyTo: headers.inReplyTo, references: headers.references,
    attachments: input.attachments.map(attachment => ({
      filename: attachment.filename, contentType: attachment.contentType, content: attachment.buffer,
    })),
    disableFileAccess: true, disableUrlAccess: true,
  }).compile().build()
  if (rawMime.length > MAX_RAW_MIME_BYTES) {
    throw new MailboxError('MIME_TOO_LARGE', 'The encoded email exceeds 25 MiB. Reduce attachments to about 18 MiB or remove quoted history.', 413)
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
    message, references: headers.references, inReplyTo: [headers.inReplyTo], rawMime,
  }
}

const providerPayloadSchema = z.object({
  request_id: z.string().max(200).optional(), error: z.unknown().optional(), error_code: z.unknown().optional(),
  data: z.object({
    failed: z.number().int().nonnegative().optional(), succeeded: z.number().int().nonnegative().optional(),
    failures: z.array(z.unknown()).optional(), error: z.unknown().optional(), error_code: z.unknown().optional(),
  }).optional(),
})

export function classifyProviderResponse(status: number, raw: unknown): ProviderOutcome {
  const parsed = providerPayloadSchema.safeParse(raw)
  if (!parsed.success) return { state: 'unknown' }
  const { data, request_id: rawRequestId } = parsed.data
  const requestId = rawRequestId && /^[\w.-]+$/.test(rawRequestId) ? rawRequestId : undefined
  const error = Boolean(parsed.data.error || parsed.data.error_code || data?.error || data?.error_code)
  const hasFailures = (data?.failures?.length || 0) > 0 || (data?.failed || 0) > 0
  // SMTP2GO MIME endpoint counts an email with multiple recipients as ONE email.
  // Require the synchronous acceptance tuple; HTTP 200 alone is insufficient.
  if (status >= 200 && status < 300 && !error && data?.succeeded === 1 && data.failed === 0 && !data.failures?.length) {
    return { state: 'accepted', requestId }
  }
  if ((data?.succeeded || 0) > 0) return { state: 'unknown', requestId }
  if (data?.succeeded === 0 && (hasFailures || error)) return { state: 'rejected', requestId }
  if (error && status >= 400 && status < 500) return { state: 'rejected', requestId }
  // 5xx, malformed or contradictory results may follow acceptance. Never resend.
  return { state: 'unknown', requestId }
}

async function submitMime(rawMime: Buffer, apiKey: string, fetcher: typeof fetch): Promise<ProviderOutcome> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS)
  try {
    const response = await fetcher('https://api.smtp2go.com/v3/email/mime', {
      method: 'POST', headers: { 'Content-Type': 'application/json', accept: 'application/json', 'X-Smtp2go-Api-Key': apiKey },
      body: JSON.stringify({ mime_email: rawMime.toString('base64'), fastaccept: false }),
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
    throw new MailboxError('SEND_ALREADY_FAILED', 'This send was rejected. Review the recipients and start a new reply attempt only after confirming the failure.', 409)
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
  // Reserve both the identity and exact MIME durably before the only external send.
  const reservation = await repository.reserve(prepared)
  if (!reservation.created) return resolvePreviousAttempt(reservation.attempt, prepared, repository, now)
  const outcome = await submitMime(prepared.rawMime, config.apiKey, dependencies.fetch || fetch)
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
      await repository.markOutcome(input.requestKey, 'FAILED', 'PROVIDER_REJECTED', outcome.requestId)
    } catch {
      throw unknownDelivery()
    }
    throw new MailboxError('PROVIDER_REJECTED', 'The mail provider rejected this reply. Check the sender configuration and recipients before creating a new attempt.', 502)
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
  if (attempt.status === 'FAILED') return { status: 'FAILED' as const, requestId }
  if (attempt.status === 'UNKNOWN' || attempt.status === 'SENT' || now.getTime() - attempt.createdAt.getTime() > ATTEMPT_PENDING_MS) {
    return { status: 'UNKNOWN' as const, requestId }
  }
  return { status: 'PENDING' as const, requestId }
}
