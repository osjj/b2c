import { randomUUID } from 'crypto'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'

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
  message: string
  textBody: string
  htmlBody: string
  requestId?: string
  createdAt: string
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
  const setting = await prisma.setting.findUnique({
    where: { key: QUOTE_EMAIL_HISTORY_KEY },
  })

  const history = normalizeQuoteEmailHistory(setting?.value)
  const pageSize = Number.isFinite(limit)
    ? Math.max(Math.floor(limit), 1)
    : DEFAULT_QUOTE_EMAIL_HISTORY_PAGE_SIZE
  const requestedPage = Number.isFinite(page) ? Math.max(Math.floor(page), 1) : 1
  const total = history.length
  const totalPages = Math.ceil(total / pageSize)
  const currentPage = totalPages > 0 ? Math.min(requestedPage, totalPages) : 1
  const start = (currentPage - 1) * pageSize

  return {
    items: history.slice(start, start + pageSize),
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
      message: String(item.message || ''),
      textBody: String(item.textBody || ''),
      htmlBody: String(item.htmlBody || ''),
      requestId: item.requestId ? String(item.requestId) : undefined,
      createdAt: String(item.createdAt || ''),
    }))
    .filter((item) => item.id && item.customerEmail && item.createdAt)
}
