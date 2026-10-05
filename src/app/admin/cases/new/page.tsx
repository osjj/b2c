import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { requireAdmin } from '@/lib/auth-utils'
import { CaseForm } from '@/components/admin/case-form'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'New Procurement Case | Admin', robots: { index: false, follow: false } }

export default async function NewCasePage() {
  await requireAdmin()
  return (
    <div className="space-y-6">
      <Link href="/admin/cases" className="inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />Back to cases</Link>
      <div className="space-y-2">
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">New procurement record</p>
        <h1 className="text-2xl font-semibold tracking-tight">Create a procurement case</h1>
        <p className="text-sm text-muted-foreground">Start with confirmed facts. This case remains an unpublished draft until you explicitly publish it.</p>
      </div>
      <CaseForm />
    </div>
  )
}
