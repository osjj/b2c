import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, ArrowRight, BriefcaseBusiness, Eye, Pencil, Plus, Search } from 'lucide-react'
import { listAdminCases } from '@/lib/cases/data'
import { CASE_STATUSES, caseStatusSchema } from '@/lib/cases/types'
import { isCasePrivateImage } from '@/lib/cases/private-image-path'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: 'Procurement Cases | Admin',
  robots: { index: false, follow: false },
}

const statusLabels = { DRAFT: 'Draft', PUBLISHED: 'Published', ARCHIVED: 'Archived' }
const pageSize = 15

function dateLabel(value: string) {
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(value))
}

export default async function AdminCasesPage({ searchParams }: {
  searchParams: Promise<{ search?: string; status?: string; page?: string }>
}) {
  const params = await searchParams
  const search = (params.search ?? '').trim().slice(0, 200)
  const parsedStatus = caseStatusSchema.safeParse(params.status)
  const status = parsedStatus.success ? parsedStatus.data : 'all'
  const cases = await listAdminCases()
  const searchText = search.toLocaleLowerCase('en')
  const filtered = cases.filter((item) => (status === 'all' || item.status === status)
    && (!searchText || [item.title, item.slug, item.country, item.industry].some((value) => value.toLocaleLowerCase('en').includes(searchText))))
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const requestedPage = Number(params.page ?? '1')
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? Math.min(requestedPage, pageCount) : 1
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize)
  const pageUrl = (destination: number) => {
    const query = new URLSearchParams({ page: String(destination) })
    if (search) query.set('search', search)
    if (status !== 'all') query.set('status', status)
    return `/admin/cases?${query.toString()}`
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Content / Procurement records</p>
          <h1 className="text-2xl font-semibold tracking-tight">Procurement cases</h1>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">Manage real purchasing stories. Drafts and archived cases are not displayed on the public website.</p>
        </div>
        <Button asChild className="min-h-11"><Link href="/admin/cases/new"><Plus className="mr-2 size-4" />New case</Link></Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {CASE_STATUSES.map((value) => (
          <div key={value} className="flex items-center justify-between rounded-lg border bg-card px-5 py-4">
            <span className="text-sm text-muted-foreground">{statusLabels[value]}</span>
            <span className="font-mono text-xl tabular-nums">{cases.filter((item) => item.status === value).length}</span>
          </div>
        ))}
      </div>

      <form method="get" className="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-4">
        <div className="min-w-0 flex-1 space-y-2 sm:min-w-64">
          <label htmlFor="case-search" className="text-xs font-medium">Search cases</label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input id="case-search" name="search" defaultValue={search} maxLength={200} placeholder="Title, country or industry" className="min-h-11 pl-10" />
          </div>
        </div>
        <div className="space-y-2">
          <label htmlFor="case-status-filter" className="text-xs font-medium">Status</label>
          <select id="case-status-filter" name="status" defaultValue={status} className="h-11 w-44 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <option value="all">All statuses</option>
            {CASE_STATUSES.map((value) => <option key={value} value={value}>{statusLabels[value]}</option>)}
          </select>
        </div>
        <Button type="submit" variant="outline" className="min-h-11">Apply filters</Button>
        {search || status !== 'all' ? <Button asChild variant="ghost" className="min-h-11"><Link href="/admin/cases">Clear</Link></Button> : null}
      </form>

      <div className="overflow-hidden rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">Cover</TableHead>
              <TableHead>Case / Buyer context</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Order date</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.length ? visible.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <div className="relative flex h-12 w-16 items-center justify-center overflow-hidden rounded bg-muted">
                    {item.coverImage ? <Image src={item.coverImage} alt={item.coverAlt} fill sizes="64px" unoptimized={isCasePrivateImage(item.coverImage)} className={isCasePrivateImage(item.coverImage) ? 'object-contain' : 'object-cover'} /> : <BriefcaseBusiness className="size-5 text-muted-foreground" aria-label="No documentary cover image" />}
                  </div>
                </TableCell>
                <TableCell className="max-w-sm whitespace-normal">
                  <Link className="font-medium hover:underline underline-offset-4" href={`/admin/cases/${item.id}`}>{item.title}</Link>
                  <p className="mt-1 text-xs text-muted-foreground">{[item.country, item.industry].filter(Boolean).join(' · ') || 'Buyer context not added yet'}</p>
                  <p className="mt-1 break-all font-mono text-[11px] text-muted-foreground">/cases/{item.slug}</p>
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <Badge variant={item.status === 'PUBLISHED' ? 'default' : 'outline'}>{statusLabels[item.status]}</Badge>
                    {item.featured ? <p className="text-xs text-muted-foreground">Featured · Order {item.sortOrder}</p> : null}
                  </div>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{item.cooperationDate ? dateLabel(item.cooperationDate) : '—'}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{dateLabel(item.updatedAt)}<p className="mt-1 font-mono">v{item.version}</p></TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Button asChild variant="ghost" size="icon" className="size-11"><Link href={`/admin/cases/${item.id}/preview`} aria-label={`Preview ${item.title}`}><Eye className="size-4" /></Link></Button>
                    <Button asChild variant="ghost" size="icon" className="size-11"><Link href={`/admin/cases/${item.id}`} aria-label={`Edit ${item.title}`}><Pencil className="size-4" /></Link></Button>
                  </div>
                </TableCell>
              </TableRow>
            )) : (
              <TableRow><TableCell colSpan={6} className="px-6 py-16 text-center">
                <BriefcaseBusiness className="mx-auto mb-4 size-7 text-muted-foreground" />
                <p className="font-medium">{cases.length ? 'No cases match these filters' : 'Your procurement case library starts here'}</p>
                <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{cases.length ? 'Try another search or clear the status filter.' : 'Create a factual draft, review permissions and preview it before choosing to publish.'}</p>
              </TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
        <p>{filtered.length} case{filtered.length === 1 ? '' : 's'} · Page {page} of {pageCount}</p>
        <nav aria-label="Case list pagination" className="flex gap-2">
          {page > 1 ? <Button asChild variant="outline" className="min-h-11"><Link href={pageUrl(page - 1)}><ArrowLeft className="mr-2 size-4" />Previous</Link></Button> : <Button variant="outline" disabled className="min-h-11"><ArrowLeft className="mr-2 size-4" />Previous</Button>}
          {page < pageCount ? <Button asChild variant="outline" className="min-h-11"><Link href={pageUrl(page + 1)}>Next<ArrowRight className="ml-2 size-4" /></Link></Button> : <Button variant="outline" disabled className="min-h-11">Next<ArrowRight className="ml-2 size-4" /></Button>}
        </nav>
      </div>
    </div>
  )
}
