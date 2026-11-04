'use client'

import Link from 'next/link'
import { useMemo, useSyncExternalStore } from 'react'

import {
  FOOTWEAR_INQUIRY_SOURCE,
  FOOTWEAR_INQUIRY_STORAGE_PREFIX,
  isFootwearInquiryDraftId,
  parseFootwearInquiry,
} from '@/lib/footwear-size-inquiry'
import { QuoteRequestForm } from '@/modules/home-new/components/QuoteRequestForm'

function subscribeToStorage(callback: () => void) {
  window.addEventListener('storage', callback)
  return () => window.removeEventListener('storage', callback)
}

function serverSnapshot(): undefined {
  return undefined
}

export function FootwearAllocationInquiry({ draftId }: { draftId: string }) {
  const readSnapshot = useMemo(() => () => {
    if (!isFootwearInquiryDraftId(draftId)) return null
    try {
      return window.sessionStorage.getItem(`${FOOTWEAR_INQUIRY_STORAGE_PREFIX}${draftId}`)
    } catch {
      return null
    }
  }, [draftId])
  const stored = useSyncExternalStore(subscribeToStorage, readSnapshot, serverSnapshot)
  const draft = useMemo(() => parseFootwearInquiry(stored ?? null, draftId), [stored, draftId])

  if (stored === undefined) {
    return <p role="status" className="rounded-xl border bg-background p-5 text-sm">Loading your size allocation…</p>
  }

  return (
    <div className="space-y-5">
      {draft ? (
        <aside aria-label="Your footwear size allocation" className="rounded-xl border bg-secondary/30 p-5 text-sm">
          <h2 className="font-semibold">Your footwear size allocation is ready to review</h2>
          <p className="mt-2 leading-relaxed text-muted-foreground">
            {draft.plan.totals.order.toLocaleString('en-US')} pairs across {draft.plan.rows.length} size groups are included in the editable message below. Check the quantities and add your product and delivery requirements before submitting.
          </p>
          <Link href="/tools/footwear-size-allocation" className="mt-2 inline-flex min-h-11 items-center font-semibold text-primary hover:underline">Return to the size allocator</Link>
        </aside>
      ) : (
        <aside role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-950">
          <h2 className="font-semibold">Your saved size allocation could not be restored</h2>
          <p className="mt-2 leading-relaxed">The draft may have expired, been opened in a different browser tab, or been blocked by browser storage settings. Drafts are available for two hours in the tab where you created them.</p>
          <p className="mt-2 leading-relaxed">Return to the allocator and send the plan again, or describe your requirements in the empty form below. You can also email your exported Excel file to sales@laifappe.com.</p>
          <Link href="/tools/footwear-size-allocation" className="mt-2 inline-flex min-h-11 items-center font-semibold underline">Reopen the size allocator</Link>
        </aside>
      )}
      {draft ? (
        <QuoteRequestForm key={draft.id} source={FOOTWEAR_INQUIRY_SOURCE} initialMessage={draft.message} messageMaxLength={6000} />
      ) : (
        <QuoteRequestForm key={`missing-${draftId}`} source="Quote page" />
      )}
    </div>
  )
}
