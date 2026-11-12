import { createHash, randomUUID } from 'node:crypto'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

export const QUOTE_EMAIL_REQUEST_PREFIX = 'quote_email_request.'
const LEASE_MS = 5 * 60_000

const entrySchema = z.object({
  sender: z.string().min(1).max(320),
  recipient: z.string().min(1).max(320),
  subject: z.string().min(1).max(600),
  customerEmail: z.string().min(1).max(100),
  phone: z.string().max(150),
  name: z.string().max(100),
  companyName: z.string().max(200),
  source: z.string().max(80),
  entryPage: z.string().max(1000),
  referrer: z.string().max(1000),
  message: z.string().min(1).max(6000),
  textBody: z.string().max(20_000),
  htmlBody: z.string().max(60_000),
  submissionFingerprint: z.string().regex(/^[a-f0-9]{64}$/).optional(),
})

export const quoteEmailRecordSchema = entrySchema.omit({ submissionFingerprint: true }).extend({
  id: z.uuid(),
  createdAt: z.iso.datetime(),
  fingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  notificationStatus: z.enum(['pending', 'sending', 'sent', 'failed']),
  attempts: z.number().int().nonnegative(),
  totalAttempts: z.number().int().nonnegative(),
  nextAttemptAt: z.iso.datetime().nullable(),
  lastAttemptAt: z.iso.datetime().nullable(),
  sentAt: z.iso.datetime().nullable(),
  lastError: z.string().max(100).nullable(),
  leaseToken: z.uuid().nullable(),
  leaseUntil: z.iso.datetime().nullable(),
  requestId: z.string().max(200).optional(),
})

export type QuoteEmailEntry = z.infer<typeof entrySchema>
export type QuoteEmailRecord = z.infer<typeof quoteEmailRecordSchema>
export type QuoteEmailDeliveryResult = { id: string; status: 'sent' | 'pending' | 'failed' | 'skipped'; requestId?: string }

export class QuoteEmailConflictError extends Error {
  constructor() { super('This submission identifier belongs to a different inquiry.'); this.name = 'QuoteEmailConflictError' }
}

export class QuoteEmailRecordError extends Error {
  constructor() { super('The saved inquiry or notification state could not be read or updated.'); this.name = 'QuoteEmailRecordError' }
}

function requestKey(id: string) {
  return `${QUOTE_EMAIL_REQUEST_PREFIX}${z.uuid().parse(id)}`
}

export function parseQuoteEmailRecord(value: unknown): QuoteEmailRecord {
  const parsed = quoteEmailRecordSchema.safeParse(value)
  if (!parsed.success) throw new QuoteEmailRecordError()
  return parsed.data
}

function fingerprint(entry: QuoteEmailEntry) {
  return entry.submissionFingerprint ?? createHash('sha256').update(JSON.stringify({
    customerEmail: entry.customerEmail, phone: entry.phone, name: entry.name,
    companyName: entry.companyName, source: entry.source, entryPage: entry.entryPage,
    referrer: entry.referrer, message: entry.message,
  })).digest('hex')
}

/** Only persistence happens here; notification must not precede this awaited commit. */
export async function enqueueQuoteEmail(input: QuoteEmailEntry, submissionId?: string): Promise<QuoteEmailRecord> {
  const entry = entrySchema.parse(input)
  const id = submissionId ? z.uuid().parse(submissionId) : randomUUID()
  const key = requestKey(id)
  const digest = fingerprint(entry)
  const existing = await prisma.setting.findUnique({ where: { key }, select: { value: true } })
  if (existing) {
    const record = parseQuoteEmailRecord(existing.value)
    if (record.fingerprint !== digest) throw new QuoteEmailConflictError()
    return record
  }
  const createdAt = new Date(Date.now()).toISOString()
  const content = entrySchema.omit({ submissionFingerprint: true }).parse(entry)
  const record = quoteEmailRecordSchema.parse({
    ...content, id, createdAt, fingerprint: digest,
    notificationStatus: 'pending', attempts: 0, totalAttempts: 0,
    nextAttemptAt: null, lastAttemptAt: null, sentAt: null, lastError: null,
    leaseToken: null, leaseUntil: null,
  })
  try {
    await prisma.setting.create({ data: { key, value: record, createdAt: new Date(createdAt) } })
    return record
  } catch (error) {
    // Concurrent replay can race CREATE; never replace the winning payload.
    if (!error || typeof error !== 'object' || !('code' in error) || error.code !== 'P2002') throw error
    const winner = await prisma.setting.findUnique({ where: { key }, select: { value: true } })
    if (!winner) throw new QuoteEmailRecordError()
    const saved = parseQuoteEmailRecord(winner.value)
    if (saved.fingerprint !== digest) throw new QuoteEmailConflictError()
    return saved
  }
}

