'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, CopyPlus, FileCheck2, RotateCcw, Send, ShieldAlert, Users } from 'lucide-react'
import { toast } from 'sonner'

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
  const router = useRouter()
  const finish = (result: Awaited<ReturnType<typeof copySalesQuotationRevision>>) => {
    if (result.success === false) { toast.error(result.reason); return }
    toast.success(result.reason)
    const quotationId = quotationIdFromAction(result.data)
    if (quotationId) router.push(`/admin/sales-quotations/${quotationId}`)
    router.refresh()
  }
  const transition = (targetState: QuotationRevisionState) => startTransition(async () => {
    const result = await transitionSalesQuotationRevision({ revisionId, expectedVersion: version, targetState })
    if (result.success === false) { toast.error(result.reason); return }
    toast.success(result.reason); router.refresh()
  })
  const finalize = () => startTransition(async () => {
    const result = await finalizeSalesQuotation({ revisionId, expectedVersion: version, idempotencyKey: `quotation-finalize:${revisionId}:${version}:${crypto.randomUUID()}` })
    if (result.success === false) { toast.error(result.reason); return }
    toast.success(result.reason); router.refresh()
  })
  const copyRevision = () => startTransition(async () => finish(await copySalesQuotationRevision({ revisionId, expectedVersion: version })))
  const voidAndCopy = () => {
    const reason = window.prompt('Reason for voiding this finalized revision and creating a corrected draft?')?.trim()
    if (!reason) return
    startTransition(async () => finish(await voidAndCopySalesQuotationRevision({ revisionId, expectedVersion: version, reason })))
  }
  const copyToCustomer = () => {
    if (!targetCustomerId) { toast.error('Select a different customer first'); return }
    if (!window.confirm('Create a new quotation number for the selected customer? The current quotation remains unchanged.')) return
    startTransition(async () => finish(await copySalesQuotationToCustomer({ revisionId, expectedVersion: version, customerId: targetCustomerId })))
  }
  const setOutcome = (outcomeStatus: 'ACCEPTED' | 'REJECTED' | 'CANCELLED') => {
    if (!window.confirm(`Mark this quotation ${outcomeStatus.toLowerCase()}?`)) return
    startTransition(async () => finish(await setSalesQuotationOutcome({ revisionId, expectedVersion: version, outcomeStatus })))
  }

  return <div className="flex max-w-3xl flex-wrap items-center justify-end gap-2">
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
}

function quotationIdFromAction(data: unknown): string | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null
  const quotationId = (data as Record<string, unknown>).quotationId
  return typeof quotationId === 'string' ? quotationId : null
}
