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
  const [value, setValue] = useState<CommonProductInput>(initialValue ?? { name: '', description: '', unit: 'pcs', unitPrice: '0', currency: 'USD', active: true })
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
    <label className="block space-y-2 text-sm font-medium">产品名称<Input required value={value.name} maxLength={500} onChange={(e) => setValue({ ...value, name: e.target.value })} /></label>
    <label className="block space-y-2 text-sm font-medium">规格 / 描述<Textarea rows={8} value={value.description} onChange={(e) => setValue({ ...value, description: e.target.value })} placeholder="每行一条，对客户展示的完整说明" /></label>
    <div className="grid gap-4 sm:grid-cols-3"><label className="space-y-2 text-sm">单位<Input required value={value.unit} onChange={(e) => setValue({ ...value, unit: e.target.value })} /></label><label className="space-y-2 text-sm">默认报价单价<Input inputMode="decimal" value={value.unitPrice} onChange={(e) => setValue({ ...value, unitPrice: e.target.value })} /></label><label className="space-y-2 text-sm">币种<Input maxLength={3} value={value.currency} onChange={(e) => setValue({ ...value, currency: e.target.value.toUpperCase() })} /></label></div>
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={value.active} onChange={(e) => setValue({ ...value, active: e.target.checked })} />在常用产品选择器中显示</label>
  </fieldset><p className="text-xs text-slate-500">这里修改的是下次填充的默认值，不会改变已经保存的报价。</p>{error && <p role="alert" className="text-sm text-red-700">{error}</p>}<Button disabled={busy} type="submit">{busy ? '保存中…' : '保存常用产品'}</Button></form>
}
