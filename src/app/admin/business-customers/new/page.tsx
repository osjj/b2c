import { notFound } from 'next/navigation'

import { CustomerForm } from '@/components/admin/quotation/customer-form'
import { requireAdmin } from '@/lib/auth-utils'
import { isQuotationWorkbenchEnabled } from '@/lib/quotation/feature'

export default async function NewBusinessCustomerPage() {
  if (!isQuotationWorkbenchEnabled()) notFound()
  await requireAdmin()
  return <div className="space-y-6"><header><p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Quote workbench</p><h1 className="mt-1 font-serif text-3xl">New business customer</h1></header><CustomerForm /></div>
}

