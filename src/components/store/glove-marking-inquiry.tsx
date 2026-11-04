'use client'

import Link from 'next/link'
import { useMemo, useSyncExternalStore } from 'react'

import {
  GLOVE_MARKING_INQUIRY_SOURCE,
  GLOVE_MARKING_INQUIRY_STORAGE_PREFIX,
  isGloveMarkingDraftId,
  parseGloveMarkingInquiry,
} from '@/lib/glove-marking-inquiry'
import { QuoteRequestForm } from '@/modules/home-new/components/QuoteRequestForm'

function subscribeToStorage(callback: () => void) {
  window.addEventListener('storage', callback)
  return () => window.removeEventListener('storage', callback)
}

function serverSnapshot(): undefined {
  return undefined
}

export function GloveMarkingInquiry({ draftId }: { draftId: string }) {
  const readSnapshot = useMemo(() => () => {
    if (!isGloveMarkingDraftId(draftId)) return null
    try {
      return window.sessionStorage.getItem(`${GLOVE_MARKING_INQUIRY_STORAGE_PREFIX}${draftId}`)
    } catch {
      return null
    }
  }, [draftId])
  const stored = useSyncExternalStore(subscribeToStorage, readSnapshot, serverSnapshot)
  const draft = useMemo(() => parseGloveMarkingInquiry(stored ?? null, draftId), [stored, draftId])

  if (stored === undefined) {
    return <p role="status" className="rounded-xl border bg-background p-5 text-sm">Loading your glove marking report…</p>
  }

  return (
    <div className="space-y-5">
      {draft ? (
        <aside aria-label="Your glove marking interpretation" className="rounded-xl border bg-secondary/30 p-5 text-sm">
          <h2 className="font-semibold">Your glove marking report is ready to review</h2>
          <p className="mt-2 leading-relaxed text-muted-foreground">The complete interpretation, warnings and unresolved text are included in the editable message below. This is a reference report; confirm the exact product model and supporting documents before ordering.</p>
          <Link href="/tools/glove-marking-decoder" className="mt-2 inline-flex min-h-11 items-center font-semibold text-primary hover:underline">Return to the glove decoder</Link>
        </aside>
      ) : (
        <aside role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-950">
          <h2 className="font-semibold">Your saved glove report could not be restored</h2>
          <p className="mt-2 leading-relaxed">The draft may have expired, been opened in a different browser tab, or been blocked by browser storage settings. Drafts are available for two hours in the tab where you created them.</p>
          <p className="mt-2 leading-relaxed">Decode your labels and prepare the RFQ again, or describe your requirements in the empty form below. You can also copy the complete report and email it to sales@laifappe.com.</p>
          <Link href="/tools/glove-marking-decoder" className="mt-2 inline-flex min-h-11 items-center font-semibold underline">Reopen the glove decoder</Link>
        </aside>
      )}
      {draft ? (
        <QuoteRequestForm key={draft.id} source={GLOVE_MARKING_INQUIRY_SOURCE} initialMessage={draft.message} messageMaxLength={6000} />
      ) : (
        <QuoteRequestForm key={`missing-glove-${draftId}`} source="Quote page" />
      )}
    </div>
  )
}
