import { notFound, redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/auth-utils'
import { isQuotationWorkbenchEnabled } from '@/lib/quotation/feature'

export default async function QuotationWorkbenchPage() {
  if (!isQuotationWorkbenchEnabled()) notFound()
  await requireAdmin()
  redirect('/admin/sales-quotations')
}