async function compareAndSet(previous: QuoteEmailRecord, next: QuoteEmailRecord) {
  const result = await prisma.setting.updateMany({
    where: { key: requestKey(previous.id), value: { equals: previous } },
    data: { value: next },
  })
  return result.count === 1
}

const providerSchema = z.object({
  request_id: z.string().max(200).optional(),
  error: z.unknown().optional(),
  data: z.object({
    succeeded: z.number().int().nonnegative(),
    failed: z.number().int().nonnegative(),
    email_id: z.string().max(200).optional(),
    error: z.unknown().optional(),
  }),
})

type SendResult = { success: true; requestId?: string } | { success: false; code: string }

async function sendNotification(record: QuoteEmailRecord): Promise<SendResult> {
  const apiKey = process.env.SMTP2GO_API_KEY
  if (!apiKey) return { success: false, code: 'MAIL_CONFIGURATION_MISSING' }
  try {
    const response = await fetch('https://api.smtp2go.com/v3/email/send', {
      method: 'POST',
      headers: { accept: 'application/json', 'Content-Type': 'application/json', 'X-Smtp2go-Api-Key': apiKey },
      body: JSON.stringify({
        sender: record.sender, to: [record.recipient],
        subject: `${record.subject} [RFQ ${record.id}]`,
        text_body: `Inquiry ID: ${record.id}\n\n${record.textBody}`,
        html_body: `<p>Inquiry ID: ${record.id}</p>${record.htmlBody}`,
      }),
      signal: AbortSignal.timeout(20_000),
      cache: 'no-store',
    })
    if (!response.ok) return { success: false, code: 'MAIL_HTTP_ERROR' }
    const payload = providerSchema.safeParse(await response.json().catch(() => null))
    if (!payload.success) return { success: false, code: 'MAIL_INVALID_RESPONSE' }
    if (payload.data.error || payload.data.data.error || payload.data.data.succeeded !== 1 || payload.data.data.failed !== 0) {
      return { success: false, code: 'MAIL_PROVIDER_REJECTED' }
    }
    return { success: true, requestId: payload.data.request_id || payload.data.data.email_id }
  } catch (error) {
    const timeout = error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')
    return { success: false, code: timeout ? 'MAIL_TIMEOUT' : 'MAIL_NETWORK_ERROR' }
  }
}

/** A persisted CAS lease protects concurrent initial/manual notification attempts. */
export async function deliverQuoteEmail(id: string, options: { force?: boolean } = {}): Promise<QuoteEmailDeliveryResult> {
  const row = await prisma.setting.findUnique({ where: { key: requestKey(id) }, select: { value: true } })
  if (!row) throw new QuoteEmailRecordError()
  const saved = parseQuoteEmailRecord(row.value)
  const now = Date.now()
  const skipped = { id, status: 'skipped' as const, ...(saved.requestId ? { requestId: saved.requestId } : {}) }
  if (saved.notificationStatus === 'sent') return skipped
  if (saved.notificationStatus === 'sending' && saved.leaseUntil && Date.parse(saved.leaseUntil) > now) return skipped
  // Customer replays only repeat the acknowledgement. After the first claim,
  // another notification attempt requires the authorized ADMIN manual action.
  if (!options.force && (saved.notificationStatus !== 'pending' || saved.totalAttempts > 0 || saved.attempts > 0)) return skipped
  const claimed: QuoteEmailRecord = {
    ...saved, notificationStatus: 'sending',
    attempts: saved.attempts + 1,
    totalAttempts: saved.totalAttempts + 1,
    nextAttemptAt: null, lastAttemptAt: new Date(now).toISOString(), lastError: null,
    leaseToken: randomUUID(), leaseUntil: new Date(now + LEASE_MS).toISOString(),
  }
  if (!await compareAndSet(saved, claimed)) return skipped

  const delivery = await sendNotification(claimed)
  const finishedAt = Date.now()
  const next: QuoteEmailRecord = delivery.success ? {
    ...claimed, notificationStatus: 'sent', requestId: delivery.requestId,
    sentAt: new Date(finishedAt).toISOString(), nextAttemptAt: null, leaseToken: null, leaseUntil: null,
  } : {
    ...claimed, notificationStatus: 'failed',
    nextAttemptAt: null,
    lastError: delivery.code, leaseToken: null, leaseUntil: null,
  }
  // A failed checkpoint leaves the lease intact. ADMIN can retry after expiry;
  // the SMTP acceptance/crash window may repeat only the business notification.
  if (!await compareAndSet(claimed, next)) throw new QuoteEmailRecordError()
  return { id, status: delivery.success ? 'sent' : 'failed', ...(next.requestId ? { requestId: next.requestId } : {}) }
}
