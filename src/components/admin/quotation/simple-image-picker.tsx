'use client'

import { useId, useState } from 'react'
import Image from 'next/image'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import type { SimpleImage } from '@/lib/quotation/simple-input'

const uploadResult = z.object({ success: z.boolean(), reason: z.string(), data: z.object({ id: z.string().uuid(), securityStatus: z.string() }).optional() })
export function SimpleImagePicker({ images, onChange, onBusy, disabled }: { images: SimpleImage[]; onChange: (images: SimpleImage[]) => void; onBusy?: (busy: boolean) => void; disabled?: boolean }) {
  const id = useId()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function upload(file: File) {
    setError('')
    if (!['image/png', 'image/jpeg'].includes(file.type) || file.size > 5 * 1024 * 1024) { setError('请选择不超过 5 MB 的 PNG 或 JPEG 图片'); return }
    setBusy(true); onBusy?.(true)
    try {
      const form = new FormData(); form.set('file', file)
      const response = await fetch('/api/admin/quotation-files/upload', { method: 'POST', body: form })
      if (response.redirected || !response.headers.get('content-type')?.includes('application/json')) throw new Error('登录状态可能已失效，请重新登录后上传')
      const result = uploadResult.parse(await response.json())
      if (!response.ok || !result.success || !result.data) throw new Error(result.reason)
      if (result.data.securityStatus !== 'CLEAN') throw new Error('图片尚未通过安全检查，请稍后重试')
      if (images.some((image) => image.id === result.data?.id)) throw new Error('这张图片已经添加')
      onChange([...images, { id: result.data.id, kind: 'source', name: file.name }])
    } catch (cause) { setError(cause instanceof Error ? cause.message : '图片上传失败，请重试') }
    finally { setBusy(false); onBusy?.(false) }
  }
  return <div className="space-y-3">
    <div className="flex flex-wrap gap-3">{images.map((image, index) => <div key={`${image.kind}-${image.id}`} className="relative w-24 rounded-xl border bg-white p-2">
      {/* Bypass the optimizer so the browser sends ADMIN session cookies directly. */}
      <Image unoptimized width={96} height={80} src={`/api/admin/quotation-images/${image.id}?kind=${image.kind}`} alt={image.name} className="h-20 w-full object-contain" />
      <Button type="button" size="sm" variant="ghost" disabled={busy || disabled} onClick={() => onChange(images.filter((_, i) => i !== index))} aria-label={`移除图片 ${index + 1}`} className="mt-1 h-11 w-full text-xs">移除</Button>
    </div>)}</div>
    {images.length < 8 && <div><label htmlFor={id} className="mb-1 block text-xs text-slate-500">{busy ? '正在上传图片…' : '添加产品图片 · PNG / JPEG，单张 5 MB，最多 8 张'}</label><input id={id} type="file" accept="image/png,image/jpeg" disabled={busy || disabled} className="max-w-full text-sm file:mr-3 file:rounded-md file:border file:bg-white file:px-3 file:py-2" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void upload(file) }} /></div>}
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
  </div>
}
