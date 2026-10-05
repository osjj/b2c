import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { getAdminCase } from '@/lib/cases/data'
import { CaseForm } from '@/components/admin/case-form'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Edit Procurement Case | Admin', robots: { index: false, follow: false } }

export default async function EditCasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const caseStudy = await getAdminCase(id)
  if (!caseStudy) notFound()
  return (
    <div className="space-y-6">
      <Link href="/admin/cases" className="inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />Back to cases</Link>
      <div className="space-y-2">
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Procurement record / Edit</p>
        <h1 className="text-2xl font-semibold tracking-tight">Edit procurement case</h1>
        <p className="text-sm text-muted-foreground">{caseStudy.title}</p>
      </div>
      <CaseForm key={caseStudy.id} caseStudy={caseStudy} />
    </div>
  )
}
