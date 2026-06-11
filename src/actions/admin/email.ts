'use server'

import { requireAdmin } from '@/lib/auth-utils'
import { getAdminEmailHistoryFromDatabase } from '@/lib/admin-email-store'

export async function getAdminEmailHistory({
  page,
  limit,
}: {
  page?: number
  limit?: number
} = {}) {
  await requireAdmin()

  return getAdminEmailHistoryFromDatabase({ page, limit })
}
