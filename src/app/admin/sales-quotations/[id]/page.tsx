import Link from 'next/link'
import { notFound } from 'next/navigation'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { isQuotationWorkbenchEnabled } from '@/lib/quotation/feature'
import { readWorkbenchSettings } from '@/lib/quotation/services/workbench-settings'
import { readCommonProducts } from '@/lib/quotation/services/common-products'
import { revisionStatusLabel } from '@/lib/quotation/workbench-config'
import { buildCanonicalSnapshot } from '@/lib/quotation/artifacts/snapshot'
import type { SimpleQuotation } from '@/lib/quotation/simple-input'
import { WorkbenchHeader } from '@/components/admin/quotation/workbench-header'
import { SimpleQuotationEditor } from '@/components/admin/quotation/simple-editor'
import { SimpleQuotationActions } from '@/components/admin/quotation/simple-actions'
import { Button } from '@/components/ui/button'

export default async function QuotationDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ revision?: string; reload?: string }> }) {
  if (!isQuotationWorkbenchEnabled()) notFound()
  await requireAdmin()
  const { id } = await params
  const { revision: selectedId, reload } = await searchParams
  const quotation = await prisma.salesQuotation.findUnique({ where: { id }, include: { revisions: { orderBy: { revisionNumber: 'desc' }, include: { items: { orderBy: { sortOrder: 'asc' }, include: { assets: { orderBy: { sortOrder: 'asc' } } } }, documents: { where: { documentType: { in: ['CUSTOMER_PDF', 'CUSTOMER_EXCEL'] } } }, finalizationAttempts: { where: { status: 'FAILED' }, orderBy: { createdAt: 'desc' }, take: 1 } } } } })
  if (!quotation) notFound()
  const revision = selectedId ? quotation.revisions.find((entry) => entry.id === selectedId) : quotation.revisions[0]
  if (!revision) notFound()
  const snapshot = buildCanonicalSnapshot({ ...revision, salesQuotation: quotation })
  const editable = revision.state === 'DRAFT' || revision.state === 'READY'
  const [settings, products, customers] = await Promise.all([
    readWorkbenchSettings(), editable ? readCommonProducts() : Promise.resolve([]),
    editable ? prisma.businessCustomer.findMany({ where: { isActive: true }, select: { id: true, companyName: true }, take: 500, orderBy: { updatedAt: 'desc' } }) : Promise.resolve([]),
  ])
  const initial: SimpleQuotation = {
    customerId: quotation.customerId, customerName: snapshot.customer.companyName, quotationDate: snapshot.quotation.date,
    currency: revision.currency, terms: Object.entries(snapshot.terms).map(([key, val]) => key === 'Terms' ? val : `${key}: ${val}`).join('\n'), internalNotes: revision.internalNotes || '',
    shippingFee: revision.shippingFee.toString(), discountAmount: revision.discountAmount.toString(), otherFee: revision.otherFee.toString(),
    items: revision.items.map((item) => ({ id: item.id, quotationProductId: item.quotationProductId, name: item.nameEn || item.nameZh || '', description: z.array(z.string()).catch([]).parse(item.specifications).join('\n'), quantity: item.quantity.toString(), unit: item.unit, unitPrice: item.unitPrice.toString(), unitCost: item.unitCost?.toString() ?? null, images: item.assets.filter((asset) => asset.assetType === 'PRODUCT_IMAGE').map((asset) => ({ id: asset.id, kind: 'asset', name: asset.displayName || '产品图片' })) })),
  }
  return <div className="mx-auto max-w-7xl space-y-8">
    <WorkbenchHeader title={snapshot.customer.companyName} description={`${quotation.quotationNumber} · R${revision.revisionNumber} · ${revisionStatusLabel(revision.state)}`}><SimpleQuotationActions revisionId={revision.id} version={revision.version} state={revision.state} /></WorkbenchHeader>
    <nav aria-label="报价版本" className="flex flex-wrap gap-2">{quotation.revisions.map((entry) => <Link key={entry.id} href={`/admin/sales-quotations/${id}?revision=${entry.id}`} className={`rounded-full border px-4 py-2 text-sm ${entry.id === revision.id ? 'bg-slate-900 text-white' : 'bg-white text-slate-600'}`}>R{entry.revisionNumber} · {revisionStatusLabel(entry.state)}</Link>)}</nav>
    {editable && revision.finalizationAttempts[0] && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">上次文件生成未完成。请修正配置后重新生成；如仍失败，保留页面显示的错误信息供排查。</p>}
    {editable ? <SimpleQuotationEditor key={`${revision.id}-${revision.version}-${(reload || '').slice(0, 20)}`} customers={customers} products={products} settings={settings} initialValue={initial} revisionId={revision.id} quotationId={id} expectedVersion={revision.version} /> : <>
      <section className="rounded-2xl border bg-white p-6"><h2 className="text-lg font-semibold">{revision.state === 'FINALIZING' ? '文件正在生成' : '正式报价文件'}</h2><p className="mt-2 text-sm text-slate-500">已生成版本保留原始内容；需要调整时点击“创建修订版”。</p><div className="mt-5 flex flex-wrap gap-3">{revision.documents.map((document) => <Button asChild key={document.id} variant={document.documentType === 'CUSTOMER_PDF' ? 'default' : 'outline'}><a href={`/api/admin/quotation-files/${document.id}/download`}>下载 {document.documentType === 'CUSTOMER_PDF' ? 'PDF' : 'Excel'}</a></Button>)}</div></section>
      <section className="overflow-x-auto rounded-2xl border bg-white p-6"><table className="w-full text-sm"><thead className="border-b text-left text-slate-500"><tr><th className="pb-3">产品</th><th>数量</th><th>单价</th><th className="text-right">金额</th></tr></thead><tbody>{initial.items.map((item, i) => <tr key={item.id} className="border-b"><td className="py-4"><p className="font-medium">{item.name}</p><p className="mt-1 max-w-xl whitespace-pre-wrap text-xs text-slate-500">{item.description}</p></td><td>{item.quantity} {item.unit}</td><td>{item.unitPrice}</td><td className="text-right">{snapshot.items[i].lineTotal}</td></tr>)}</tbody></table><p className="mt-6 text-right text-xl font-semibold">{revision.currency} {revision.total.toString()}</p></section>
    </>}
  </div>
}
