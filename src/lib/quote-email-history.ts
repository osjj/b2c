import { randomUUID } from 'crypto'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { parseQuoteEmailRecord, QUOTE_EMAIL_REQUEST_PREFIX } from '@/lib/quote-email-outbox'

export type QuoteEmailHistoryItem = {
  id: string
  sender: string
  recipient: string
  subject: string
  customerEmail: string
  phone: string
  name: string
  companyName: string
  source: string
  entryPage: string
  referrer: string
  message: string
  textBody: string
  htmlBody: string
  requestId?: string
  createdAt: string
  notificationStatus?: 'pending' | 'sending' | 'sent' | 'failed'
  attempts?: number
  nextAttemptAt?: string | null
  lastAttemptAt?: string | null
  sentAt?: string | null
  lastError?: string | null
  leaseUntil?: string | null
}

export const DEFAULT_QUOTE_EMAIL_HISTORY_PAGE_SIZE = 20

const QUOTE_EMAIL_HISTORY_KEY = 'quote_email_history'
const MAX_QUOTE_EMAIL_HISTORY_ITEMS = 200

export async function appendQuoteEmailHistory(
  entry: Omit<QuoteEmailHistoryItem, 'id' | 'createdAt'>
) {
  const existingSetting = await prisma.setting.findUnique({
    where: { key: QUOTE_EMAIL_HISTORY_KEY },
  })

  const existingHistory = normalizeQuoteEmailHistory(existingSetting?.value)
  const nextHistory: QuoteEmailHistoryItem[] = [
    {
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      ...entry,
    },
    ...existingHistory,
  ].slice(0, MAX_QUOTE_EMAIL_HISTORY_ITEMS)

  await prisma.setting.upsert({
    where: { key: QUOTE_EMAIL_HISTORY_KEY },
    update: { value: nextHistory as never },
    create: { key: QUOTE_EMAIL_HISTORY_KEY, value: nextHistory as never },
  })

  revalidatePath('/admin/quote-emails')
}

export async function getQuoteEmailHistory({
  page = 1,
  limit = DEFAULT_QUOTE_EMAIL_HISTORY_PAGE_SIZE,
}: {
  page?: number
  limit?: number
} = {}) {
  const [setting, requestCount] = await Promise.all([
    prisma.setting.findUnique({ where: { key: QUOTE_EMAIL_HISTORY_KEY } }),
    prisma.setting.count({ where: { key: { startsWith: QUOTE_EMAIL_REQUEST_PREFIX } } }),
  ])

  const history = normalizeQuoteEmailHistory(setting?.value)
  const pageSize = Number.isFinite(limit)
    ? Math.min(100, Math.max(Math.floor(limit), 1))
    : DEFAULT_QUOTE_EMAIL_HISTORY_PAGE_SIZE
  const requestedPage = Number.isFinite(page) ? Math.max(Math.floor(page), 1) : 1
  const total = history.length + requestCount
  const totalPages = Math.ceil(total / pageSize)
  const currentPage = totalPages > 0 ? Math.min(requestedPage, totalPages) : 1
  const start = (currentPage - 1) * pageSize

  // At most 200 legacy entries can fall before this page. Fetch only that
  // bounded overlap of the individually stored records, then merge by time.
  const skip = Math.max(0, start - history.length)
  const rows = await prisma.setting.findMany({
    where: { key: { startsWith: QUOTE_EMAIL_REQUEST_PREFIX } },
    orderBy: [{ createdAt: 'desc' }, { key: 'desc' }],
    skip, take: pageSize + history.length,
    select: { value: true },
  })
  const records: QuoteEmailHistoryItem[] = rows.map(row => {
    const record = parseQuoteEmailRecord(row.value)
    // Explicit projection keeps private fingerprints and lease ownership out
    // of the client component even though the admin is authorized to read.
    return {
      id: record.id, sender: record.sender, recipient: record.recipient, subject: record.subject,
      customerEmail: record.customerEmail, phone: record.phone, name: record.name,
      companyName: record.companyName, source: record.source, entryPage: record.entryPage,
      referrer: record.referrer, message: record.message, textBody: record.textBody,
      htmlBody: record.htmlBody, requestId: record.requestId, createdAt: record.createdAt,
      notificationStatus: record.notificationStatus, attempts: record.attempts,
      nextAttemptAt: record.nextAttemptAt, lastAttemptAt: record.lastAttemptAt,
      sentAt: record.sentAt, lastError: record.lastError, leaseUntil: record.leaseUntil,
    }
  })
  const merged = [...history, ...records].sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id))

  return {
    items: merged.slice(start - skip, start - skip + pageSize),
    pagination: {
      page: currentPage,
      limit: pageSize,
      total,
      totalPages,
    },
  }
}

function normalizeQuoteEmailHistory(value: unknown): QuoteEmailHistoryItem[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
    .map((item) => ({
      id: String(item.id || ''),
      sender: String(item.sender || ''),
      recipient: String(item.recipient || ''),
      subject: String(item.subject || ''),
      customerEmail: String(item.customerEmail || ''),
      phone: String(item.phone || ''),
      name: String(item.name || ''),
      companyName: String(item.companyName || ''),
      source: String(item.source || ''),
      entryPage: String(item.entryPage || ''),
      referrer: String(item.referrer || ''),
      message: String(item.message || ''),
      textBody: String(item.textBody || ''),
      htmlBody: String(item.htmlBody || ''),
      requestId: item.requestId ? String(item.requestId) : undefined,
      createdAt: String(item.createdAt || ''),
      notificationStatus: 'sent' as const,
    }))
    .filter((item) => item.id && item.customerEmail && item.createdAt)
}
