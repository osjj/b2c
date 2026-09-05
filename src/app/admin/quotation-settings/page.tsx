import { notFound } from 'next/navigation'
import { requireAdmin } from '@/lib/auth-utils'
import { isQuotationWorkbenchEnabled } from '@/lib/quotation/feature'
import { readWorkbenchSettings } from '@/lib/quotation/services/workbench-settings'
import { WorkbenchHeader } from '@/components/admin/quotation/workbench-header'
import { QuotationSettingsForm } from '@/components/admin/quotation/settings-form'

export default async function QuotationSettingsPage() {
  if (!isQuotationWorkbenchEnabled()) notFound()
  await requireAdmin()
  return <div className="space-y-8"><WorkbenchHeader title="报价设置" description="公司信息和默认条款只需维护一次，新报价自动带入。" /><QuotationSettingsForm initialValue={await readWorkbenchSettings()} /></div>
}
