import { notFound } from 'next/navigation'

import { CustomerForm } from '@/components/admin/quotation/customer-form'
import { requireAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { isQuotationWorkbenchEnabled } from '@/lib/quotation/feature'
import { customerProfileKey, directoryCustomer } from '@/lib/quotation/customer-directory'
import { WorkbenchHeader } from '@/components/admin/quotation/workbench-header'

export default async function BusinessCustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  if (!isQuotationWorkbenchEnabled()) notFound()
  await requireAdmin()
  const { id } = await params
  const customer = await prisma.businessCustomer.findUnique({ where: { id }, include: { contacts: { orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }] } } })
  if (!customer) notFound()
  const profile = await prisma.setting.findUnique({ where: { key: customerProfileKey(id) } })
  return <div className="space-y-6"><WorkbenchHeader title="编辑客户" /><CustomerForm key={customer.updatedAt.toISOString()} initialValue={directoryCustomer(customer, profile?.value)} /></div>
}
