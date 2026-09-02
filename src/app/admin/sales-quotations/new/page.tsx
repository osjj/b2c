import { notFound } from 'next/navigation'

import { QuotationEditor, type QuotationProductOption } from '@/components/admin/quotation/quotation-editor'
import { requireAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { isQuotationWorkbenchEnabled } from '@/lib/quotation/feature'

function stringArray(value: unknown): string[] { return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : [] }

export default async function NewSalesQuotationPage() {
  if (!isQuotationWorkbenchEnabled()) notFound()
  await requireAdmin()
  const [customers, quoteProducts, catalogProducts] = await Promise.all([
    prisma.businessCustomer.findMany({ where: { isActive: true }, select: { id: true, companyName: true, countryCode: true }, orderBy: { companyName: 'asc' } }),
    prisma.quotationProduct.findMany({ where: { status: { not: 'INACTIVE' } }, orderBy: { updatedAt: 'desc' } }),
    prisma.product.findMany({ where: { isActive: true }, select: { id: true, name: true, sku: true, specifications: true }, orderBy: { name: 'asc' }, take: 500 }),
  ])
  const products: QuotationProductOption[] = [
    ...quoteProducts.map((product) => ({ id: product.id, kind: 'QUOTATION' as const, label: product.nameEn ?? product.nameZh ?? product.internalNumber, nameZh: product.nameZh, nameEn: product.nameEn, sku: product.sku, model: product.model, unit: product.unit, specifications: stringArray(product.specifications) })),
    ...catalogProducts.map((product) => ({ id: product.id, kind: 'CATALOG' as const, label: product.name, nameZh: null, nameEn: product.name, sku: product.sku, model: null, unit: 'pcs', specifications: normalizeCatalogSpecifications(product.specifications) })),
  ]
  return <div className="space-y-6"><header><p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Quote workbench</p><h1 className="mt-1 font-serif text-3xl">Create sales quotation</h1><p className="mt-1 text-sm text-muted-foreground">Start manually; no product-library import or AI extraction is required.</p></header><QuotationEditor customers={customers} products={products} /></div>
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

