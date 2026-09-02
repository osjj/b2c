import Link from 'next/link'
import { Download, FileClock, LockKeyhole } from 'lucide-react'
import { notFound } from 'next/navigation'

import { QuotationEditor, type QuotationProductOption, type SerializableQuotationInput } from '@/components/admin/quotation/quotation-editor'
import { ItemImageUpload } from '@/components/admin/quotation/item-image-upload'
import { RevisionActions } from '@/components/admin/quotation/revision-actions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { requireAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { isQuotationWorkbenchEnabled } from '@/lib/quotation/feature'

function stringArray(value: unknown): string[] { return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : [] }
function stringRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return Object.fromEntries(Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === 'string'))
}

export default async function SalesQuotationDetailPage({ params, searchParams }: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ revision?: string }>
}) {
  if (!isQuotationWorkbenchEnabled()) notFound()
  await requireAdmin()
  const [{ id }, query] = await Promise.all([params, searchParams])
  const [quotation, customers, quoteProducts, catalogProducts] = await Promise.all([
    prisma.salesQuotation.findUnique({ where: { id }, include: { customer: true, revisions: { include: { items: { include: { assets: { orderBy: { sortOrder: 'asc' } } }, orderBy: { sortOrder: 'asc' } }, documents: { orderBy: { createdAt: 'asc' } } }, orderBy: { revisionNumber: 'desc' } } } }),
    prisma.businessCustomer.findMany({ where: { isActive: true }, select: { id: true, companyName: true, countryCode: true }, orderBy: { companyName: 'asc' } }),
    prisma.quotationProduct.findMany({ where: { status: { not: 'INACTIVE' } }, orderBy: { updatedAt: 'desc' } }),
    prisma.product.findMany({ where: { isActive: true }, select: { id: true, name: true, sku: true, specifications: true }, orderBy: { name: 'asc' }, take: 500 }),
  ])
  if (!quotation) notFound()
  const revision = quotation.revisions.find((entry) => entry.id === query.revision) ?? quotation.revisions[0]
  if (!revision) notFound()
  const products: QuotationProductOption[] = [
    ...quoteProducts.map((product) => ({ id: product.id, kind: 'QUOTATION' as const, label: product.nameEn ?? product.nameZh ?? product.internalNumber, nameZh: product.nameZh, nameEn: product.nameEn, sku: product.sku, model: product.model, unit: product.unit, specifications: stringArray(product.specifications) })),
    ...catalogProducts.map((product) => ({ id: product.id, kind: 'CATALOG' as const, label: product.name, nameZh: null, nameEn: product.name, sku: product.sku, model: null, unit: 'pcs', specifications: normalizeCatalogSpecifications(product.specifications) })),
  ]
  const initialValue: SerializableQuotationInput = {
    customerId: quotation.customerId,
    quotationDate: revision.quotationDate.toISOString().slice(0, 10),
    validUntil: revision.validUntil?.toISOString().slice(0, 10) ?? null,
    documentLanguage: revision.documentLanguage,
    currency: revision.currency,
    currencyMinorUnit: revision.currencyMinorUnit,
    roundingMode: revision.roundingMode,
    publicTerms: stringRecord(revision.publicTerms),
    internalNotes: revision.internalNotes,
    discountAmount: revision.discountAmount.toString(),
    discountPercent: revision.discountPercent?.toString() ?? null,
    shippingFee: revision.shippingFee.toString(),
    otherFee: revision.otherFee.toString(),
    taxRate: revision.taxRate.toString(),
    roundingAdjustment: revision.roundingAdjustment.toString(),
    items: revision.items.map((item) => ({ id: item.id, quotationProductId: item.quotationProductId, productId: item.productId, sortOrder: item.sortOrder, nameZh: item.nameZh, nameEn: item.nameEn, model: item.model, sku: item.sku, specifications: stringArray(item.specifications), unit: item.unit, quantity: item.quantity.toString(), unitPrice: item.unitPrice.toString(), discountAmount: item.discountAmount.toString(), discountPercent: item.discountPercent?.toString() ?? null, unitCost: item.unitCost?.toString() ?? null, costCurrency: item.costCurrency, exchangeRate: item.exchangeRate?.toString() ?? null, internalNotes: item.internalNotes })),
  }
  const editable = revision.state === 'DRAFT' || revision.state === 'READY'

  return <div className="space-y-7">
    <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><p className="font-mono text-xs font-semibold text-primary">{quotation.quotationNumber} · REV {revision.revisionNumber}</p><h1 className="mt-1 font-serif text-3xl">{quotation.customer.companyName}</h1><div className="mt-2 flex items-center gap-2"><Badge>{revision.state}</Badge><Badge variant="outline">{revision.documentLanguage}</Badge><Badge variant={quotation.outcomeStatus === 'OPEN' ? 'secondary' : 'outline'}>{quotation.outcomeStatus}</Badge><span className="text-sm text-muted-foreground">{revision.currency} {revision.total.toString()}</span></div></div><RevisionActions revisionId={revision.id} version={revision.version} state={revision.state} customers={customers} currentCustomerId={quotation.customerId} outcomeStatus={quotation.outcomeStatus} /></header>
    <Card><CardHeader><CardTitle className="flex items-center gap-2 font-serif"><FileClock className="h-5 w-5" />Revision history</CardTitle><CardDescription>Select a revision to inspect its exact line snapshots and formal files.</CardDescription></CardHeader><CardContent className="flex flex-wrap gap-2">{quotation.revisions.map((entry) => <Button key={entry.id} size="sm" variant={entry.id === revision.id ? 'default' : 'outline'} asChild><Link href={`/admin/sales-quotations/${quotation.id}?revision=${entry.id}`}>R{entry.revisionNumber} · {entry.state}</Link></Button>)}</CardContent></Card>
    {editable ? <QuotationEditor customers={customers} products={products} initialValue={initialValue} revisionId={revision.id} expectedVersion={revision.version} /> : <Card><CardHeader><CardTitle className="flex items-center gap-2 font-serif"><LockKeyhole className="h-5 w-5" />Immutable revision</CardTitle><CardDescription>This version is read-only. Its line snapshots and formal files remain unchanged.</CardDescription></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Item</TableHead><TableHead>Qty</TableHead><TableHead>Unit price</TableHead><TableHead className="text-right">Line total</TableHead></TableRow></TableHeader><TableBody>{revision.items.map((item) => <TableRow key={item.id}><TableCell><p className="font-medium">{item.nameEn ?? item.nameZh}</p><p className="text-xs text-muted-foreground">{item.model ?? item.sku ?? '—'}</p></TableCell><TableCell>{item.quantity.toString()} {item.unit}</TableCell><TableCell>{revision.currency} {item.unitPrice.toString()}</TableCell><TableCell className="text-right font-medium">{revision.currency} {item.lineTotal.toString()}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card>}
    <Card><CardHeader><CardTitle className="font-serif">Customer-visible line images</CardTitle><CardDescription>Images are stored privately and copied into immutable revision assets during finalization. Production uploads stay disabled until an approved malware-scanner adapter is implemented.</CardDescription></CardHeader><CardContent className="space-y-4">{revision.items.map((item) => <div key={item.id} className="rounded-xl border p-4"><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div><p className="font-medium">{item.nameEn ?? item.nameZh}</p><p className="text-xs text-muted-foreground">{item.assets.length} attached image{item.assets.length === 1 ? '' : 's'}</p></div>{item.assets.length ? <div className="flex flex-wrap gap-2">{item.assets.map((asset) => <Badge key={asset.id} variant="outline">{asset.displayName ?? asset.assetType}</Badge>)}</div> : null}</div>{editable ? <ItemImageUpload itemId={item.id} salesQuotationId={quotation.id} expectedVersion={revision.version} /> : null}</div>)}</CardContent></Card>
    <Card><CardHeader><CardTitle className="font-serif">Formal documents</CardTitle><CardDescription>ADMIN-only, integrity-checked downloads. Customer artifacts exclude cost, supplier, profit and internal notes.</CardDescription></CardHeader><CardContent className="space-y-4">{revision.documents.length === 0 ? <p className="text-sm text-muted-foreground">Mark the revision ready, then finalize to create snapshot, PDF and Excel files.</p> : <><div className="flex flex-wrap gap-3">{revision.documents.filter((document) => document.documentType !== 'INTERNAL_EXCEL').map((document) => <Button key={document.id} variant="outline" asChild><Link href={`/api/admin/quotation-files/${document.id}/download`}><Download className="mr-2 h-4 w-4" />{document.documentType}</Link></Button>)}</div>{revision.documents.some((document) => document.documentType === 'INTERNAL_EXCEL') ? <div className="rounded-xl border border-amber-500/35 bg-amber-500/5 p-4"><p className="mb-3 text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300">Internal only · contains cost and profit</p>{revision.documents.filter((document) => document.documentType === 'INTERNAL_EXCEL').map((document) => <Button key={document.id} variant="outline" asChild><Link href={`/api/admin/quotation-files/${document.id}/download`}><Download className="mr-2 h-4 w-4" />Internal valuation Excel</Link></Button>)}</div> : null}</>}</CardContent></Card>
  </div>
}

function normalizeCatalogSpecifications(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((entry) => {
    if (typeof entry === 'string') return [entry]
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return []
    const record = entry as Record<string, unknown>
    const name = typeof record.name === 'string' ? record.name : ''
    const itemValue = typeof record.value === 'string' ? record.value : ''
    return name && itemValue ? [`${name}: ${itemValue}`] : []
  })
}
