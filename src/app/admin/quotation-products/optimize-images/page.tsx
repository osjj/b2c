import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireAdmin } from '@/lib/auth-utils'
import { isQuotationWorkbenchEnabled } from '@/lib/quotation/feature'
import { Button } from '@/components/ui/button'
import { WorkbenchHeader } from '@/components/admin/quotation/workbench-header'
import { CommonProductImageOptimization } from '@/components/admin/quotation/common-product-image-optimization'

export default async function OptimizeCommonProductImagesPage() {
  if (!isQuotationWorkbenchEnabled()) notFound()
  await requireAdmin()
  return <div className="mx-auto max-w-5xl space-y-8"><WorkbenchHeader title="优化已有图片" description="批量优化常用产品图片，保留原图与历史报价。"><Button asChild variant="outline"><Link href="/admin/quotation-products">返回常用产品</Link></Button></WorkbenchHeader><CommonProductImageOptimization /></div>
}
