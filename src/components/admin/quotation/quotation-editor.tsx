'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowDown, ArrowUp, ClipboardPaste, PackagePlus, Plus, Save, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { createSalesQuotation, updateSalesQuotation } from '@/actions/admin/sales-quotations'
import { createQuotationProduct } from '@/actions/admin/quotation-products'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { currencyMinorUnit } from '@/lib/quotation/currency'
import type { CreateSalesQuotationInput, QuotationItemInput } from '@/lib/quotation/schemas'

export type QuotationCustomerOption = { id: string; companyName: string; countryCode: string | null }
export type QuotationProductOption = {
  id: string
  kind: 'QUOTATION' | 'CATALOG'
  label: string
  nameZh: string | null
  nameEn: string | null
  sku: string | null
  model: string | null
  unit: string
  specifications: string[]
}
export type SerializableQuotationInput = Omit<CreateSalesQuotationInput, 'quotationDate' | 'validUntil'> & {
  quotationDate: string
  validUntil: string | null
}

type EditorProps = {
  customers: QuotationCustomerOption[]
  products: QuotationProductOption[]
  initialValue?: SerializableQuotationInput
  revisionId?: string
  expectedVersion?: number
}

const newLine = (sortOrder: number): QuotationItemInput => ({
  quotationProductId: null, productId: null, sortOrder, nameZh: null, nameEn: '', model: null, sku: null,
  specifications: [], unit: 'pcs', quantity: '1', unitPrice: '0', discountAmount: '0', discountPercent: null,
  unitCost: null, costCurrency: null, exchangeRate: null, internalNotes: null,
})

function defaultValue(customers: QuotationCustomerOption[]): SerializableQuotationInput {
  const today = new Date().toISOString().slice(0, 10)
  return {
    customerId: customers[0]?.id ?? '', quotationDate: today, validUntil: null, documentLanguage: 'ENGLISH', currency: 'USD',
    currencyMinorUnit: 2, roundingMode: 'HALF_UP', publicTerms: {}, internalNotes: null, discountAmount: '0', discountPercent: null,
    shippingFee: '0', otherFee: '0', taxRate: '0', roundingAdjustment: '0', items: [newLine(0)],
  }
}

