'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ImagePlus, Plus } from 'lucide-react'
import { toast } from 'sonner'

import { addQuotationProductCost, addQuotationProductSource, attachQuotationProductImage } from '@/actions/admin/quotation-products'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

type ProductImageSummary = { id: string; displayName: string | null; contentType: string; isCustomerVisible: boolean }
type ProductSourceSummary = { id: string; sourceType: string; supplierName: string | null; sourceUrl: string | null }

export function QuotationProductAssets({ productId, images, sources }: { productId: string; images: ProductImageSummary[]; sources: ProductSourceSummary[] }) {
  const [file, setFile] = useState<File | null>(null)
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [exchangeRate, setExchangeRate] = useState('')
  const [effectiveAt, setEffectiveAt] = useState(new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState('')
  const [sourceType, setSourceType] = useState('SUPPLIER')
  const [supplierName, setSupplierName] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')
  const [sourceNotes, setSourceNotes] = useState('')
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const uploadImage = () => {
    if (!file) return
    startTransition(async () => {
      const form = new FormData()
      form.set('file', file)
      const response = await fetch('/api/admin/quotation-files/upload', { method: 'POST', body: form })
      const body: unknown = await response.json().catch(() => null)
      const sourceFileId = sourceFileIdFromUpload(body)
      if (!response.ok || !sourceFileId) { toast.error(actionReason(body) ?? 'Private image upload failed'); return }
      const result = await attachQuotationProductImage({ quotationProductId: productId, sourceFileId })
      if (result.success === false) { toast.error(result.reason); return }
      toast.success(result.reason); setFile(null); router.refresh()
    })
  }
  const addCost = () => startTransition(async () => {
    const result = await addQuotationProductCost({
      quotationProductId: productId,
      amount,
      currency,
      exchangeRate: exchangeRate || null,
      effectiveAt,
      notes: notes || null,
    })
    if (result.success === false) { toast.error(result.reason); return }
    toast.success(result.reason); setAmount(''); setExchangeRate(''); setNotes(''); router.refresh()
  })
  const addSource = () => startTransition(async () => {
    const result = await addQuotationProductSource({ quotationProductId: productId, sourceType, supplierName: supplierName || null, sourceUrl: sourceUrl || null, notes: sourceNotes || null })
    if (result.success === false) { toast.error(result.reason); return }
    toast.success(result.reason); setSupplierName(''); setSourceUrl(''); setSourceNotes(''); router.refresh()
  })

  return <div className="grid gap-6 lg:grid-cols-2">
    <Card><CardHeader><CardTitle className="font-serif">Product images</CardTitle><CardDescription>Private reusable images. Production upload remains fail-closed until an approved scanner adapter is implemented.</CardDescription></CardHeader><CardContent className="space-y-4"><div className="flex flex-wrap gap-2">{images.length ? images.map((image) => <Badge key={image.id} variant="outline">{image.displayName ?? image.contentType}{image.isCustomerVisible ? ' · customer' : ''}</Badge>) : <p className="text-sm text-muted-foreground">No private images attached.</p>}</div><Input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => setFile(event.target.files?.[0] ?? null)} disabled={isPending} /><Button type="button" variant="outline" onClick={uploadImage} disabled={!file || isPending}><ImagePlus className="mr-2 h-4 w-4" />Upload & attach image</Button></CardContent></Card>
    <Card><CardHeader><CardTitle className="font-serif">Add cost history</CardTitle><CardDescription>Internal-only procurement evidence; never included in customer artifacts.</CardDescription></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2"><Field label="Amount"><Input inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} /></Field><Field label="Currency"><Input maxLength={3} value={currency} onChange={(event) => setCurrency(event.target.value.toUpperCase())} /></Field><Field label="Exchange rate"><Input inputMode="decimal" value={exchangeRate} onChange={(event) => setExchangeRate(event.target.value)} placeholder="Optional" /></Field><Field label="Effective date"><Input type="date" value={effectiveAt} onChange={(event) => setEffectiveAt(event.target.value)} /></Field><div className="sm:col-span-2"><Field label="Notes"><Textarea rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} /></Field></div><Button type="button" onClick={addCost} disabled={isPending || !amount}><Plus className="mr-2 h-4 w-4" />Add cost record</Button></CardContent></Card>
    <Card className="lg:col-span-2"><CardHeader><CardTitle className="font-serif">Supplier and source evidence</CardTitle><CardDescription>Internal-only traceability. Supplier names and links never enter customer documents.</CardDescription></CardHeader><CardContent className="space-y-4"><div className="flex flex-wrap gap-2">{sources.length ? sources.map((source) => <Badge key={source.id} variant="outline">{source.sourceType} · {source.supplierName ?? source.sourceUrl ?? 'Manual source'}</Badge>) : <p className="text-sm text-muted-foreground">No source evidence recorded.</p>}</div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"><Field label="Source type"><Input value={sourceType} onChange={(event) => setSourceType(event.target.value.toUpperCase())} /></Field><Field label="Supplier name"><Input value={supplierName} onChange={(event) => setSupplierName(event.target.value)} /></Field><Field label="Source URL"><Input type="url" value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} placeholder="https://…" /></Field><Field label="Notes"><Input value={sourceNotes} onChange={(event) => setSourceNotes(event.target.value)} /></Field></div><Button type="button" variant="outline" onClick={addSource} disabled={isPending || !sourceType}><Plus className="mr-2 h-4 w-4" />Add source</Button></CardContent></Card>
  </div>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="space-y-2"><Label>{label}</Label>{children}</div> }
function sourceFileIdFromUpload(value: unknown): string | null { if (!value || typeof value !== 'object' || Array.isArray(value)) return null; const data = (value as Record<string, unknown>).data; if (!data || typeof data !== 'object' || Array.isArray(data)) return null; const id = (data as Record<string, unknown>).id; return typeof id === 'string' ? id : null }
function actionReason(value: unknown): string | null { if (!value || typeof value !== 'object' || Array.isArray(value)) return null; const reason = (value as Record<string, unknown>).reason; return typeof reason === 'string' ? reason : null }
