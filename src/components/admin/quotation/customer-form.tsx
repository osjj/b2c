'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { z } from 'zod'
import { saveQuotationCustomer } from '@/actions/admin/quotation-customers'
import { customerDirectorySchema, type CustomerDirectoryInput } from '@/lib/quotation/customer-directory'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

export function CustomerForm({ initialValue }: { initialValue?: CustomerDirectoryInput }) {
  const [value, setValue] = useState<CustomerDirectoryInput>(initialValue ?? { name: '', country: '', email: '', phone: '', company: '', gender: '', notes: '', active: true })
  const [busy, startTransition] = useTransition()
  const [error, setError] = useState('')
  const router = useRouter()
  return <form className="max-w-4xl space-y-5 rounded-2xl border bg-white p-6" onSubmit={(event) => {
    event.preventDefault(); startTransition(async () => {
      setError('')
      try {
        const result = await saveQuotationCustomer(customerDirectorySchema.parse(value))
        if (!result.success) { setError([result.reason, ...Object.values(result.errors ?? {}).flat()].join('；')); return }
        router.push('/admin/business-customers'); router.refresh()
      } catch (cause) { setError(cause instanceof z.ZodError ? cause.issues.map((issue) => issue.message).join('；') : '保存失败，请重试') }
    })
  }}><p className="text-sm text-slate-500">只有客户名字必填。这里的客户资料与商城用户账号独立。</p><fieldset disabled={busy} className="grid gap-5 sm:grid-cols-2">
    {([['name', '客户名字 *'], ['country', '国家'], ['email', '邮箱'], ['phone', '电话 / WhatsApp'], ['company', '公司']] as const).map(([key, label]) => <label key={key} className="space-y-2 text-sm font-medium">{label}<Input required={key === 'name'} type={key === 'email' ? 'email' : 'text'} value={value[key]} onChange={(e) => setValue({ ...value, [key]: e.target.value })} /></label>)}
    <label className="space-y-2 text-sm font-medium">性别<select className="block h-10 w-full rounded-md border bg-white px-3" value={value.gender} onChange={(e) => setValue({ ...value, gender: customerDirectorySchema.shape.gender.parse(e.target.value) })}><option value="">不填写</option><option value="MALE">男</option><option value="FEMALE">女</option><option value="OTHER">其他</option></select></label>
    <label className="space-y-2 text-sm font-medium sm:col-span-2">备注（仅内部）<Textarea rows={4} value={value.notes} onChange={(e) => setValue({ ...value, notes: e.target.value })} /></label>
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={value.active} onChange={(e) => setValue({ ...value, active: e.target.checked })} />启用客户</label>
  </fieldset>{error && <p role="alert" className="text-sm text-red-700">{error}</p>}<Button type="submit" disabled={busy}>{busy ? '保存中…' : '保存客户'}</Button></form>
}
