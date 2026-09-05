import { notFound } from 'next/navigation'
import { requireAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { isQuotationWorkbenchEnabled } from '@/lib/quotation/feature'
import { readWorkbenchSettings } from '@/lib/quotation/services/workbench-settings'
import { readCommonProducts } from '@/lib/quotation/services/common-products'
import { WorkbenchHeader } from '@/components/admin/quotation/workbench-header'
import { SimpleQuotationEditor } from '@/components/admin/quotation/simple-editor'

export default async function NewQuotationPage() {
  if (!isQuotationWorkbenchEnabled()) notFound()
  await requireAdmin()
  const [customers, products, settings] = await Promise.all([
    prisma.businessCustomer.findMany({ where: { isActive: true }, select: { id: true, companyName: true }, orderBy: { updatedAt: 'desc' }, take: 500 }),
    readCommonProducts(), readWorkbenchSettings(),
  ])
  return <div className="mx-auto max-w-7xl space-y-8"><WorkbenchHeader title="新建报价" description="从客户名称开始。临时产品直接填写，无需提前建档。" /><SimpleQuotationEditor customers={customers} products={products} settings={settings} /></div>
}
