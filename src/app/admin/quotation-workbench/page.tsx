import Link from 'next/link'
import { ArrowRight, BookOpenCheck, Building2, FileClock, PackageSearch, ReceiptText } from 'lucide-react'
import { notFound } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { ReconciliationAction } from '@/components/admin/quotation/reconciliation-action'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { requireAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { isQuotationWorkbenchEnabled } from '@/lib/quotation/feature'

const quickLinks = [
  {
    href: '/admin/business-customers',
    title: 'Business customers',
    description: 'Companies, contacts and quotation defaults.',
    icon: Building2,
  },
  {
    href: '/admin/quotation-products',
    title: 'Quotation products',
    description: 'Reusable products that do not need to exist in the storefront.',
    icon: PackageSearch,
  },
  {
    href: '/admin/sales-quotations',
    title: 'Sales quotations',
    description: 'Manual drafts, revisions and immutable customer documents.',
    icon: ReceiptText,
  },
] as const

export default async function QuotationWorkbenchPage() {
  if (!isQuotationWorkbenchEnabled()) notFound()
  await requireAdmin()

  const [customerCount, productCount, quotationCount, draftCount, finalizedCount] = await Promise.all([
    prisma.businessCustomer.count({ where: { isActive: true } }),
    prisma.quotationProduct.count({ where: { status: { not: 'INACTIVE' } } }),
    prisma.salesQuotation.count(),
    prisma.salesQuotationRevision.count({ where: { state: { in: ['DRAFT', 'READY'] } } }),
    prisma.salesQuotationRevision.count({ where: { state: { in: ['FINALIZED', 'ISSUED'] } } }),
  ])

  const metrics = [
    { label: 'Active customers', value: customerCount, icon: Building2 },
    { label: 'Quotation products', value: productCount, icon: PackageSearch },
    { label: 'All quotations', value: quotationCount, icon: BookOpenCheck },
    { label: 'Open revisions', value: draftCount, icon: FileClock },
    { label: 'Finalized / issued', value: finalizedCount, icon: ReceiptText },
  ] as const

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-2xl border bg-[linear-gradient(135deg,hsl(var(--card)),hsl(var(--muted)/.62))] p-7 shadow-sm">
        <div className="absolute -right-12 -top-16 h-52 w-52 rounded-full border border-primary/15" />
        <div className="absolute -right-2 top-4 h-28 w-28 rounded-full bg-primary/5" />
        <div className="relative max-w-3xl space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Internal sales desk</p>
          <h1 className="font-serif text-3xl tracking-tight md:text-4xl">Quotation workbench</h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
            Build customer quotations from reusable quote-only products, catalog products, or one-off lines.
            This workspace is isolated from the public storefront and existing customer inquiry flow.
          </p>
          <div className="mt-2 flex flex-wrap gap-3"><Button asChild><Link href="/admin/sales-quotations/new">Create quotation<ArrowRight className="ml-2 h-4 w-4" /></Link></Button><ReconciliationAction /></div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {metrics.map((metric) => (
          <Card key={metric.label} className="gap-3 py-5">
            <CardHeader className="flex-row items-center justify-between px-5">
              <CardDescription>{metric.label}</CardDescription>
              <metric.icon className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent className="px-5">
              <p className="font-serif text-3xl tabular-nums">{metric.value}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        {quickLinks.map((item) => (
          <Card key={item.href} className="group transition-shadow hover:shadow-md">
            <CardHeader>
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl border bg-muted/60">
                <item.icon className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="font-serif text-xl">{item.title}</CardTitle>
              <CardDescription className="leading-6">{item.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="ghost" asChild className="-ml-4">
                <Link href={item.href}>
                  Open
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  )
}
