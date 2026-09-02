import Link from 'next/link'
import type { Prisma, SalesQuotationOutcomeStatus, SalesQuotationRevisionState } from '@prisma/client'
import { FileText, Plus, Search } from 'lucide-react'
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

export default async function SalesQuotationsPage({ searchParams }: { searchParams: Promise<{ page?: string; search?: string; outcome?: string; state?: string }> }) {
  if (!isQuotationWorkbenchEnabled()) notFound()
  await requireAdmin()
  const params = await searchParams
  const page = Math.max(Number(params.page) || 1, 1)
  const search = params.search?.trim() ?? ''
  const outcome = outcomeValues.includes(params.outcome as SalesQuotationOutcomeStatus) ? params.outcome as SalesQuotationOutcomeStatus : undefined
  const state = stateValues.includes(params.state as SalesQuotationRevisionState) ? params.state as SalesQuotationRevisionState : undefined
  const pageSize = 20
  const where: Prisma.SalesQuotationWhereInput = {
    ...(search ? { OR: [
      { quotationNumber: { contains: search, mode: 'insensitive' as const } },
      { customer: { companyName: { contains: search, mode: 'insensitive' as const } } },
    ] } : {}),
    ...(outcome ? { outcomeStatus: outcome } : {}),
    ...(state ? { revisions: { some: { state } } } : {}),
  }
  const [quotations, total] = await Promise.all([
    prisma.salesQuotation.findMany({ where, include: { customer: true, revisions: { include: { items: { orderBy: { sortOrder: 'asc' } } }, orderBy: { revisionNumber: 'desc' }, take: 1 } }, orderBy: { updatedAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
    prisma.salesQuotation.count({ where }),
  ])

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Quote workbench</p><h1 className="mt-1 font-serif text-3xl">Sales quotations</h1><p className="mt-1 text-sm text-muted-foreground">Manual drafts, controlled revisions and immutable customer files.</p></div><Button asChild><Link href="/admin/sales-quotations/new"><Plus className="mr-2 h-4 w-4" />Create quotation</Link></Button></header>
      <form className="flex max-w-4xl flex-wrap gap-3"><div className="relative min-w-72 flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input name="search" defaultValue={search} placeholder="Search quotation number or customer…" className="pl-10" /></div><select name="state" defaultValue={state ?? ''} className="h-9 rounded-md border bg-background px-3 text-sm"><option value="">All revision states</option>{stateValues.map((value) => <option key={value} value={value}>{value}</option>)}</select><select name="outcome" defaultValue={outcome ?? ''} className="h-9 rounded-md border bg-background px-3 text-sm"><option value="">All outcomes</option>{outcomeValues.map((value) => <option key={value} value={value}>{value}</option>)}</select><Button type="submit" variant="secondary">Apply filters</Button></form>
      <Card className="py-0"><CardContent className="p-0">
        {quotations.length === 0 ? <div className="flex min-h-64 flex-col items-center justify-center gap-3 p-8 text-center"><FileText className="h-9 w-9 text-muted-foreground" /><p className="font-medium">No quotations found</p><p className="text-sm text-muted-foreground">Start with a customer and at least one manual line.</p></div> : <Table><TableHeader><TableRow><TableHead>Quotation</TableHead><TableHead>Customer / date</TableHead><TableHead>Revision</TableHead><TableHead>Line history</TableHead><TableHead>Total</TableHead><TableHead>Outcome</TableHead><TableHead className="text-right">Updated</TableHead></TableRow></TableHeader><TableBody>{quotations.map((quotation) => { const latest = quotation.revisions[0]; return <TableRow key={quotation.id}><TableCell><Link href={`/admin/sales-quotations/${quotation.id}`} className="font-mono text-xs font-semibold hover:underline">{quotation.quotationNumber}</Link></TableCell><TableCell>{quotation.customer.companyName}<p className="text-xs text-muted-foreground">{latest?.quotationDate.toLocaleDateString('en-CA') ?? '—'}</p></TableCell><TableCell>{latest ? <><p>R{latest.revisionNumber}</p><Badge variant={latest.state === 'FINALIZED' || latest.state === 'ISSUED' ? 'default' : 'secondary'}>{latest.state}</Badge></> : '—'}</TableCell><TableCell>{latest?.items.slice(0, 2).map((item) => <p key={item.id} className="text-xs">{item.quantity.toString()} {item.unit} · {latest.currency} {item.unitPrice.toString()} · {item.quotationProductId ? 'Quote product' : item.productId ? 'Catalog' : 'One-off'}</p>)}{latest && latest.items.length > 2 ? <p className="text-xs text-muted-foreground">+{latest.items.length - 2} more lines</p> : null}</TableCell><TableCell className="font-medium tabular-nums">{latest ? `${latest.currency} ${latest.total.toString()}` : '—'}</TableCell><TableCell>{quotation.outcomeStatus}</TableCell><TableCell className="text-right text-muted-foreground">{quotation.updatedAt.toLocaleDateString('en-CA')}</TableCell></TableRow> })}</TableBody></Table>}
      </CardContent></Card>
      <Pagination page={page} total={total} totalPages={Math.ceil(total / pageSize)} />
    </div>
  )
}

const stateValues: SalesQuotationRevisionState[] = ['DRAFT', 'READY', 'FINALIZING', 'FINALIZED', 'ISSUED', 'VOID']
const outcomeValues: SalesQuotationOutcomeStatus[] = ['OPEN', 'ACCEPTED', 'REJECTED', 'CANCELLED']
