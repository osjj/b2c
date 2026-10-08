'use client'

import { useId, useRef, useState, type ClipboardEvent, type DragEvent } from 'react'
import Image from 'next/image'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import type { SimpleImage } from '@/lib/quotation/simple-input'

const uploadResult = z.object({ success: z.boolean(), reason: z.string(), data: z.object({ id: z.string().uuid(), securityStatus: z.string() }).optional() })
const dragType = 'application/x-quotation-image'
const imageKey = (image: SimpleImage) => `${image.kind}-${image.id}`

function clipboardFileName(file: File) {
  const extension = file.type === 'image/jpeg' ? 'jpg' : file.type === 'image/png' ? 'png' : null
  if (!extension || (extension === 'jpg' ? /\.jpe?g$/i : /\.png$/i).test(file.name)) return file
  const name = file.name.replace(/\.[^.]+$/, '') || 'pasted-image'
  return new File([file], `${name}.${extension}`, { type: file.type, lastModified: file.lastModified })
}

export function SimpleImagePicker({ images, onChange, onBusy, disabled, sortable = false, pasteAndDrop = false, maxImages = 8, maxSizeMb = 5, label = '添加产品图片' }: { images: SimpleImage[]; onChange: (images: SimpleImage[]) => void; onBusy?: (busy: boolean) => void; disabled?: boolean; sortable?: boolean; pasteAndDrop?: boolean; maxImages?: number; maxSizeMb?: number; label?: string }) {
  const id = useId()
  const busyRef = useRef(false)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [error, setError] = useState('')
  const dragKey = useRef<string | null>(null)
  const [dragging, setDragging] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<string | null>(null)
  const fileDragDepth = useRef(0)
  const [fileDragging, setFileDragging] = useState(false)
  const canSort = sortable && !busy && !disabled
  const full = images.length >= maxImages
  const fileDropActive = pasteAndDrop && fileDragging && !busy && !disabled && !full
  function clearDrag() {
    dragKey.current = null; setDragging(null); setDropTarget(null)
  }
  function clearFileDrag() {
    fileDragDepth.current = 0; setFileDragging(false)
  }
  function moveImage(key: string, targetIndex: number) {
    if (busyRef.current || !canSort || targetIndex < 0 || targetIndex >= images.length) return
    const index = images.findIndex((image) => imageKey(image) === key)
    if (index < 0 || index === targetIndex) return
    const next = [...images]
    const [moved] = next.splice(index, 1)
    next.splice(targetIndex, 0, moved)
    onChange(next)
  }
  function isInternalDrag(event: DragEvent<HTMLDivElement>) {
    return !busyRef.current && canSort && dragKey.current !== null && event.dataTransfer.types.includes(dragType) && !event.dataTransfer.types.includes('Files')
  }
  async function upload(files: File[]) {
    // This lock is immediate, including before React renders the disabled controls.
    if (busyRef.current || busy || files.length === 0) return
    if (disabled) { setError('正在保存或重新导入图片，请完成后再上传'); return }
    const remaining = Math.max(0, maxImages - images.length)
    if (files.length > remaining) { setError(`最多 ${maxImages} 张图片，目前还可添加 ${remaining} 张；请选择更少的图片`); return }
    const invalidFiles = files.filter((file) => !['image/png', 'image/jpeg'].includes(file.type) || file.size === 0 || file.size > maxSizeMb * 1024 * 1024)
    if (invalidFiles.length > 0) { setError(`${invalidFiles.map((file) => file.name || '未命名图片').join('、')}：请选择非空且不超过 ${maxSizeMb} MB 的 PNG 或 JPEG 图片`); return }
    busyRef.current = true
    clearDrag(); clearFileDrag(); setError(''); setProgress({ current: 1, total: files.length }); setBusy(true); onBusy?.(true)
    let nextImages = [...images]
    const failures: string[] = []
    try {
      for (const [index, file] of files.entries()) {
        setProgress({ current: index + 1, total: files.length })
        try {
          const form = new FormData(); form.set('file', file)
          const response = await fetch('/api/admin/quotation-files/upload', { method: 'POST', body: form })
          if (response.redirected || !response.headers.get('content-type')?.includes('application/json')) throw new Error('登录状态可能已失效，请重新登录后上传')
          const parsed = uploadResult.safeParse(await response.json().catch(() => null))
          if (!parsed.success) throw new Error('图片上传响应无效，请刷新后检查图片再重试')
          const result = parsed.data
          if (!response.ok || !result.success || !result.data) throw new Error(result.reason || '图片上传失败，请重试')
          if (result.data.securityStatus !== 'CLEAN') throw new Error('图片尚未通过安全检查，请稍后重试')
          if (nextImages.some((image) => image.id === result.data?.id)) throw new Error('这张图片已经添加，请选择其他图片')
          nextImages = [...nextImages, { id: result.data.id, kind: 'source', name: file.name }]
          onChange(nextImages)
        } catch (cause) {
          const reason = cause instanceof TypeError ? '网络异常，图片上传失败，请重试' : cause instanceof Error ? cause.message : '图片上传失败，请重试'
          failures.push(`${file.name || '未命名图片'}：${reason}`)
          setError(failures.join('；'))
        }
      }
    } finally { busyRef.current = false; setBusy(false); onBusy?.(false) }
  }
  function pasteImages(event: ClipboardEvent<HTMLDivElement>) {
    if (event.target instanceof HTMLElement && (event.target.isContentEditable || event.target.closest('input,textarea,select'))) return
    const itemFiles = Array.from(event.clipboardData.items).filter((item) => item.kind === 'file').map((item) => item.getAsFile()).filter((file): file is File => file !== null)
    const files = itemFiles.length > 0 ? itemFiles : Array.from(event.clipboardData.files)
    if (files.length === 0) return
    event.preventDefault(); event.stopPropagation()
    void upload(files.map(clipboardFileName))
  }
  return <div data-image-picker data-file-drop-target={fileDropActive ? true : undefined} onPaste={pasteAndDrop ? pasteImages : undefined} onDragEnter={pasteAndDrop ? (event) => {
    if (!event.dataTransfer.types.includes('Files')) return
    event.preventDefault(); clearDrag(); fileDragDepth.current += 1; setFileDragging(true)
  } : undefined} onDragOver={pasteAndDrop ? (event) => {
    if (!event.dataTransfer.types.includes('Files')) return
    event.preventDefault(); event.dataTransfer.dropEffect = busyRef.current || busy || disabled || full ? 'none' : 'copy'
  } : undefined} onDragLeave={pasteAndDrop ? (event) => {
    if (!event.dataTransfer.types.includes('Files')) return
    fileDragDepth.current = Math.max(0, fileDragDepth.current - 1)
    if (fileDragDepth.current === 0) setFileDragging(false)
  } : undefined} onDrop={pasteAndDrop ? (event) => {
    if (!event.dataTransfer.types.includes('Files')) return
    event.preventDefault(); event.stopPropagation(); clearFileDrag(); clearDrag()
    void upload(Array.from(event.dataTransfer.files))
  } : undefined} onDragEnd={pasteAndDrop ? clearFileDrag : undefined} className="space-y-3">
    <div className="flex flex-wrap gap-3">{images.map((image, index) => <div key={imageKey(image)} data-image-key={imageKey(image)} data-dragging={canSort && dragging === imageKey(image) ? true : undefined} data-drop-target={canSort && dropTarget === imageKey(image) ? true : undefined} draggable={canSort} onDragStart={(event) => {
      if (busyRef.current || !canSort || (event.target instanceof HTMLElement && event.target.closest('button,input'))) { event.preventDefault(); clearDrag(); return }
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
      <Button type="button" size="sm" variant="ghost" disabled={busy || disabled} onClick={() => { if (!busyRef.current && !disabled) { clearDrag(); onChange(images.filter((_, i) => i !== index)) } }} aria-label={`移除图片 ${index + 1}`} className="mt-1 h-11 w-full text-xs">移除</Button>
    </div>)}</div>
    {pasteAndDrop && <button type="button" aria-label="粘贴或拖拽上传图片" aria-describedby={`${id}-upload-help`} disabled={busy || disabled || full} onClick={(event) => event.currentTarget.focus()} className={`flex min-h-24 w-full flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed px-4 py-4 text-center text-sm outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${fileDropActive ? 'border-teal-600 bg-teal-50' : 'border-slate-300 bg-slate-50 text-slate-600'}`}><span>{full ? `已达到 ${maxImages} 张图片上限` : '将图片拖到这里，或点击这里后按 Ctrl+V 粘贴'}</span><span id={`${id}-upload-help`} className="text-xs">PNG / JPEG，单张不超过 {maxSizeMb} MB，最多 {maxImages} 张；可一次上传多张</span></button>}
    {images.length < maxImages && <div><label htmlFor={id} className="mb-1 block text-xs text-slate-500">{`${label} · PNG / JPEG，单张 ${maxSizeMb} MB，最多 ${maxImages} 张`}</label><input id={id} type="file" accept="image/png,image/jpeg" multiple={pasteAndDrop} disabled={busy || disabled} className="max-w-full text-sm file:mr-3 file:rounded-md file:border file:bg-white file:px-3 file:py-2" onChange={(event) => { const files = Array.from(event.target.files ?? []); event.target.value = ''; void upload(pasteAndDrop ? files : files.slice(0, 1)) }} /></div>}
    {busy && <p role="status" className="text-sm text-teal-800">正在上传图片（{progress.current}/{progress.total}），请等待上传完成…</p>}
    {error && <p role="alert" className="break-words text-sm text-red-700">{error}</p>}
  </div>
}
