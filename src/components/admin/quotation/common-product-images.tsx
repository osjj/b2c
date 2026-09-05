'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { saveCommonProductImages } from '@/actions/admin/common-quotation-products'
import { SimpleImagePicker } from './simple-image-picker'
import { Button } from '@/components/ui/button'
import type { SimpleImage } from '@/lib/quotation/simple-input'

export function CommonProductImages({ productId, updatedAt, images }: { productId: string; updatedAt: string; images: SimpleImage[] }) {
  const [value, setValue] = useState(images)
  const [uploading, setUploading] = useState(false)
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState('')
  const router = useRouter()
  return <section className="space-y-5 rounded-2xl border bg-white p-6"><h2 className="font-semibold">常用产品图片</h2><SimpleImagePicker images={value} onChange={setValue} onBusy={setUploading} disabled={pending} /><Button disabled={pending || uploading} variant="outline" onClick={() => startTransition(async () => { try { const result = await saveCommonProductImages({ id: productId, updatedAt, sourceIds: value.map((image) => image.id) }); setMessage(result.reason); if (result.success) router.refresh() } catch { setMessage('图片保存失败，请刷新后重试') } })}>保存图片</Button>{message && <p role="status" className="text-sm">{message}</p>}</section>
}
