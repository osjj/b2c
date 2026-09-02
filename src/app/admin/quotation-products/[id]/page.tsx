import { notFound } from 'next/navigation'

import { QuotationProductForm } from '@/components/admin/quotation/product-form'
import { QuotationProductAssets } from '@/components/admin/quotation/product-assets'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { requireAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { isQuotationWorkbenchEnabled } from '@/lib/quotation/feature'

function stringArray(value: unknown): string[] { return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : [] }

export default async function QuotationProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  if (!isQuotationWorkbenchEnabled()) notFound()
  await requireAdmin()
  const { id } = await params
  const product = await prisma.quotationProduct.findUnique({
    where: { id },
    include: {
      images: { orderBy: { sortOrder: 'asc' } },
      sources: { orderBy: { createdAt: 'desc' }, take: 50 },
      costRecords: { orderBy: { effectiveAt: 'desc' }, take: 50 },
      quotationItems: { include: { revision: { include: { salesQuotation: { include: { customer: true } } } } }, orderBy: { createdAt: 'desc' }, take: 50 },
    },
  })
  if (!product) notFound()
  return <div className="space-y-6"><header><p className="font-mono text-xs text-primary">{product.internalNumber}</p><h1 className="mt-1 font-serif text-3xl">{product.nameEn ?? product.nameZh}</h1></header><QuotationProductForm initialValue={{ id: product.id, internalNumber: product.internalNumber, productId: product.productId, nameZh: product.nameZh, nameEn: product.nameEn, sku: product.sku, model: product.model, unit: product.unit, moq: product.moq?.toString() ?? null, specifications: stringArray(product.specifications), standards: stringArray(product.standards), certificates: stringArray(product.certificates), internalNotes: product.internalNotes, status: product.status }} /><QuotationProductAssets productId={product.id} images={product.images.map((image) => ({ id: image.id, displayName: image.displayName, contentType: image.contentType, isCustomerVisible: image.isCustomerVisible }))} sources={product.sources.map((source) => ({ id: source.id, sourceType: source.sourceType, supplierName: source.supplierName, sourceUrl: source.sourceUrl }))} /><div className="grid gap-6 xl:grid-cols-2"><Card><CardHeader><CardTitle className="font-serif">Cost history</CardTitle><CardDescription>Internal only; newest effective record first.</CardDescription></CardHeader><CardContent>{product.costRecords.length ? <Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Cost</TableHead><TableHead>Rate</TableHead></TableRow></TableHeader><TableBody>{product.costRecords.map((cost) => <TableRow key={cost.id}><TableCell>{cost.effectiveAt.toLocaleDateString('en-CA')}</TableCell><TableCell>{cost.currency} {cost.amount.toString()}</TableCell><TableCell>{cost.exchangeRate?.toString() ?? '—'}</TableCell></TableRow>)}</TableBody></Table> : <p className="text-sm text-muted-foreground">No cost history.</p>}</CardContent></Card><Card><CardHeader><CardTitle className="font-serif">Quotation history</CardTitle><CardDescription>Snapshot usage by customer and quotation revision.</CardDescription></CardHeader><CardContent>{product.quotationItems.length ? <Table><TableHeader><TableRow><TableHead>Quotation</TableHead><TableHead>Customer</TableHead><TableHead>Qty / price</TableHead></TableRow></TableHeader><TableBody>{product.quotationItems.map((item) => <TableRow key={item.id}><TableCell>{item.revision.salesQuotation.quotationNumber} · R{item.revision.revisionNumber}</TableCell><TableCell>{item.revision.salesQuotation.customer.companyName}</TableCell><TableCell>{item.quantity.toString()} {item.unit} · {item.revision.currency} {item.unitPrice.toString()}</TableCell></TableRow>)}</TableBody></Table> : <p className="text-sm text-muted-foreground">Not used in a quotation yet.</p>}</CardContent></Card></div></div>
}
