import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Pencil } from 'lucide-react'
import { getAdminCase } from '@/lib/cases/data'
import { publicCaseView } from '@/lib/cases/types'
import { CaseDetail } from '@/components/cases/case-detail'
import { CaseListing } from '@/components/cases/case-listing'
import { Button } from '@/components/ui/button'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: 'Private Procurement Case Preview | Admin',
  robots: { index: false, follow: false, noarchive: true },
}

export default async function CasePreviewPage({ params, searchParams }: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ view?: string }>
}) {
  const { id } = await params
  const record = await getAdminCase(id)
  if (!record) notFound()
  // The schema strips status, editorial permission and private notes before rendering.
  const caseStudy = publicCaseView(record)
  const view = (await searchParams).view === 'listing' ? 'listing' : 'detail'
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link href="/admin/cases" className="inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />Back to cases</Link>
        <Button asChild variant="outline" className="min-h-11"><Link href={`/admin/cases/${record.id}`}><Pencil className="mr-2 size-4" />Edit this case</Link></Button>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        <div><p className="font-medium">Private preview — {record.status === 'PUBLISHED' ? 'published record' : 'unpublished'}</p><p className="mt-1 text-xs">Administrator access only. This preview does not publish or change the case.</p></div>
        <nav aria-label="Case preview view" className="flex gap-2">
          <Button asChild variant={view === 'detail' ? 'default' : 'outline'} className="min-h-11"><Link href={`/admin/cases/${record.id}/preview`} aria-current={view === 'detail' ? 'page' : undefined}>Detail preview</Link></Button>
          <Button asChild variant={view === 'listing' ? 'default' : 'outline'} className="min-h-11"><Link href={`/admin/cases/${record.id}/preview?view=listing`} aria-current={view === 'listing' ? 'page' : undefined}>Listing preview</Link></Button>
        </nav>
      </div>
      {view === 'listing' ? <CaseListing cases={[caseStudy]} preview /> : <CaseDetail caseStudy={caseStudy} preview />}
    </div>
  )
}
