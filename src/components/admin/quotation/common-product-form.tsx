'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { z } from 'zod'
import { saveCommonQuotationProduct } from '@/actions/admin/common-quotation-products'
import { commonProductSchema, type CommonProductInput } from '@/lib/quotation/simple-input'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

export function CommonProductForm({ initialValue }: { initialValue?: CommonProductInput }) {
  const [value, setValue] = useState<CommonProductInput>(initialValue ?? { name: '', specifications: '', description: '', packaging: '', unitCost: null, unit: 'pcs', unitPrice: '0', currency: 'USD', active: true })
  const [busy, startTransition] = useTransition()
  const [error, setError] = useState('')
  const router = useRouter()
  function save() {
    startTransition(async () => {
      setError('')
      try {
        const result = await saveCommonQuotationProduct(commonProductSchema.parse(value))
        if (!result.success) { setError(result.reason); return }
        const data = z.object({ id: z.string() }).parse(result.data)
        router.push(`/admin/quotation-products/${data.id}`); router.refresh()
      } catch (cause) { setError(cause instanceof z.ZodError ? cause.issues.map((issue) => issue.message).join('；') : '保存失败，请刷新后重试') }
    })
  }
  return <form onSubmit={(event) => { event.preventDefault(); save() }} className="space-y-5 rounded-2xl border bg-white p-6"><fieldset disabled={busy} className="space-y-5">
    {!value.id && <p className="text-sm text-slate-500">先保存产品资料，随后在编辑页上传产品图片。</p>}
    <label className="block space-y-2 text-sm font-medium">产品名称<Input required value={value.name} maxLength={500} onChange={(e) => setValue({ ...value, name: e.target.value })} /></label>
    <label className="block space-y-2 text-sm font-medium">规格<Textarea rows={6} value={value.specifications ?? ''} onChange={(e) => setValue({ ...value, specifications: e.target.value })} placeholder="每行一条，例如 Material: Cotton" /></label>
    <label className="block space-y-2 text-sm font-medium">描述备注<Textarea rows={3} value={value.description} onChange={(e) => setValue({ ...value, description: e.target.value })} placeholder="可随产品填充到报价中，对客户展示" /></label>
    <label className="block space-y-2 text-sm font-medium">包装信息<Textarea rows={3} value={value.packaging ?? ''} onChange={(e) => setValue({ ...value, packaging: e.target.value })} placeholder="单件包装、装箱数量、箱规等；未知可留空" /></label>
    <label className="block max-w-sm space-y-2 text-sm font-medium">成本价（仅内部，与单价同币种）<Input inputMode="decimal" value={value.unitCost ?? ''} onChange={(e) => setValue({ ...value, unitCost: e.target.value || null })} placeholder="可留空，不会出现在客户文件" /></label>
    <div className="grid gap-4 sm:grid-cols-3"><label className="space-y-2 text-sm">单位<Input required value={value.unit} onChange={(e) => setValue({ ...value, unit: e.target.value })} /></label><label className="space-y-2 text-sm">默认报价单价<Input inputMode="decimal" value={value.unitPrice} onChange={(e) => setValue({ ...value, unitPrice: e.target.value })} /></label><label className="space-y-2 text-sm">币种<Input maxLength={3} value={value.currency} onChange={(e) => setValue({ ...value, currency: e.target.value.toUpperCase() })} /></label></div>
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={value.active} onChange={(e) => setValue({ ...value, active: e.target.checked })} />在常用产品选择器中显示</label>
  </fieldset><p className="text-xs text-slate-500">这里修改的是下次填充的默认值，不会改变已经保存的报价。</p>{error && <p role="alert" className="text-sm text-red-700">{error}</p>}<Button disabled={busy} type="submit">{busy ? '保存中…' : '保存常用产品'}</Button></form>
}
