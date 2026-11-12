'use server'

import { requireAdmin } from '@/lib/auth-utils'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import {
  DEFAULT_QUOTE_EMAIL_HISTORY_PAGE_SIZE,
  getQuoteEmailHistory as getQuoteEmailHistoryFromStore,
} from '@/lib/quote-email-history'

const inquiryIdSchema = z.string().uuid()

export async function getQuoteEmailHistory({
  page = 1,
  limit = DEFAULT_QUOTE_EMAIL_HISTORY_PAGE_SIZE,
}: {
  page?: number
  limit?: number
} = {}) {
  await requireAdmin()

  const history = await getQuoteEmailHistoryFromStore({ page, limit })
  return { ...history, checkedAt: Date.now() }
}

export async function retryQuoteEmailNotification(id: string): Promise<{ success: boolean; reason: string }> {
  await requireAdmin()

  const parsed = inquiryIdSchema.safeParse(id)
  if (!parsed.success) return { success: false, reason: 'Select a saved inquiry to retry its notification.' }

  try {
    const { deliverQuoteEmail } = await import('@/lib/quote-email-outbox')
    const result = await deliverQuoteEmail(parsed.data, { force: true })
    try {
      revalidatePath('/admin/quote-emails')
    } catch {
      // The persisted delivery result remains valid if cache refresh fails.
    }

    if (result.status === 'failed') {
      return { success: false, reason: 'The notification could not be sent. The inquiry remains saved; check email configuration before retrying.' }
    }
    if (result.status === 'sent') {
      return { success: true, reason: 'The email provider accepted the notification.' }
    }
    if (result.status === 'skipped') {
      return { success: true, reason: 'This notification was already sent or is being processed. Refresh to see its status.' }
    }
    return { success: false, reason: 'The notification was not sent. The inquiry remains saved; refresh before retrying manually.' }
  } catch {
    return { success: false, reason: 'The notification could not be checked. Refresh and try again; the saved inquiry has not been removed.' }
  }
}
