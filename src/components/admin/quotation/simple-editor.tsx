'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { z } from 'zod'
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import { createSalesQuotation, updateSalesQuotation, finalizeSalesQuotation } from '@/actions/admin/sales-quotations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { blankLine, blankQuotation, simpleTotals, toQuotationInput, type CommonProductOption, type SimpleLine, type SimpleQuotation } from '@/lib/quotation/simple-input'
import type { WorkbenchSettings } from '@/lib/quotation/workbench-config'
import { SimpleImagePicker } from './simple-image-picker'
import { useQuotationConfirm } from './use-quotation-confirm'

const savedSchema = z.object({ quotationId: z.string(), revisionId: z.string(), version: z.number(), items: z.array(z.object({ id: z.string(), assets: z.array(z.object({ id: z.string(), displayName: z.string().nullable() })) })) })
export function SimpleQuotationEditor({ customers, products, settings, initialValue, revisionId, quotationId, expectedVersion }: {
  customers: { id: string; companyName: string }[]; products: CommonProductOption[]; settings: WorkbenchSettings
  initialValue?: SimpleQuotation; revisionId?: string; quotationId?: string; expectedVersion?: number
}) {
  const router = useRouter()
  const confirmation = useQuotationConfirm()
  const [value, setValue] = useState(initialValue ?? blankQuotation(settings))
  const [saved, setSaved] = useState({ revisionId, quotationId, version: expectedVersion })
  const [busy, startTransition] = useTransition()
  const [uploading, setUploading] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [error, setError] = useState('')
  const [preview, setPreview] = useState('')
  const [dirty, setDirty] = useState(false)
  const [needsRefresh, setNeedsRefresh] = useState(false)
  const previewRef = useRef('')
  const submitLock = useRef(false)
  const totals = simpleTotals(value)
  useEffect(() => () => { if (previewRef.current) URL.revokeObjectURL(previewRef.current) }, [])
  useEffect(() => {
    const guard = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); event.returnValue = '' } }
    window.addEventListener('beforeunload', guard)
    return () => window.removeEventListener('beforeunload', guard)
  }, [dirty])
  function change(next: SimpleQuotation) { setValue(next); setDirty(true); setFeedback('') }
  function line(index: number, patch: Partial<SimpleLine>) { change({ ...value, items: value.items.map((item, i) => i === index ? { ...item, ...patch } : item) }) }
  function move(index: number, offset: number) { const items = [...value.items]; [items[index], items[index + offset]] = [items[index + offset], items[index]]; change({ ...value, items }) }
  function refresh() {
    if (saved.quotationId) router.replace(`/admin/sales-quotations/${saved.quotationId}?revision=${saved.revisionId}&reload=${Date.now()}`)
    router.refresh()
  }
  function run(mode: 'save' | 'preview' | 'finalize', confirmed = false) {
    if (submitLock.current || uploading || needsRefresh) return
    if (mode === 'finalize' && !confirmed) { confirmation.ask('AI 排版并生成正式报价', '将使用现有 AI 接口整理 Jordan 模板排版，发送产品名称和规格文字，可能产生 API 费用。不会发送客户信息、报价金额、图片或内部备注。随后生成 PDF 和 Excel 并锁定当前版本。', () => run(mode, true)); return }
    submitLock.current = true
    startTransition(async () => {
      setError(''); setFeedback('')
      try {
        const input = toQuotationInput(value)
        const result = saved.revisionId ? await updateSalesQuotation({ ...input, revisionId: saved.revisionId, expectedVersion: saved.version }) : await createSalesQuotation(input)
        if (!result.success) { if (result.code === 'VERSION_CONFLICT') setNeedsRefresh(true); throw new Error([result.reason, ...Object.values(result.errors ?? {}).flat()].join(' · ')) }
        const data = savedSchema.parse(result.data)
        setSaved(data)
        setValue({ ...value, items: value.items.map((item, i) => ({ ...item, id: data.items[i].id, images: data.items[i].assets.map((asset) => ({ id: asset.id, kind: 'asset', name: asset.displayName || '产品图片' })) })) })
        setDirty(false)
        if (mode === 'preview') {
          setFeedback('草稿已保存，正在生成预览…')
          const response = await fetch(`/api/admin/quotation-revisions/${data.revisionId}/preview?version=${data.version}`, { cache: 'no-store' })
          if (response.redirected || (response.ok && !response.headers.get('content-type')?.includes('application/pdf'))) throw new Error('登录状态可能已失效，请重新登录后预览')
          if (!response.ok) { const body = z.object({ reason: z.string() }).parse(await response.json()); throw new Error(body.reason) }
          if (previewRef.current) URL.revokeObjectURL(previewRef.current)
          previewRef.current = URL.createObjectURL(await response.blob()); setPreview(previewRef.current)
          setFeedback('Jordan 模板预览已生成，未调用 AI。正式生成时 AI 会优化规格标签、图片分栏和备注框，原始报价内容保持不变。')
        } else if (mode === 'finalize') {
          setFeedback('草稿已保存，正在调用 AI 排版并生成正式文件，请勿关闭页面…')
          // A failed request may already have advanced the version; require explicit refresh.
          setNeedsRefresh(true)
          const finalized = await finalizeSalesQuotation({ revisionId: data.revisionId, expectedVersion: data.version, idempotencyKey: crypto.randomUUID() })
          if (!finalized.success) { setFeedback(''); setError(finalized.reason); return }
          setFeedback('文件生成请求已处理，正在刷新状态…')
          router.replace(`/admin/sales-quotations/${data.quotationId}?revision=${data.revisionId}`); router.refresh()
        } else {
          setFeedback('草稿已保存')
          router.replace(`/admin/sales-quotations/${data.quotationId}?revision=${data.revisionId}`); router.refresh()
        }
      } catch (cause) { setFeedback(''); setError(cause instanceof z.ZodError ? cause.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('；') : cause instanceof Error ? cause.message : '操作失败，请刷新状态后重试') }
      finally { submitLock.current = false }
    })
  }
  function chooseProduct(index: number, id: string, confirmed = false) {
    const product = products.find((p) => p.id === id)
    if (!product) return
    if (value.items[index].name && !confirmed) { confirmation.ask('填充常用产品', '将替换本行的名称、描述、价格和图片。', () => chooseProduct(index, id, true)); return }
    const sameCurrency = product.currency === value.currency
    if (!sameCurrency) setError(`产品默认币种为 ${product.currency}，与当前 ${value.currency} 不同，请手动填写单价。`)
    line(index, { quotationProductId: product.id, name: product.name, description: product.description, unit: product.unit, unitPrice: sameCurrency ? product.unitPrice : '0', images: product.images })
  }
  return <div className="space-y-6">
    {confirmation.dialog}
    <p className="rounded-xl border border-teal-100 bg-teal-50 p-4 text-sm text-teal-900">内置 Jordan 报价模板。预览不调用 AI；正式生成时使用现有 AI 接口辅助排版，可能产生调用费用。产品文字和金额保持原值。</p>
    <fieldset disabled={busy || uploading || needsRefresh} className="space-y-6 disabled:opacity-75">
      <section className="grid gap-5 rounded-2xl border bg-white p-6 md:grid-cols-[2fr_1fr_1fr]">
        <label className="space-y-2 text-sm font-medium">客户名称 <span className="text-red-600">*</span><Input list="quote-customers" value={value.customerName} onChange={(e) => change({ ...value, customerName: e.target.value })} placeholder="直接输入客户或公司名称" maxLength={240} /><datalist id="quote-customers">{customers.map((customer) => <option key={customer.id} value={customer.companyName} />)}</datalist></label>
        <label className="space-y-2 text-sm font-medium">报价日期<Input type="date" value={value.quotationDate} onChange={(e) => change({ ...value, quotationDate: e.target.value })} /></label>
        <label className="space-y-2 text-sm font-medium">币种<Input value={value.currency} maxLength={3} onChange={(e) => change({ ...value, currency: e.target.value.toUpperCase() })} /></label>
      </section>
      <div className="flex items-end justify-between"><div><h2 className="text-lg font-semibold">产品明细</h2><p className="mt-1 text-sm text-slate-500">直接录入，或从常用产品填充。不会修改商城产品库。</p></div><span className="text-sm text-slate-500">{value.items.length} 项产品</span></div>
      {value.items.map((item, index) => <section key={item.id ?? `new-${index}`} className="overflow-hidden rounded-2xl border bg-white">
        <div className="flex items-center justify-between border-b bg-slate-50 px-5 py-3"><span className="font-mono text-sm font-semibold text-teal-800">ITEM {String(index + 1).padStart(2, '0')}</span><div className="flex gap-1"><Button type="button" variant="ghost" size="icon" aria-label={`上移产品 ${index + 1}`} disabled={index === 0} onClick={() => move(index, -1)}><ArrowUp className="size-4" /></Button><Button type="button" variant="ghost" size="icon" aria-label={`下移产品 ${index + 1}`} disabled={index === value.items.length - 1} onClick={() => move(index, 1)}><ArrowDown className="size-4" /></Button><Button type="button" variant="ghost" size="icon" aria-label={`删除产品 ${index + 1}`} disabled={value.items.length === 1} onClick={() => confirmation.ask('移除产品明细', '将从当前草稿中移除此产品。不会删除常用产品或商城产品。', () => change({ ...value, items: value.items.filter((_, i) => i !== index) }))}><Trash2 className="size-4" /></Button></div></div>
        <div className="grid gap-6 p-6 xl:grid-cols-[1fr_2fr]">
          <SimpleImagePicker images={item.images} onChange={(images) => line(index, { images })} onBusy={setUploading} disabled={busy} />
          <div className="space-y-4"><label className="block space-y-2 text-sm font-medium">产品名称<Input value={item.name} maxLength={500} onChange={(e) => line(index, { name: e.target.value })} placeholder="填写对客户展示的名称，中英文均可" /></label>
            {products.length > 0 && <label className="block text-xs text-slate-500">从常用产品填充<select aria-label={`选择常用产品 ${index + 1}`} className="mt-1 block w-full rounded-md border bg-white px-3 py-2 text-sm text-slate-700" value="" onChange={(e) => chooseProduct(index, e.target.value)}><option value="">选择产品（可选）</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name} · {product.currency} {product.unitPrice}</option>)}</select></label>}
            <label className="block space-y-2 text-sm font-medium">规格 / 描述<Textarea rows={5} value={item.description} onChange={(e) => line(index, { description: e.target.value })} placeholder={'每行一条，例如：\nMaterial: Cotton\nColor: Navy\nSizes: S-3XL'} /></label>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4"><label className="space-y-2 text-sm">数量<Input inputMode="decimal" value={item.quantity} onChange={(e) => line(index, { quantity: e.target.value })} /></label><label className="space-y-2 text-sm">单位<Input value={item.unit} onChange={(e) => line(index, { unit: e.target.value })} /></label><label className="space-y-2 text-sm">单价 · {value.currency}<Input inputMode="decimal" value={item.unitPrice} onChange={(e) => line(index, { unitPrice: e.target.value })} /></label><div className="space-y-2 text-sm"><p>金额</p><output className="block py-2 font-semibold tabular-nums">{totals?.lines[index] ?? '—'}</output></div></div>
          </div>
        </div>
      </section>)}
      <Button type="button" variant="outline" className="h-12 w-full border-dashed" disabled={value.items.length >= 100} onClick={() => change({ ...value, items: [...value.items, blankLine()] })}><Plus className="mr-2 size-4" />添加产品明细</Button>
      <section className="grid gap-6 rounded-2xl border bg-white p-6 lg:grid-cols-[2fr_1fr]"><div className="space-y-5"><label className="block space-y-2 text-sm font-medium">报价条款<Textarea rows={6} value={value.terms} onChange={(e) => change({ ...value, terms: e.target.value })} placeholder="付款方式、交货时间、有效期等，按需要填写" /></label><details><summary className="cursor-pointer text-sm text-slate-500">内部备注（不会出现在客户文件中）</summary><Textarea aria-label="内部备注" className="mt-3" rows={3} value={value.internalNotes} onChange={(e) => change({ ...value, internalNotes: e.target.value })} /></details></div><div className="space-y-4"><details open={value.shippingFee !== '0' || value.discountAmount !== '0' || value.otherFee !== '0'}><summary className="cursor-pointer text-sm font-medium">运费、折扣及其他费用（可选）</summary><div className="mt-4 space-y-3">{([['shippingFee', '运费'], ['discountAmount', '折扣金额'], ['otherFee', '其他费用']] as const).map(([key, label]) => <label key={key} className="flex items-center justify-between gap-3 text-sm">{label}<Input className="w-36 text-right" inputMode="decimal" value={value[key]} onChange={(e) => change({ ...value, [key]: e.target.value })} /></label>)}</div></details><div className="rounded-xl bg-slate-900 p-5 text-white"><p className="text-xs tracking-widest text-slate-300">QUOTATION TOTAL</p><p className="mt-3 text-2xl font-semibold tabular-nums">{value.currency} {totals?.total ?? '—'}</p></div></div></section>
    </fieldset>
    <div className="sticky bottom-0 z-10 rounded-xl border bg-white/95 p-4 shadow-lg backdrop-blur"><div aria-live="polite">{feedback && <p className="mb-3 text-sm text-teal-800">{feedback}</p>}{error && <p role="alert" className="mb-3 whitespace-pre-wrap text-sm text-red-700">{error}</p>}</div><div className="flex flex-wrap items-center justify-end gap-3"><span className="mr-auto text-xs text-slate-500">{busy ? '正在处理…' : dirty ? '有未保存的修改' : '填写完成后可保存或预览'}</span>{needsRefresh ? <Button onClick={refresh} disabled={busy}>刷新状态后继续</Button> : <><Button variant="outline" disabled={busy || uploading} onClick={() => run('save')}>保存草稿</Button><Button variant="secondary" disabled={busy || uploading} onClick={() => run('preview')}>预览 PDF</Button><Button className="bg-slate-900 text-white hover:bg-slate-700" disabled={busy || uploading} onClick={() => run('finalize')}>生成正式文件</Button></>}</div></div>
    {preview && <section className="space-y-3 rounded-xl border bg-white p-4"><div className="flex justify-between"><h2 className="font-semibold">报价预览 · {dirty ? '内容已修改，请重新预览' : '仅供检查'}</h2><Button variant="ghost" onClick={() => setPreview('')}>关闭预览</Button></div><iframe title="报价 PDF 预览" src={preview} className="h-[75vh] w-full rounded-lg border" /></section>}
  </div>
}
