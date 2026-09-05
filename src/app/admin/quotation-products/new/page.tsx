import { notFound } from 'next/navigation'
import { requireAdmin } from '@/lib/auth-utils'
import { isQuotationWorkbenchEnabled } from '@/lib/quotation/feature'
import { CommonProductForm } from '@/components/admin/quotation/common-product-form'
import { WorkbenchHeader } from '@/components/admin/quotation/workbench-header'

export default async function NewCommonProductPage() {
  if (!isQuotationWorkbenchEnabled()) notFound()
  await requireAdmin()
  return <div className="mx-auto max-w-5xl space-y-8"><WorkbenchHeader title="添加常用产品" description="可选的快捷资料，不需要录入正式商城产品库。" /><CommonProductForm /></div>
}
