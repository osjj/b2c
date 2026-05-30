'use server'

import { requireAdmin } from '@/lib/auth-utils'
import {
  DEFAULT_QUOTE_EMAIL_HISTORY_PAGE_SIZE,
  getQuoteEmailHistory as getQuoteEmailHistoryFromStore,
} from '@/lib/quote-email-history'

export async function getQuoteEmailHistory({
  page = 1,
  limit = DEFAULT_QUOTE_EMAIL_HISTORY_PAGE_SIZE,
}: {
  page?: number
  limit?: number
} = {}) {
  await requireAdmin()

  return getQuoteEmailHistoryFromStore({ page, limit })
}
