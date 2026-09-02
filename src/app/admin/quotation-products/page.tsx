import Link from 'next/link'
import { PackageSearch, Plus, Search } from 'lucide-react'
import { notFound } from 'next/navigation'

import { Pagination } from '@/components/admin/pagination'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { requireAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { isQuotationWorkbenchEnabled } from '@/lib/quotation/feature'

export default async function QuotationProductsPage({ searchParams }: { searchParams: Promise<{ page?: string; search?: string; status?: string }> }) {
  if (!isQuotationWorkbenchEnabled()) notFound()
  await requireAdmin()
  const params = await searchParams
  const page = Math.max(Number(params.page) || 1, 1)
  const search = params.search?.trim() ?? ''
  const status = ['DRAFT', 'ACTIVE', 'INACTIVE'].includes(params.status ?? '') ? params.status as 'DRAFT' | 'ACTIVE' | 'INACTIVE' : undefined
  const pageSize = 20
  const where = { ...(search ? { OR: [
    { internalNumber: { contains: search, mode: 'insensitive' as const } },
    { nameZh: { contains: search, mode: 'insensitive' as const } },
    { nameEn: { contains: search, mode: 'insensitive' as const } },
    { sku: { contains: search, mode: 'insensitive' as const } },
    { model: { contains: search, mode: 'insensitive' as const } },
  ] } : {}), ...(status ? { status } : {}) }
  const [products, total] = await Promise.all([
    prisma.quotationProduct.findMany({ where, include: { _count: { select: { quotationItems: true } } }, orderBy: { updatedAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
    prisma.quotationProduct.count({ where }),
  ])

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Quote workbench</p><h1 className="mt-1 font-serif text-3xl">Quotation products</h1><p className="mt-1 text-sm text-muted-foreground">Reusable quote-only records; storefront publication is never automatic.</p></div><Button asChild><Link href="/admin/quotation-products/new"><Plus className="mr-2 h-4 w-4" />New quotation product</Link></Button></header>
      <form className="flex max-w-2xl flex-wrap gap-3"><div className="relative min-w-72 flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input name="search" defaultValue={search} placeholder="Search number, name, SKU or model…" className="pl-10" /></div><select name="status" defaultValue={status ?? ''} className="h-9 rounded-md border bg-background px-3 text-sm"><option value="">All statuses</option><option value="DRAFT">Draft</option><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select><Button type="submit" variant="secondary">Apply filters</Button></form>
      <Card className="py-0"><CardContent className="p-0">
        {products.length === 0 ? <div className="flex min-h-64 flex-col items-center justify-center gap-3 p-8 text-center"><PackageSearch className="h-9 w-9 text-muted-foreground" /><p className="font-medium">No quotation products found</p><p className="text-sm text-muted-foreground">Create records from your local quote drafts without publishing them.</p></div> : <Table><TableHeader><TableRow><TableHead>Internal number</TableHead><TableHead>Name</TableHead><TableHead>Model / SKU</TableHead><TableHead>Unit</TableHead><TableHead>Used</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>{products.map((product) => <TableRow key={product.id}><TableCell className="font-mono text-xs">{product.internalNumber}</TableCell><TableCell><Link href={`/admin/quotation-products/${product.id}`} className="font-medium hover:underline">{product.nameEn ?? product.nameZh}</Link><p className="text-xs text-muted-foreground">{product.nameEn && product.nameZh ? product.nameZh : '—'}</p></TableCell><TableCell>{[product.model, product.sku].filter(Boolean).join(' / ') || '—'}</TableCell><TableCell>{product.unit}</TableCell><TableCell>{product._count.quotationItems}</TableCell><TableCell><Badge variant={product.status === 'ACTIVE' ? 'secondary' : 'outline'}>{product.status}</Badge></TableCell></TableRow>)}</TableBody></Table>}
      </CardContent></Card>
      <Pagination page={page} total={total} totalPages={Math.ceil(total / pageSize)} />
    </div>
  )
}
