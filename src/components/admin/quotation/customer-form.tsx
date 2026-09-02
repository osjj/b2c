'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Save, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { createBusinessCustomer, updateBusinessCustomer } from '@/actions/admin/business-customers'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { businessCustomerInputSchema, type BusinessCustomerInput } from '@/lib/quotation/schemas'

type CustomerFormValue = BusinessCustomerInput
type CustomerFieldErrors = Record<string, string[]>

const customerFieldLabels: Record<string, string> = {
  companyName: 'Company name',
  countryCode: 'Country code',
  email: 'General email',
  phone: 'General phone',
  address: 'Address',
  notes: 'Internal notes',
  contacts: 'Contacts',
}

function compactFieldErrors(errors: Record<string, string[] | undefined>): CustomerFieldErrors {
  const result: CustomerFieldErrors = {}
  for (const [field, messages] of Object.entries(errors)) {
    if (messages && messages.length > 0) result[field] = messages
  }
  return result
}

const emptyContact = (): CustomerFormValue['contacts'][number] => ({
  name: '', title: null, email: null, phone: null, isPrimary: false,
})

const emptyCustomer: CustomerFormValue = {
  companyName: '', countryCode: null, email: null, phone: null, address: null, notes: null, isActive: true, contacts: [emptyContact()],
}

export function CustomerForm({ initialValue }: { initialValue?: CustomerFormValue }) {
  const [value, setValue] = useState<CustomerFormValue>(initialValue ?? emptyCustomer)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<CustomerFieldErrors>({})
  const router = useRouter()

  const updateContact = (index: number, patch: Partial<CustomerFormValue['contacts'][number]>) => {
    setValue((current) => ({ ...current, contacts: current.contacts.map((contact, position) => position === index ? { ...contact, ...patch } : contact) }))
  }

  const submit = () => {
    setError(null)
    setFieldErrors({})
    const parsed = businessCustomerInputSchema.safeParse(value)
    if (parsed.success === false) {
      setError('Please correct the highlighted customer details')
      setFieldErrors(compactFieldErrors(parsed.error.flatten().fieldErrors))
      toast.error('Please correct the customer details')
      return
    }

    startTransition(async () => {
      const result = parsed.data.id
        ? await updateBusinessCustomer(parsed.data)
        : await createBusinessCustomer(parsed.data)
      if (result.success === false) {
        setError(result.reason)
        setFieldErrors(result.errors ?? {})
        toast.error(result.reason)
        return
      }
      toast.success(result.reason)
      router.push('/admin/business-customers')
      router.refresh()
    })
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,.7fr)]">
      <Card><CardHeader><CardTitle className="font-serif">Company details</CardTitle></CardHeader><CardContent className="grid gap-5 sm:grid-cols-2">
        <Field label="Company name" required><Input value={value.companyName} onChange={(event) => setValue({ ...value, companyName: event.target.value })} /></Field>
        <Field label="Country code"><Input value={value.countryCode ?? ''} maxLength={2} placeholder="US" onChange={(event) => setValue({ ...value, countryCode: event.target.value.toUpperCase() || null })} /></Field>
        <Field label="General email"><Input type="email" value={value.email ?? ''} onChange={(event) => setValue({ ...value, email: event.target.value || null })} /></Field>
        <Field label="General phone"><Input value={value.phone ?? ''} onChange={(event) => setValue({ ...value, phone: event.target.value || null })} /></Field>
        <div className="sm:col-span-2"><Field label="Address"><Textarea rows={3} value={value.address ?? ''} onChange={(event) => setValue({ ...value, address: event.target.value || null })} /></Field></div>
        <div className="sm:col-span-2"><Field label="Internal notes"><Textarea rows={4} value={value.notes ?? ''} onChange={(event) => setValue({ ...value, notes: event.target.value || null })} /></Field></div>
        <div className="flex items-center gap-3 sm:col-span-2"><Switch checked={value.isActive} onCheckedChange={(checked) => setValue({ ...value, isActive: checked })} /><Label>Active customer</Label></div>
      </CardContent></Card>

      <Card><CardHeader className="flex-row items-center justify-between"><CardTitle className="font-serif">Contacts</CardTitle><Button type="button" size="sm" variant="outline" onClick={() => setValue({ ...value, contacts: [...value.contacts, emptyContact()] })}><Plus className="mr-2 h-4 w-4" />Add</Button></CardHeader><CardContent className="space-y-5">
        {value.contacts.map((contact, index) => <div key={contact.id ?? `new-${index}`} className="space-y-3 rounded-xl border bg-muted/20 p-4">
          <div className="flex items-center justify-between"><p className="text-sm font-medium">Contact {index + 1}</p><Button type="button" size="icon" variant="ghost" aria-label="Remove contact" disabled={value.contacts.length === 1} onClick={() => setValue({ ...value, contacts: value.contacts.filter((_, position) => position !== index) })}><Trash2 className="h-4 w-4" /></Button></div>
          <Field label="Name" required htmlFor={`contact-${index}-name`}><Input id={`contact-${index}-name`} value={contact.name} onChange={(event) => updateContact(index, { name: event.target.value })} /></Field>
          <Field label="Title" htmlFor={`contact-${index}-title`}><Input id={`contact-${index}-title`} value={contact.title ?? ''} onChange={(event) => updateContact(index, { title: event.target.value || null })} /></Field>
          <Field label="Email" htmlFor={`contact-${index}-email`}><Input id={`contact-${index}-email`} type="email" aria-invalid={Boolean(fieldErrors.contacts)} value={contact.email ?? ''} onChange={(event) => updateContact(index, { email: event.target.value || null })} /></Field>
          <Field label="Phone" htmlFor={`contact-${index}-phone`}><Input id={`contact-${index}-phone`} value={contact.phone ?? ''} onChange={(event) => updateContact(index, { phone: event.target.value || null })} /></Field>
          <label className="flex items-center gap-3 text-sm"><Switch checked={contact.isPrimary} onCheckedChange={(checked) => setValue({ ...value, contacts: value.contacts.map((entry, position) => ({ ...entry, isPrimary: position === index ? checked : checked ? false : entry.isPrimary })) })} />Primary contact</label>
        </div>)}
      </CardContent></Card>

      <div className="flex items-start justify-end gap-3 xl:col-span-2">
        {error ? <div role="alert" className="mr-auto space-y-1 text-sm text-destructive">
          <p>{error}</p>
          {Object.entries(fieldErrors).flatMap(([field, messages]) => messages.map((message) => (
            <p key={`${field}-${message}`}>{customerFieldLabels[field] ?? field}: {message}</p>
          )))}
        </div> : null}
        <Button type="button" onClick={submit} disabled={isPending}><Save className="mr-2 h-4 w-4" />{isPending ? 'Saving…' : 'Save customer'}</Button>
      </div>
    </div>
  )
}

function Field({ label, required = false, htmlFor, children }: { label: string; required?: boolean; htmlFor?: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label htmlFor={htmlFor}>{label}{required ? <span className="text-destructive"> *</span> : null}</Label>{children}</div>
}
