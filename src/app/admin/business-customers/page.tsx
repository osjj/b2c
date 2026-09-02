import Link from 'next/link'
import { Building2, Plus, Search } from 'lucide-react'
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

export default async function BusinessCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string; status?: string }>
}) {
  if (!isQuotationWorkbenchEnabled()) notFound()
  await requireAdmin()
  const params = await searchParams
  const page = Math.max(Number(params.page) || 1, 1)
  const search = params.search?.trim() ?? ''
  const status = params.status === 'active' || params.status === 'archived' ? params.status : ''
  const pageSize = 20
  const where = {
    ...(search ? {
        OR: [
          { companyName: { contains: search, mode: 'insensitive' as const } },
          { email: { contains: search, mode: 'insensitive' as const } },
          { countryCode: { contains: search, mode: 'insensitive' as const } },
        ],
      } : {}),
    ...(status ? { isActive: status === 'active' } : {}),
  }
  const [customers, total] = await Promise.all([
    prisma.businessCustomer.findMany({
      where,
      include: { _count: { select: { contacts: true, quotations: true } } },
      orderBy: { updatedAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.businessCustomer.count({ where }),
  ])

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Quote workbench</p>
          <h1 className="mt-1 font-serif text-3xl">Business customers</h1>
          <p className="mt-1 text-sm text-muted-foreground">Customer records here are separate from storefront accounts.</p>
        </div>
        <Button asChild>
          <Link href="/admin/business-customers/new"><Plus className="mr-2 h-4 w-4" />New customer</Link>
        </Button>
      </header>

      <form className="flex max-w-2xl flex-wrap gap-3">
        <div className="relative min-w-72 flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input name="search" defaultValue={search} placeholder="Search company, email or country…" className="pl-10" /></div>
        <select name="status" defaultValue={status} className="h-9 rounded-md border bg-background px-3 text-sm"><option value="">All statuses</option><option value="active">Active</option><option value="archived">Archived</option></select>
        <Button type="submit" variant="secondary">Apply filters</Button>
      </form>

      <Card className="py-0">
        <CardContent className="p-0">
          {customers.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center gap-3 p-8 text-center">
              <Building2 className="h-9 w-9 text-muted-foreground" />
              <p className="font-medium">No business customers found</p>
              <p className="text-sm text-muted-foreground">Create one to start a manual quotation.</p>
            </div>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Company</TableHead><TableHead>Country</TableHead><TableHead>Contacts</TableHead><TableHead>Quotations</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Updated</TableHead></TableRow></TableHeader>
              <TableBody>
                {customers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell><Link href={`/admin/business-customers/${customer.id}`} className="font-medium hover:underline">{customer.companyName}</Link><p className="text-xs text-muted-foreground">{customer.email ?? 'No general email'}</p></TableCell>
                    <TableCell>{customer.countryCode ?? '—'}</TableCell>
                    <TableCell>{customer._count.contacts}</TableCell>
                    <TableCell>{customer._count.quotations}</TableCell>
                    <TableCell><Badge variant={customer.isActive ? 'secondary' : 'outline'}>{customer.isActive ? 'Active' : 'Archived'}</Badge></TableCell>
                    <TableCell className="text-right text-muted-foreground">{customer.updatedAt.toLocaleDateString('en-CA')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <Pagination page={page} total={total} totalPages={Math.ceil(total / pageSize)} />
    </div>
  )
}
