'use client'

import { useId, useRef, useState, type DragEvent } from 'react'
import Image from 'next/image'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import type { SimpleImage } from '@/lib/quotation/simple-input'

const uploadResult = z.object({ success: z.boolean(), reason: z.string(), data: z.object({ id: z.string().uuid(), securityStatus: z.string() }).optional() })
const dragType = 'application/x-quotation-image'
const imageKey = (image: SimpleImage) => `${image.kind}-${image.id}`

export function SimpleImagePicker({ images, onChange, onBusy, disabled, sortable = false, maxImages = 8, maxSizeMb = 5, label = '添加产品图片' }: { images: SimpleImage[]; onChange: (images: SimpleImage[]) => void; onBusy?: (busy: boolean) => void; disabled?: boolean; sortable?: boolean; maxImages?: number; maxSizeMb?: number; label?: string }) {
  const id = useId()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const dragKey = useRef<string | null>(null)
  const [dragging, setDragging] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<string | null>(null)
  const canSort = sortable && !busy && !disabled
  function clearDrag() {
    dragKey.current = null; setDragging(null); setDropTarget(null)
  }
  function moveImage(key: string, targetIndex: number) {
    if (!canSort || targetIndex < 0 || targetIndex >= images.length) return
    const index = images.findIndex((image) => imageKey(image) === key)
    if (index < 0 || index === targetIndex) return
    const next = [...images]
    const [moved] = next.splice(index, 1)
    next.splice(targetIndex, 0, moved)
    onChange(next)
  }
  function isInternalDrag(event: DragEvent<HTMLDivElement>) {
    return canSort && dragKey.current !== null && event.dataTransfer.types.includes(dragType) && !event.dataTransfer.types.includes('Files')
  }
  async function upload(file: File) {
    setError('')
    if (!['image/png', 'image/jpeg'].includes(file.type) || file.size > maxSizeMb * 1024 * 1024) { setError(`请选择不超过 ${maxSizeMb} MB 的 PNG 或 JPEG 图片`); return }
    clearDrag(); setBusy(true); onBusy?.(true)
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
    <div className="flex flex-wrap gap-3">{images.map((image, index) => <div key={imageKey(image)} data-image-key={imageKey(image)} data-dragging={canSort && dragging === imageKey(image) ? true : undefined} data-drop-target={canSort && dropTarget === imageKey(image) ? true : undefined} draggable={canSort} onDragStart={(event) => {
      if (!canSort || (event.target instanceof HTMLElement && event.target.closest('button,input'))) { event.preventDefault(); clearDrag(); return }
      const key = imageKey(image)
      dragKey.current = key; setDragging(key); setDropTarget(null)
      event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData(dragType, key)
    }} onDragOver={(event) => {
      if (!isInternalDrag(event)) return
      event.preventDefault(); event.dataTransfer.dropEffect = 'move'
      setDropTarget(dragKey.current === imageKey(image) ? null : imageKey(image))
    }} onDragLeave={(event) => {
      if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) setDropTarget(null)
    }} onDrop={(event) => {
      const key = dragKey.current
      if (key && isInternalDrag(event) && event.dataTransfer.getData(dragType) === key) {
        event.preventDefault(); moveImage(key, index)
      }
      clearDrag()
    }} onDragEnd={clearDrag} className={`relative rounded-xl border bg-white p-2 ${sortable ? 'w-28' : 'w-24'} ${canSort ? 'cursor-move' : ''} ${canSort && dragging === imageKey(image) ? 'opacity-50' : ''} ${canSort && dropTarget === imageKey(image) ? 'border-teal-600 ring-2 ring-teal-500' : ''}`}>
      {sortable && <p className="mb-1 text-center text-xs text-slate-500">图片 {index + 1}</p>}
      {/* Bypass the optimizer so the browser sends ADMIN session cookies directly. */}
      <Image unoptimized draggable={false} width={96} height={80} src={`/api/admin/quotation-images/${image.id}?kind=${image.kind}`} alt={image.name} className="h-20 w-full object-contain" />
      {sortable && <div className="mt-1 flex gap-1">
        <Button type="button" size="sm" variant="ghost" disabled={!canSort || index === 0} onClick={() => { clearDrag(); moveImage(imageKey(image), index - 1) }} aria-label={`前移图片 ${index + 1}`} title="前移" className="h-11 flex-1 px-0">←</Button>
        <Button type="button" size="sm" variant="ghost" disabled={!canSort || index === images.length - 1} onClick={() => { clearDrag(); moveImage(imageKey(image), index + 1) }} aria-label={`后移图片 ${index + 1}`} title="后移" className="h-11 flex-1 px-0">→</Button>
      </div>}
      <Button type="button" size="sm" variant="ghost" disabled={busy || disabled} onClick={() => onChange(images.filter((_, i) => i !== index))} aria-label={`移除图片 ${index + 1}`} className="mt-1 h-11 w-full text-xs">移除</Button>
    </div>)}</div>
    {images.length < maxImages && <div><label htmlFor={id} className="mb-1 block text-xs text-slate-500">{busy ? '正在上传图片…' : `${label} · PNG / JPEG，单张 ${maxSizeMb} MB，最多 ${maxImages} 张`}</label><input id={id} type="file" accept="image/png,image/jpeg" disabled={busy || disabled} className="max-w-full text-sm file:mr-3 file:rounded-md file:border file:bg-white file:px-3 file:py-2" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void upload(file) }} /></div>}
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
  </div>
}