export function QuotationEditor({ customers, products, initialValue, revisionId, expectedVersion }: EditorProps) {
  const [value, setValue] = useState<SerializableQuotationInput>(initialValue ?? defaultValue(customers))
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [pasteText, setPasteText] = useState('')
  const router = useRouter()
  const previewSubtotal = useMemo(() => value.items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0) - Number(item.discountAmount || 0), 0), [value.items])
  const pastePreview = useMemo(() => parsePastedLines(pasteText), [pasteText])

  const updateItem = (index: number, patch: Partial<QuotationItemInput>) => setValue((current) => ({ ...current, items: current.items.map((item, position) => position === index ? { ...item, ...patch } : item) }))
  const reorder = (index: number, offset: number) => setValue((current) => {
    const next = [...current.items]
    const target = index + offset
    if (target < 0 || target >= next.length) return current
    const selected = next[index]
    if (!selected) return current
    next.splice(index, 1)
    next.splice(target, 0, selected)
    return { ...current, items: next.map((item, sortOrder) => ({ ...item, sortOrder })) }
  })
  const selectSource = (index: number, selected: string) => {
    if (selected === 'ONE_OFF') { updateItem(index, { quotationProductId: null, productId: null }); return }
    const product = products.find((entry) => `${entry.kind}:${entry.id}` === selected)
    if (!product) return
    updateItem(index, {
      quotationProductId: product.kind === 'QUOTATION' ? product.id : null,
      productId: product.kind === 'CATALOG' ? product.id : null,
      nameZh: product.nameZh,
      nameEn: product.nameEn,
      sku: product.sku,
      model: product.model,
      unit: product.unit,
      specifications: product.specifications,
    })
  }
  const saveLineAsProduct = (index: number) => startTransition(async () => {
    const item = value.items[index]
    if (!item) return
    const result = await createQuotationProduct({
      productId: null,
      nameZh: item.nameZh,
      nameEn: item.nameEn,
      sku: item.sku,
      model: item.model,
      unit: item.unit,
      moq: null,
      specifications: item.specifications,
      standards: [],
      certificates: [],
      internalNotes: item.internalNotes,
      status: 'DRAFT',
    })
    if (result.success === false) { toast.error(result.reason); return }
    const createdId = quotationProductIdFromAction(result.data)
    if (createdId) updateItem(index, { quotationProductId: createdId, productId: null })
    toast.success('Quotation product saved from this line')
    router.refresh()
  })
  const applyPastePreview = () => {
    if (pastePreview.length === 0) return
    setValue((current) => ({
      ...current,
      items: [...(current.items.length === 1 && isBlankLine(current.items[0]) ? [] : current.items), ...pastePreview].map((item, sortOrder) => ({ ...item, sortOrder })),
    }))
    setPasteText('')
    toast.success(`${pastePreview.length} pasted line${pastePreview.length === 1 ? '' : 's'} added`)
  }
  const submit = () => startTransition(async () => {
    setError(null)
    const payload = { ...value, items: value.items.map((item, sortOrder) => ({ ...item, sortOrder })) }
    const result = revisionId && expectedVersion
      ? await updateSalesQuotation({ ...payload, revisionId, expectedVersion })
      : await createSalesQuotation(payload)
    if (result.success === false) { setError(result.reason); toast.error(result.reason); return }
    toast.success(result.reason); router.push('/admin/sales-quotations'); router.refresh()
  })

  if (customers.length === 0) return <Card><CardHeader><CardTitle>Create a business customer first</CardTitle><CardDescription>A quotation needs a customer snapshot before lines can be saved.</CardDescription></CardHeader><CardContent><Button onClick={() => router.push('/admin/business-customers/new')}>New customer</Button></CardContent></Card>

  return <div className="space-y-6">
    <Card><CardHeader><CardTitle className="font-serif">Quotation header</CardTitle><CardDescription>Customer-visible identity, date, language and currency.</CardDescription></CardHeader><CardContent className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
      <Field label="Customer"><Select value={value.customerId} onValueChange={(customerId) => setValue({ ...value, customerId })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{customers.map((customer) => <SelectItem key={customer.id} value={customer.id}>{customer.companyName}{customer.countryCode ? ` · ${customer.countryCode}` : ''}</SelectItem>)}</SelectContent></Select></Field>
      <Field label="Quotation date"><Input type="date" value={value.quotationDate} onChange={(event) => setValue({ ...value, quotationDate: event.target.value })} /></Field>
      <Field label="Valid until"><Input type="date" value={value.validUntil ?? ''} onChange={(event) => setValue({ ...value, validUntil: event.target.value || null })} /></Field>
      <Field label="Language"><Select value={value.documentLanguage} onValueChange={(documentLanguage: SerializableQuotationInput['documentLanguage']) => setValue({ ...value, documentLanguage })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="CHINESE">Chinese</SelectItem><SelectItem value="ENGLISH">English</SelectItem><SelectItem value="BILINGUAL">Bilingual</SelectItem></SelectContent></Select></Field>
      <Field label="Currency"><Input maxLength={3} value={value.currency} onChange={(event) => { const currency = event.target.value.toUpperCase(); setValue({ ...value, currency, currencyMinorUnit: currency.length === 3 ? currencyMinorUnit(currency) : value.currencyMinorUnit }) }} /></Field>
      <Field label="Payment terms"><Input value={value.publicTerms.payment ?? ''} onChange={(event) => setValue({ ...value, publicTerms: { ...value.publicTerms, payment: event.target.value } })} /></Field>
      <Field label="Trade terms"><Input value={value.publicTerms.trade ?? ''} onChange={(event) => setValue({ ...value, publicTerms: { ...value.publicTerms, trade: event.target.value } })} /></Field>
      <Field label="Delivery"><Input value={value.publicTerms.delivery ?? ''} onChange={(event) => setValue({ ...value, publicTerms: { ...value.publicTerms, delivery: event.target.value } })} /></Field>
    </CardContent></Card>

    <Card className="overflow-hidden"><CardHeader className="flex-row items-center justify-between"><div><CardTitle className="font-serif">Quotation lines</CardTitle><CardDescription>Choose a reusable source or keep a line one-off. Saved values become the revision snapshot.</CardDescription></div><Button type="button" variant="outline" onClick={() => setValue({ ...value, items: [...value.items, newLine(value.items.length)] })}><Plus className="mr-2 h-4 w-4" />Add line</Button></CardHeader><CardContent className="space-y-4">
      <div className="rounded-xl border border-dashed bg-muted/20 p-4">
        <div className="mb-3 flex items-start gap-3"><ClipboardPaste className="mt-0.5 h-5 w-5 text-primary" /><div><p className="font-medium">Paste spreadsheet rows</p><p className="text-xs leading-5 text-muted-foreground">Fixed columns: English name, Chinese name, model, SKU, specifications (use | between bullets), quantity, unit, unit price, unit cost, cost currency. Nothing is added until you review and apply.</p></div></div>
        <Textarea aria-label="Paste spreadsheet rows" rows={3} value={pasteText} onChange={(event) => setPasteText(event.target.value)} placeholder={'Safety glove\t安全手套\tG-01\tSKU-01\tNitrile coated|13 gauge\t100\tpair\t1.25\t0.72\tUSD'} />
        {pasteText ? <div className="mt-3 space-y-3"><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Preview · {pastePreview.length} valid row{pastePreview.length === 1 ? '' : 's'}</p><div className="max-h-48 overflow-auto rounded-lg border bg-background"><table className="w-full text-left text-xs"><thead className="sticky top-0 bg-muted"><tr><th className="p-2">Name</th><th className="p-2">Model / SKU</th><th className="p-2">Qty</th><th className="p-2">Price</th></tr></thead><tbody>{pastePreview.map((item, index) => <tr key={`${item.nameEn}-${index}`} className="border-t"><td className="p-2">{item.nameEn || item.nameZh}</td><td className="p-2">{[item.model, item.sku].filter(Boolean).join(' / ') || '—'}</td><td className="p-2">{item.quantity} {item.unit}</td><td className="p-2">{value.currency} {item.unitPrice}</td></tr>)}</tbody></table></div><Button type="button" variant="secondary" onClick={applyPastePreview} disabled={pastePreview.length === 0}>Apply reviewed rows</Button></div> : null}
      </div>
      {value.items.map((item, index) => <div key={item.id ?? `line-${index}`} className="rounded-xl border bg-muted/15 p-4">
        <div className="mb-4 flex items-center justify-between"><p className="font-mono text-xs text-muted-foreground">LINE {String(index + 1).padStart(2, '0')}</p><div className="flex"><Button type="button" size="sm" variant="ghost" onClick={() => saveLineAsProduct(index)} disabled={isPending || Boolean(item.quotationProductId)}><PackagePlus className="mr-2 h-4 w-4" />Save as product</Button><Button type="button" size="icon" variant="ghost" aria-label="Move line up" onClick={() => reorder(index, -1)} disabled={index === 0}><ArrowUp className="h-4 w-4" /></Button><Button type="button" size="icon" variant="ghost" aria-label="Move line down" onClick={() => reorder(index, 1)} disabled={index === value.items.length - 1}><ArrowDown className="h-4 w-4" /></Button><Button type="button" size="icon" variant="ghost" aria-label="Remove line" onClick={() => setValue({ ...value, items: value.items.filter((_, position) => position !== index).map((entry, sortOrder) => ({ ...entry, sortOrder })) })} disabled={value.items.length === 1}><Trash2 className="h-4 w-4" /></Button></div></div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <div className="md:col-span-2"><Field label="Source"><Select value={item.quotationProductId ? `QUOTATION:${item.quotationProductId}` : item.productId ? `CATALOG:${item.productId}` : 'ONE_OFF'} onValueChange={(selected) => selectSource(index, selected)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ONE_OFF">One-off line</SelectItem>{products.map((product) => <SelectItem key={`${product.kind}:${product.id}`} value={`${product.kind}:${product.id}`}>{product.kind === 'QUOTATION' ? 'Quote' : 'Catalog'} · {product.label}</SelectItem>)}</SelectContent></Select></Field></div>
          <div className="xl:col-span-2"><Field label="English name"><Input value={item.nameEn ?? ''} onChange={(event) => updateItem(index, { nameEn: event.target.value || null })} /></Field></div>
          <div className="xl:col-span-2"><Field label="Chinese name"><Input value={item.nameZh ?? ''} onChange={(event) => updateItem(index, { nameZh: event.target.value || null })} /></Field></div>
          <Field label="Model"><Input value={item.model ?? ''} onChange={(event) => updateItem(index, { model: event.target.value || null })} /></Field>
          <Field label="SKU"><Input value={item.sku ?? ''} onChange={(event) => updateItem(index, { sku: event.target.value || null })} /></Field>
          <Field label="Quantity"><Input inputMode="decimal" value={item.quantity} onChange={(event) => updateItem(index, { quantity: event.target.value })} /></Field>
          <Field label="Unit"><Input value={item.unit} onChange={(event) => updateItem(index, { unit: event.target.value })} /></Field>
          <Field label={`Unit price (${value.currency})`}><Input inputMode="decimal" value={item.unitPrice} onChange={(event) => updateItem(index, { unitPrice: event.target.value })} /></Field>
          <Field label="Line discount"><Input inputMode="decimal" value={item.discountAmount} onChange={(event) => updateItem(index, { discountAmount: event.target.value })} /></Field>
          <div className="md:col-span-2 xl:col-span-4"><Field label="Specifications (one bullet per line)"><Textarea rows={3} value={item.specifications.join('\n')} onChange={(event) => updateItem(index, { specifications: event.target.value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean) })} /></Field></div>
          <div className="rounded-lg border border-dashed border-amber-500/35 bg-amber-500/5 p-3 xl:col-span-2"><p className="mb-3 text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300">Internal cost</p><div className="grid grid-cols-3 gap-2"><Input aria-label="Unit cost" inputMode="decimal" placeholder="Cost" value={item.unitCost ?? ''} onChange={(event) => updateItem(index, { unitCost: event.target.value || null, costCurrency: event.target.value ? (item.costCurrency ?? value.currency) : null })} /><Input aria-label="Cost currency" maxLength={3} placeholder="USD" value={item.costCurrency ?? ''} onChange={(event) => updateItem(index, { costCurrency: event.target.value.toUpperCase() || null })} /><Input aria-label="Exchange rate" inputMode="decimal" placeholder="Rate" value={item.exchangeRate ?? ''} onChange={(event) => updateItem(index, { exchangeRate: event.target.value || null })} /></div></div>
        </div>
      </div>)}
    </CardContent></Card>

    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <Card><CardHeader><CardTitle className="font-serif">Internal notes</CardTitle><CardDescription>Never included in customer documents.</CardDescription></CardHeader><CardContent><Textarea rows={6} value={value.internalNotes ?? ''} onChange={(event) => setValue({ ...value, internalNotes: event.target.value || null })} /></CardContent></Card>
      <Card><CardHeader><CardTitle className="font-serif">Charges & preview</CardTitle><CardDescription>The server recalculates authoritative totals on save.</CardDescription></CardHeader><CardContent className="space-y-4">
        <Money label="Quotation discount" value={value.discountAmount} onChange={(discountAmount) => setValue({ ...value, discountAmount })} />
        <Money label="Shipping" value={value.shippingFee} onChange={(shippingFee) => setValue({ ...value, shippingFee })} />
        <Money label="Other fee" value={value.otherFee} onChange={(otherFee) => setValue({ ...value, otherFee })} />
        <Money label="Tax rate (%)" value={value.taxRate} onChange={(taxRate) => setValue({ ...value, taxRate })} />
        <div className="border-t pt-4"><p className="text-xs uppercase tracking-wider text-muted-foreground">Browser preview subtotal</p><p className="mt-1 font-serif text-3xl tabular-nums">{value.currency} {Number.isFinite(previewSubtotal) ? previewSubtotal.toFixed(value.currencyMinorUnit) : '—'}</p></div>
      </CardContent></Card>
    </div>
    <div className="flex items-center justify-end gap-3">{error ? <p role="alert" className="mr-auto text-sm text-destructive">{error}</p> : null}<Button type="button" onClick={submit} disabled={isPending}><Save className="mr-2 h-4 w-4" />{isPending ? 'Saving…' : revisionId ? 'Save revision' : 'Create quotation'}</Button></div>
  </div>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="space-y-2"><Label>{label}</Label>{children}</div> }
function Money({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <Field label={label}><Input inputMode="decimal" value={value} onChange={(event) => onChange(event.target.value)} /></Field> }

function quotationProductIdFromAction(data: unknown): string | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null
  const id = (data as Record<string, unknown>).id
  return typeof id === 'string' ? id : null
}

function isBlankLine(item: QuotationItemInput | undefined): boolean {
  return Boolean(item && !item.nameEn && !item.nameZh && !item.quotationProductId && !item.productId)
}

function parsePastedLines(text: string): QuotationItemInput[] {
  return text.split(/\r?\n/).flatMap((row, rowIndex) => {
    if (!row.trim()) return []
    const [nameEn = '', nameZh = '', model = '', sku = '', specificationText = '', quantity = '1', unit = 'pcs', unitPrice = '0', unitCost = '', costCurrency = ''] = row.split('\t').map((cell) => cell.trim())
    if (!nameEn && !nameZh) return []
    return [{
      ...newLine(rowIndex),
      nameEn: nameEn || null,
      nameZh: nameZh || null,
      model: model || null,
      sku: sku || null,
      specifications: specificationText.split('|').map((entry) => entry.trim()).filter(Boolean),
      quantity: quantity || '1',
      unit: unit || 'pcs',
      unitPrice: unitPrice || '0',
      unitCost: unitCost || null,
      costCurrency: unitCost ? (costCurrency.toUpperCase() || null) : null,
    }]
  })
}
