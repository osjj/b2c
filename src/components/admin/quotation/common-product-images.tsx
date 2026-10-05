'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { z } from 'zod'
import { saveCommonProductImages } from '@/actions/admin/common-quotation-products'
import { reimportCommonProductImages } from '@/actions/admin/quotation-catalog'
import { SimpleImagePicker } from './simple-image-picker'
import { Button } from '@/components/ui/button'
import type { SimpleImage } from '@/lib/quotation/simple-input'
import { useQuotationConfirm } from './use-quotation-confirm'

const reimportResultSchema = z.object({ id: z.string().cuid(), updatedAt: z.string().datetime(), images: z.array(z.object({ id: z.string().uuid(), kind: z.literal('source'), name: z.string() })).min(1).max(8) })

export function CommonProductImages({ productId, updatedAt, images, catalogLinked = false }: { productId: string; updatedAt: string; images: SimpleImage[]; catalogLinked?: boolean }) {
  const [value, setValue] = useState(images)
  const [expectedUpdatedAt, setExpectedUpdatedAt] = useState(updatedAt)
  const [receivedUpdatedAt, setReceivedUpdatedAt] = useState(updatedAt)
  const [uploading, setUploading] = useState(false)
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState('')
  const [failed, setFailed] = useState(false)
  const [operation, setOperation] = useState<'save' | 'reimport'>('save')
  const router = useRouter()
  const confirmation = useQuotationConfirm()
  // Keep feedback across route refreshes while accepting a new server image/version snapshot.
  if (receivedUpdatedAt !== updatedAt) {
    setReceivedUpdatedAt(updatedAt); setExpectedUpdatedAt(updatedAt); setValue(images)
  }
  function reimport() {
    setOperation('reimport'); setMessage(''); setFailed(false)
    startTransition(async () => {
      try {
        const result = await reimportCommonProductImages({ id: productId, updatedAt: expectedUpdatedAt })
        if (!result.success) { setMessage(result.reason); setFailed(true); return }
        const data = reimportResultSchema.parse(result.data)
        if (data.id !== productId) throw new Error('Unexpected product')
        setValue(data.images); setExpectedUpdatedAt(data.updatedAt); setMessage(result.reason)
        router.refresh()
      } catch { setMessage('重新导入未完成，请刷新后检查图片再重试'); setFailed(true) }
    })
  }
  return <section className="space-y-5 rounded-2xl border bg-white p-6">{confirmation.dialog}<div><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-semibold">常用产品图片</h2><Button type="button" variant="outline" disabled={!catalogLinked || pending || uploading} onClick={() => confirmation.ask('重新导入商品主图', '将用关联商城商品的当前主图替换此图片组（包括尚未保存的图片选择和顺序），并立即保存。产品资料和已有报价文件保持不变。', reimport)}>重新导入商品主图</Button></div><p className="mt-1 text-sm text-slate-500">拖动图片调整顺序，也可用前移、后移按钮；调整后点击“保存图片”。</p>{!catalogLinked && <p className="mt-1 text-xs text-slate-500">此常用产品未关联商城商品，无法重新导入商品主图。</p>}</div><SimpleImagePicker sortable images={value} onChange={setValue} onBusy={setUploading} disabled={pending} /><Button disabled={pending || uploading} variant="outline" onClick={() => { setOperation('save'); setMessage(''); setFailed(false); startTransition(async () => { try { const result = await saveCommonProductImages({ id: productId, updatedAt: expectedUpdatedAt, sourceIds: value.map((image) => image.id) }); setMessage(result.reason); setFailed(!result.success); if (result.success) router.refresh() } catch { setMessage('图片保存失败，请刷新后重试'); setFailed(true) } }) }}>保存图片</Button>{pending && <p role="status" className="text-sm text-teal-800">{operation === 'reimport' ? '正在重新导入商品主图，请勿重复操作…' : '正在保存图片，请勿重复操作…'}</p>}{message && <p role={failed ? 'alert' : 'status'} className={`text-sm ${failed ? 'text-red-700' : ''}`}>{message}</p>}</section>
}
