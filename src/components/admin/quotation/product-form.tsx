'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Save } from 'lucide-react'
import { toast } from 'sonner'

import { createQuotationProduct, updateQuotationProduct } from '@/actions/admin/quotation-products'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { QuotationProductInput } from '@/lib/quotation/schemas'

const emptyProduct: QuotationProductInput = {
  productId: null, nameZh: null, nameEn: null, sku: null, model: null, unit: 'pcs', moq: null,
  specifications: [], standards: [], certificates: [], internalNotes: null, status: 'DRAFT',
}

export function QuotationProductForm({ initialValue }: { initialValue?: QuotationProductInput & { internalNumber?: string } }) {
  const [value, setValue] = useState<QuotationProductInput>(initialValue ?? emptyProduct)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const setLines = (field: 'specifications' | 'standards' | 'certificates', text: string) => setValue({ ...value, [field]: text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean) })
  const submit = () => startTransition(async () => {
    setError(null)
    const result = value.id ? await updateQuotationProduct(value) : await createQuotationProduct(value)
    if (result.success === false) { setError(result.reason); toast.error(result.reason); return }
    toast.success(result.reason); router.push('/admin/quotation-products'); router.refresh()
  })

  return <div className="space-y-6">
    <Card><CardHeader><CardTitle className="font-serif">Product identity</CardTitle></CardHeader><CardContent className="grid gap-5 md:grid-cols-2">
      {initialValue?.internalNumber ? <Field label="Internal number"><Input readOnly value={initialValue.internalNumber} className="font-mono" /></Field> : null}
      <Field label="Status"><Select value={value.status} onValueChange={(status: QuotationProductInput['status']) => setValue({ ...value, status })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="DRAFT">Draft</SelectItem><SelectItem value="ACTIVE">Active</SelectItem><SelectItem value="INACTIVE">Inactive</SelectItem></SelectContent></Select></Field>
      <Field label="English name"><Input value={value.nameEn ?? ''} onChange={(event) => setValue({ ...value, nameEn: event.target.value || null })} /></Field>
      <Field label="Chinese name"><Input value={value.nameZh ?? ''} onChange={(event) => setValue({ ...value, nameZh: event.target.value || null })} /></Field>
      <Field label="Model"><Input value={value.model ?? ''} onChange={(event) => setValue({ ...value, model: event.target.value || null })} /></Field>
      <Field label="SKU"><Input value={value.sku ?? ''} onChange={(event) => setValue({ ...value, sku: event.target.value || null })} /></Field>
      <Field label="Unit"><Input value={value.unit} onChange={(event) => setValue({ ...value, unit: event.target.value })} /></Field>
      <Field label="MOQ"><Input inputMode="decimal" value={value.moq ?? ''} onChange={(event) => setValue({ ...value, moq: event.target.value || null })} /></Field>
    </CardContent></Card>
    <div className="grid gap-6 lg:grid-cols-3">
      <Multiline title="Specifications" hint="One bullet per line" value={value.specifications.join('\n')} onChange={(text) => setLines('specifications', text)} />
      <Multiline title="Standards" hint="Only enter verified standards" value={value.standards.join('\n')} onChange={(text) => setLines('standards', text)} />
      <Multiline title="Certificates" hint="Only enter confirmed certificates" value={value.certificates.join('\n')} onChange={(text) => setLines('certificates', text)} />
    </div>
    <Card><CardHeader><CardTitle className="font-serif">Internal notes</CardTitle></CardHeader><CardContent><Textarea rows={5} value={value.internalNotes ?? ''} onChange={(event) => setValue({ ...value, internalNotes: event.target.value || null })} /></CardContent></Card>
    <div className="flex items-center justify-end gap-3">{error ? <p role="alert" className="mr-auto text-sm text-destructive">{error}</p> : null}<Button type="button" onClick={submit} disabled={isPending}><Save className="mr-2 h-4 w-4" />{isPending ? 'Saving…' : 'Save quotation product'}</Button></div>
  </div>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="space-y-2"><Label>{label}</Label>{children}</div> }
function Multiline({ title, hint, value, onChange }: { title: string; hint: string; value: string; onChange: (value: string) => void }) { return <Card><CardHeader><CardTitle className="font-serif text-lg">{title}</CardTitle><p className="text-xs text-muted-foreground">{hint}</p></CardHeader><CardContent><Textarea rows={10} value={value} onChange={(event) => onChange(event.target.value)} /></CardContent></Card> }

