import { notFound } from 'next/navigation'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { isQuotationWorkbenchEnabled } from '@/lib/quotation/feature'
import { CommonProductForm } from '@/components/admin/quotation/common-product-form'
import { CommonProductImages } from '@/components/admin/quotation/common-product-images'
import { WorkbenchHeader } from '@/components/admin/quotation/workbench-header'

export default async function CommonProductPage({ params }: { params: Promise<{ id: string }> }) {
  if (!isQuotationWorkbenchEnabled()) notFound()
  await requireAdmin()
  const { id } = await params
  const product = await prisma.quotationProduct.findUnique({ where: { id }, include: { images: { where: { isCustomerVisible: true }, orderBy: { sortOrder: 'asc' } } } })
  if (!product) notFound()
  const defaults = await prisma.setting.findUnique({ where: { key: `quotation.product-defaults.${id}` } })
  const price = z.object({ unitPrice: z.string(), currency: z.string() }).catch({ unitPrice: '0', currency: 'USD' }).parse(defaults?.value)
  return <div className="mx-auto max-w-5xl space-y-8"><WorkbenchHeader title="编辑常用产品" description="更新默认资料，不影响任何已保存的报价内容。" /><CommonProductForm key={product.updatedAt.toISOString()} initialValue={{ id, name: product.nameEn || product.nameZh || '', description: z.array(z.string()).catch([]).parse(product.specifications).join('\n'), unit: product.unit, ...price, active: product.status !== 'INACTIVE', expectedUpdatedAt: product.updatedAt.toISOString() }} /><CommonProductImages key={`images-${product.updatedAt.toISOString()}`} productId={id} updatedAt={product.updatedAt.toISOString()} images={product.images.flatMap((image) => image.sourceFileId ? [{ id: image.sourceFileId, kind: 'source' as const, name: image.displayName || '产品图片' }] : [])} /></div>
}
