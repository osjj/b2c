import { notFound } from 'next/navigation'

import { QuotationProductForm } from '@/components/admin/quotation/product-form'
import { requireAdmin } from '@/lib/auth-utils'
import { isQuotationWorkbenchEnabled } from '@/lib/quotation/feature'

export default async function NewQuotationProductPage() {
  if (!isQuotationWorkbenchEnabled()) notFound()
  await requireAdmin()
  return <div className="space-y-6"><header><p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Quote workbench</p><h1 className="mt-1 font-serif text-3xl">New quotation product</h1></header><QuotationProductForm /></div>
}

