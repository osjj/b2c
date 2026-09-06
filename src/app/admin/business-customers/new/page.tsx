import { notFound } from 'next/navigation'

import { CustomerForm } from '@/components/admin/quotation/customer-form'
import { requireAdmin } from '@/lib/auth-utils'
import { isQuotationWorkbenchEnabled } from '@/lib/quotation/feature'
import { WorkbenchHeader } from '@/components/admin/quotation/workbench-header'

export default async function NewBusinessCustomerPage() {
  if (!isQuotationWorkbenchEnabled()) notFound()
  await requireAdmin()
  return <div className="space-y-6"><WorkbenchHeader title="添加客户" /><CustomerForm /></div>
}
