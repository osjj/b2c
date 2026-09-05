'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, CopyPlus, FileCheck2, Loader2, RotateCcw, Send, ShieldAlert, Users } from 'lucide-react'

import {
  copySalesQuotationRevision,
  copySalesQuotationToCustomer,
  finalizeSalesQuotation,
  setSalesQuotationOutcome,
  transitionSalesQuotationRevision,
  voidAndCopySalesQuotationRevision,
} from '@/actions/admin/sales-quotations'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { QuotationRevisionState } from '@/lib/quotation/state-machine'

type RevisionCustomer = { id: string; companyName: string }

export function RevisionActions({ revisionId, version, state, customers, currentCustomerId, outcomeStatus }: {
  revisionId: string
  version: number
  state: QuotationRevisionState
  customers: RevisionCustomer[]
  currentCustomerId: string
  outcomeStatus: 'OPEN' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED'
}) {
  const [isPending, startTransition] = useTransition()
  const [targetCustomerId, setTargetCustomerId] = useState('')
  const [feedback, setFeedback] = useState<{ error: boolean; message: string } | null>(null)
  const [pendingLabel, setPendingLabel] = useState('')
  const actionInFlight = useRef(false)
  const router = useRouter()
  const runAction = (label: string, action: () => ReturnType<typeof copySalesQuotationRevision>) => {
    if (actionInFlight.current || isPending) return
    actionInFlight.current = true
    setFeedback(null)
    setPendingLabel(label)
    startTransition(async () => {
      try {
        const result = await action()
        setFeedback({ error: !result.success, message: result.reason })
        if (result.success) {
          const quotationId = quotationIdFromAction(result.data)
          if (quotationId) router.push(`/admin/sales-quotations/${quotationId}`)
        }
      } catch {
        // A lost response does not mean the server cancelled the operation; never auto-retry.
        setFeedback({ error: true, message: 'The server response could not be received. Refresh and check the quotation status and formal documents before retrying.' })
      } finally {
        actionInFlight.current = false
        // Failed finalization also increments the version while restoring READY.
        router.refresh()
      }
    })
  }
  const transition = (targetState: QuotationRevisionState) => runAction('Updating revision…', () =>
    transitionSalesQuotationRevision({ revisionId, expectedVersion: version, targetState }))
  const finalize = () => runAction('Generating quotation documents…', () =>
    finalizeSalesQuotation({ revisionId, expectedVersion: version, idempotencyKey: `quotation-finalize:${revisionId}:${version}:${crypto.randomUUID()}` }))
  const copyRevision = () => runAction('Copying revision…', () => copySalesQuotationRevision({ revisionId, expectedVersion: version }))
  const voidAndCopy = () => {
    const reason = window.prompt('Reason for voiding this finalized revision and creating a corrected draft?')?.trim()
    if (!reason) return
    runAction('Creating corrected draft…', () => voidAndCopySalesQuotationRevision({ revisionId, expectedVersion: version, reason }))
  }
  const copyToCustomer = () => {
    if (!targetCustomerId) { setFeedback({ error: true, message: 'Select a different customer first' }); return }
    if (!window.confirm('Create a new quotation number for the selected customer? The current quotation remains unchanged.')) return
    runAction('Copying quotation…', () => copySalesQuotationToCustomer({ revisionId, expectedVersion: version, customerId: targetCustomerId }))
  }
  const setOutcome = (outcomeStatus: 'ACCEPTED' | 'REJECTED' | 'CANCELLED') => {
    if (!window.confirm(`Mark this quotation ${outcomeStatus.toLowerCase()}?`)) return
    runAction('Updating quotation outcome…', () => setSalesQuotationOutcome({ revisionId, expectedVersion: version, outcomeStatus }))
  }

  return <div className="flex min-w-0 max-w-3xl flex-col gap-3" aria-busy={isPending}>
    <div className="flex flex-wrap items-center justify-end gap-2">
    {state === 'DRAFT' ? <Button disabled={isPending} onClick={() => { if (window.confirm('Mark this revision ready for final review?')) transition('READY') }}><Check className="mr-2 h-4 w-4" />Mark ready</Button> : null}
    {state === 'READY' ? <><Button variant="outline" disabled={isPending} onClick={() => { if (window.confirm('Return this revision to draft editing?')) transition('DRAFT') }}><RotateCcw className="mr-2 h-4 w-4" />Return to draft</Button><Button disabled={isPending} onClick={() => { if (window.confirm('Finalize this revision and create immutable customer documents?')) finalize() }}><FileCheck2 className="mr-2 h-4 w-4" />Finalize documents</Button></> : null}
    {state === 'FINALIZED' ? <><Button disabled={isPending} onClick={() => { if (window.confirm('Confirm this exact finalized revision was issued to the customer?')) transition('ISSUED') }}><Send className="mr-2 h-4 w-4" />Mark issued</Button><Button variant="destructive" disabled={isPending} onClick={voidAndCopy}><ShieldAlert className="mr-2 h-4 w-4" />Void & copy correction</Button></> : null}
    {state === 'ISSUED' && outcomeStatus === 'OPEN' ? <><Button variant="outline" disabled={isPending} onClick={copyRevision}><CopyPlus className="mr-2 h-4 w-4" />Create revision</Button><Button variant="outline" disabled={isPending} onClick={() => setOutcome('ACCEPTED')}>Accept</Button><Button variant="outline" disabled={isPending} onClick={() => setOutcome('REJECTED')}>Reject</Button><Button variant="destructive" disabled={isPending} onClick={() => setOutcome('CANCELLED')}>Cancel</Button></> : null}
    <div className="flex min-w-72 items-center gap-2 rounded-lg border bg-background p-1">
      <Users className="ml-2 h-4 w-4 text-muted-foreground" />
      <Select value={targetCustomerId} onValueChange={setTargetCustomerId}><SelectTrigger className="border-0 shadow-none"><SelectValue placeholder="Copy to another customer" /></SelectTrigger><SelectContent>{customers.filter((customer) => customer.id !== currentCustomerId).map((customer) => <SelectItem key={customer.id} value={customer.id}>{customer.companyName}</SelectItem>)}</SelectContent></Select>
      <Button type="button" size="sm" variant="secondary" disabled={isPending || !targetCustomerId} onClick={copyToCustomer}>Copy</Button>
    </div>
    </div>
    {isPending ? <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 aria-hidden="true" className="h-4 w-4 motion-safe:animate-spin" />{pendingLabel} Please do not submit again.</p> : null}
    {feedback ? <div role={feedback.error ? 'alert' : 'status'} className={`rounded-lg border p-3 text-sm break-words ${feedback.error ? 'border-destructive/30 bg-destructive/5 text-destructive' : 'border-border bg-muted text-foreground'}`}>
      {feedback.message}
      {feedback.error ? <Button type="button" variant="outline" size="sm" className="ml-2" disabled={isPending} onClick={() => router.refresh()}>Refresh status</Button> : null}
    </div> : null}
  </div>
}

function quotationIdFromAction(data: unknown): string | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null
  const quotationId = (data as Record<string, unknown>).quotationId
  return typeof quotationId === 'string' ? quotationId : null
}
