'use client'

import { useState, useTransition } from 'react'
import { saveQuotationSettings } from '@/actions/admin/quotation-settings'
import type { WorkbenchSettings } from '@/lib/quotation/workbench-config'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { SimpleImagePicker } from './simple-image-picker'

export function QuotationSettingsForm({ initialValue }: { initialValue: WorkbenchSettings }) {
  const [value, setValue] = useState(initialValue)
  const [busy, startTransition] = useTransition()
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  return <form className="max-w-4xl space-y-6" onSubmit={(event) => { event.preventDefault(); startTransition(async () => { setError(''); setMessage(''); try { const result = await saveQuotationSettings(value); if (!result.success) { setError(result.reason); return } setMessage(result.reason) } catch { setError('设置保存失败，请重试') } }) }}>
    <fieldset disabled={busy || uploading} className="space-y-6"><section className="space-y-5 rounded-2xl border bg-white p-6"><h2 className="font-semibold">公司抬头</h2>{([['companyName', '公司名称'], ['contactLine', '联系方式 / 地址'], ['tagline', '页脚标语']] as const).map(([key, label]) => <label key={key} className="block space-y-2 text-sm">{label}<Input value={value.brand[key]} onChange={(e) => setValue({ ...value, brand: { ...value.brand, [key]: e.target.value } })} /></label>)}</section>
    <section className="grid gap-6 rounded-2xl border bg-white p-6 md:grid-cols-2">{([['logoSourceId', '公司 Logo'], ['sealSourceId', '公司印章']] as const).map(([key, label]) => <div key={key} className="space-y-3"><h2 className="font-semibold">{label}</h2><p className="text-xs text-slate-500">可选，请使用不超过 1 MB 的图片。只保留一张。</p><SimpleImagePicker images={value[key] ? [{ id: value[key], kind: 'source', name: label }] : []} onChange={(images) => setValue({ ...value, [key]: images.at(-1)?.id ?? null })} onBusy={setUploading} disabled={busy} /></div>)}<label className="flex items-center gap-2 text-sm md:col-span-2"><input type="checkbox" checked={value.useSeal} onChange={(e) => setValue({ ...value, useSeal: e.target.checked })} />在新报价文件中使用此印章（默认关闭）</label></section>
    <section className="space-y-5 rounded-2xl border bg-white p-6"><h2 className="font-semibold">新报价默认值</h2><label className="block space-y-2 text-sm">默认币种<Input className="max-w-48" maxLength={3} value={value.currency} onChange={(e) => setValue({ ...value, currency: e.target.value.toUpperCase() })} /></label><label className="block space-y-2 text-sm">默认报价条款<Textarea rows={7} value={value.defaultTerms} onChange={(e) => setValue({ ...value, defaultTerms: e.target.value })} /></label></section>
    <section className="rounded-2xl border bg-slate-50 p-6 text-sm text-slate-600"><h2 className="mb-2 font-semibold text-slate-900">文件模板</h2><p>A4 横版 · 深蓝抬头 · 产品大图与规格分栏 · 自动分页 · 统一汇总页。</p><p className="mt-2">字体自动选择服务器兼容字体；中文仍需要服务器安装可用的中文 TTF。R2 密钥与字体路径继续由服务器环境配置管理，不在此页面显示。</p></section></fieldset>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}{message && <p role="status" className="text-sm text-teal-700">{message}</p>}<Button disabled={busy || uploading} type="submit">{busy ? '保存中…' : '保存报价设置'}</Button>
  </form>
}
