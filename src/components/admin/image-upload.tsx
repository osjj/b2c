'use client'

import { useId, useLayoutEffect, useState, useRef, type ClipboardEvent, type DragEvent } from 'react'
import Image from 'next/image'
import { Upload, X, Loader2, Sparkles, ZoomIn, Wand2, GripVertical } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AIImageDialog } from './ai-product-generator'
import { ImagePreviewDialog } from './image-preview-dialog'
import type { ImageData } from '@/types/image'

interface ImageUploadProps {
  value: ImageData[]
  onChange: (images: ImageData[]) => void
  maxImages?: number
  productName?: string
  pasteAndDrop?: boolean
  disabled?: boolean
  onBusy?: (busy: boolean) => void
}

const imageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const maxImageBytes = 10 * 1024 * 1024
const imageDragType = 'application/x-product-gallery-image'

function clipboardImageFile(file: File) {
  const extensions: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' }
  const extension = extensions[file.type]
  if (!extension || (extension === 'jpg' ? /\.jpe?g$/i : new RegExp(`\\.${extension}$`, 'i')).test(file.name)) return file
  const name = file.name.replace(/\.[^.]+$/, '') || 'pasted-image'
  return new File([file], `${name}.${extension}`, { type: file.type, lastModified: file.lastModified })
}

export function ImageUpload({
  value = [],
  onChange,
  maxImages = 5,
  productName = '',
  pasteAndDrop = false,
  disabled = false,
  onBusy,
}: ImageUploadProps) {
  const uploadId = useId()
  const [uploading, setUploading] = useState(false)
  const busyRef = useRef(false)
  const valueRef = useRef(value)
  useLayoutEffect(() => { valueRef.current = value }, [value])
  const [uploadError, setUploadError] = useState('')
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [aiDialogOpen, setAiDialogOpen] = useState(false)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  // 单图重新生成：记录要替换的图片索引，-1 表示添加新图片模式
  const [regenerateIndex, setRegenerateIndex] = useState<number>(-1)
  // 拖拽排序状态
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const dragIndexRef = useRef<number | null>(null)
  const suppressPreviewClick = useRef(false)
  const fileDragDepth = useRef(0)
  const [fileDragging, setFileDragging] = useState(false)
  const controlsDisabled = uploading || disabled

  const updateImages = (nextImages: ImageData[]) => {
    valueRef.current = nextImages
    onChange(nextImages)
  }
  const clearDrag = () => {
    dragIndexRef.current = null
    setDragIndex(null)
    setDragOverIndex(null)
  }
  const clearFileDrag = () => { fileDragDepth.current = 0; setFileDragging(false) }

  // 生成默认 alt 文本
  const generateDefaultAlt = (index: number) => {
    if (productName) {
      return index === 0 ? productName : `${productName} - Image ${index + 1}`
    }
    return `Product image ${index + 1}`
  }

  const beginUpload = (fromAi = false) => {
    if (busyRef.current) return false
    if (disabled || (!fromAi && (aiDialogOpen || previewImage))) {
      setUploadError('请先完成当前操作，再上传图片。')
      return false
    }
    busyRef.current = true
    clearDrag(); clearFileDrag(); setUploadError(''); setProgress({ current: 0, total: 0 }); setUploading(true); onBusy?.(true)
    return true
  }
  const endUpload = () => { busyRef.current = false; setUploading(false); onBusy?.(false) }

  // Selection, clipboard, drops and generated files share the public upload contract.
  const uploadFiles = async (files: File[], replaceIndex = -1) => {
    if (files.length === 0) return []
    const remaining = replaceIndex >= 0 ? 1 : Math.max(0, maxImages - valueRef.current.length)
    if (files.length > remaining) throw new Error(`最多 ${maxImages} 张图片，目前还可添加 ${remaining} 张；请选择更少的图片。`)
    const invalid = files.filter(file => !imageTypes.includes(file.type) || file.size === 0 || file.size > maxImageBytes)
    if (invalid.length) throw new Error(`${invalid.map(file => file.name || '未命名图片').join('、')}：请选择非空且不超过 10 MB 的 JPEG、PNG、WebP 或 GIF 图片。`)
    const failures: string[] = []
    for (const [index, file] of files.entries()) {
      setProgress({ current: index + 1, total: files.length })
      try {
        const formData = new FormData(); formData.append('file', file)
        const response = await fetch('/api/upload', { method: 'POST', body: formData })
        if (response.redirected || !response.headers.get('content-type')?.includes('application/json')) throw new Error('登录状态可能已失效，请重新登录后上传。')
        const result: unknown = await response.json().catch(() => null)
        if (!response.ok) {
          const reason = result && typeof result === 'object' && 'error' in result && typeof result.error === 'string' ? result.error : '图片上传失败，请重试。'
          throw new Error(response.status === 401 || response.status === 403 ? '登录状态已失效，请重新登录后上传。' : reason)
        }
        if (!result || typeof result !== 'object' || !('url' in result) || typeof result.url !== 'string' || !result.url.trim()) throw new Error('图片上传响应无效，请重试。')
        const url = result.url.trim()
        if (!['http:', 'https:'].includes(new URL(url, window.location.origin).protocol)) throw new Error('图片上传响应中的地址无效，请重试。')
        if (valueRef.current.some(image => image.url === url)) throw new Error('这张图片已经添加，请选择其他图片。')
        const next = [...valueRef.current]
        const image = { url, alt: replaceIndex >= 0 ? next[replaceIndex]?.alt || generateDefaultAlt(replaceIndex) : generateDefaultAlt(next.length) }
        if (replaceIndex >= 0) {
          if (!next[replaceIndex]) throw new Error('要替换的图片已变更，请重新选择。')
          next[replaceIndex] = image
        } else next.push(image)
        updateImages(next)
      } catch (cause) {
        const reason = cause instanceof TypeError ? '网络异常，图片上传失败，请重试。' : cause instanceof Error ? cause.message : '图片上传失败，请重试。'
        failures.push(`${file.name || '未命名图片'}：${reason}`)
        setUploadError(failures.join('；'))
      }
    }
    return failures
  }

  const handleUpload = async (files: File[]) => {
    if (!files.length || !beginUpload()) return
    try { await uploadFiles(files) }
    catch (cause) { setUploadError(cause instanceof Error ? cause.message : '图片上传失败，请重试。') }
    finally { endUpload() }
  }

  const handlePaste = (event: ClipboardEvent<HTMLDivElement>) => {
    if (!(event.target instanceof Node) || !event.currentTarget.contains(event.target)) return
    if (event.target instanceof HTMLElement && (event.target.isContentEditable || event.target.closest('input,textarea,select'))) return
    const itemFiles = Array.from(event.clipboardData.items).filter(item => item.kind === 'file').map(item => item.getAsFile()).filter((file): file is File => file !== null)
    const files = itemFiles.length ? itemFiles : Array.from(event.clipboardData.files)
    if (!files.length) return
    event.preventDefault(); event.stopPropagation()
    void handleUpload(files.map(clipboardImageFile))
  }

  const handleRemove = (index: number) => {
    if (busyRef.current || disabled) return
    updateImages(valueRef.current.filter((_, i) => i !== index))
  }

  const handleAltChange = (index: number, alt: string) => {
    if (busyRef.current || disabled) return
    const newImages = [...valueRef.current]
    newImages[index] = { ...newImages[index], alt }
    updateImages(newImages)
  }

  // 拖拽排序处理
  const handleDragStart = (e: DragEvent<HTMLDivElement>, index: number) => {
    if (busyRef.current || disabled || (e.target instanceof HTMLElement && e.target.closest('button,input'))) { e.preventDefault(); return }
    suppressPreviewClick.current = true
    dragIndexRef.current = index
    setDragIndex(index)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData(imageDragType, String(index))
  }

  const isInternalDrag = (e: DragEvent<HTMLDivElement>) => !busyRef.current && !disabled && dragIndexRef.current !== null && e.dataTransfer.types.includes(imageDragType) && !e.dataTransfer.types.includes('Files')
  const handleDragOver = (e: DragEvent<HTMLDivElement>, index: number) => {
    if (!isInternalDrag(e)) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragIndexRef.current !== index) {
      setDragOverIndex(index)
    }
  }

  const handleDragEnter = (e: DragEvent<HTMLDivElement>, index: number) => {
    if (!isInternalDrag(e)) return
    e.preventDefault()
    if (dragIndexRef.current !== index) {
      setDragOverIndex(index)
    }
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>, dropIndex: number) => {
    if (!isInternalDrag(e)) return
    e.preventDefault(); e.stopPropagation()
    const sourceIndex = dragIndexRef.current
    if (sourceIndex !== null && sourceIndex !== dropIndex && e.dataTransfer.getData(imageDragType) === String(sourceIndex)) {
      const next = [...valueRef.current]
      const [moved] = next.splice(sourceIndex, 1)
      next.splice(dropIndex, 0, moved)
      updateImages(next)
    }
    clearDrag()
  }

  // 打开 AI 弹框（添加新图片模式）
  const openAiDialogForAdd = () => {
    if (busyRef.current || disabled) return
    setRegenerateIndex(-1)
    setAiDialogOpen(true)
  }

  // 打开 AI 弹框（重新生成指定图片）
  const openAiDialogForRegenerate = (index: number) => {
    if (busyRef.current || disabled) return
    setRegenerateIndex(index)
    setAiDialogOpen(true)
  }

  // 处理 AI 生成的图片
  const handleAIImagesGenerated = async (generatedImages: string[]) => {
    if (!generatedImages.length || !beginUpload(true)) return
    try {
      const remaining = regenerateIndex >= 0 ? 1 : Math.max(0, maxImages - valueRef.current.length)
      const files: File[] = []
      for (const [index, source] of generatedImages.slice(0, remaining).entries()) {
        const response = await fetch(source)
        if (!response.ok) throw new Error('无法读取生成的图片，请重试。')
        const blob = await response.blob()
        const file = new File([blob], `ai-generated-${Date.now()}-${index}.png`, { type: blob.type || 'image/png' })
        files.push(clipboardImageFile(file))
      }
      if (!files.length) throw new Error(`最多 ${maxImages} 张图片，请先移除一张。`)
      await uploadFiles(files, regenerateIndex)
      setAiDialogOpen(false)
      setRegenerateIndex(-1)
    } catch (cause) {
      setUploadError(cause instanceof Error ? cause.message : '图片上传失败，请重试。')
    } finally {
      endUpload()
    }
  }

  return (
    <div
      data-image-upload
      data-file-drop-target={pasteAndDrop && fileDragging && !controlsDisabled && value.length < maxImages ? true : undefined}
      className="space-y-4"
      onPaste={pasteAndDrop ? handlePaste : undefined}
      onDragEnter={pasteAndDrop ? (event) => {
        if (!event.dataTransfer.types.includes('Files')) return
        event.preventDefault()
        if (!(event.target instanceof Node) || !event.currentTarget.contains(event.target)) return
        clearDrag(); fileDragDepth.current += 1; setFileDragging(true)
      } : undefined}
      onDragOver={pasteAndDrop ? (event) => {
        if (!event.dataTransfer.types.includes('Files')) return
        event.preventDefault()
        const inside = event.target instanceof Node && event.currentTarget.contains(event.target)
        event.dataTransfer.dropEffect = inside && !busyRef.current && !disabled && valueRef.current.length < maxImages ? 'copy' : 'none'
      } : undefined}
      onDragLeave={pasteAndDrop ? (event) => {
        if (!event.dataTransfer.types.includes('Files') || !(event.target instanceof Node) || !event.currentTarget.contains(event.target)) return
        fileDragDepth.current = Math.max(0, fileDragDepth.current - 1)
        if (fileDragDepth.current === 0) setFileDragging(false)
      } : undefined}
      onDrop={pasteAndDrop ? (event) => {
        if (!event.dataTransfer.types.includes('Files')) return
        event.preventDefault(); event.stopPropagation()
        if (!(event.target instanceof Node) || !event.currentTarget.contains(event.target)) return
        clearFileDrag(); clearDrag()
        void handleUpload(Array.from(event.dataTransfer.files))
      } : undefined}
      onDragEnd={pasteAndDrop ? clearFileDrag : undefined}
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {value.map((image, index) => (
          <div
            key={image.url}
            data-gallery-image={image.url}
            className={cn(
              "space-y-2 transition-all duration-200",
              dragOverIndex === index && dragIndex !== index && "scale-105",
              dragIndex === index && "opacity-50"
            )}
            draggable={!controlsDisabled}
            onPointerDownCapture={() => { suppressPreviewClick.current = false }}
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnter={(e) => handleDragEnter(e, index)}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={clearDrag}
          >
            <div
              className={cn(
                "relative aspect-square group rounded-lg",
                dragOverIndex === index && dragIndex !== index && "ring-2 ring-primary ring-offset-2"
              )}
            >
              <Image
                src={image.url}
                alt={image.alt || `Product image ${index + 1}`}
                fill
                draggable={false}
                className="object-cover rounded-lg"
                onClick={(event) => { if (!busyRef.current && !disabled && (!suppressPreviewClick.current || event.detail === 0)) setPreviewImage(image.url) }}
              />
              {/* 拖拽手柄 */}
              <div
                className="absolute top-2 left-2 p-1 bg-black/50 text-white rounded-full cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
                title="Drag to reorder"
              >
                <GripVertical className="h-4 w-4" />
              </div>
              {/* 放大按钮 */}
              <button
                type="button"
                disabled={controlsDisabled}
                onClick={() => { if (!busyRef.current && !disabled) setPreviewImage(image.url) }}
                className="absolute top-2 left-10 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                title="View"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
              {/* AI 重新生成按钮 */}
              <button
                type="button"
                disabled={controlsDisabled}
                onClick={() => openAiDialogForRegenerate(index)}
                className="absolute top-2 left-[4.5rem] p-1 bg-purple-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                title="AI Regenerate"
              >
                <Wand2 className="h-4 w-4" />
              </button>
              {/* 删除按钮 */}
              <button
                type="button"
                disabled={controlsDisabled}
                onClick={() => handleRemove(index)}
                className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                title="Delete"
              >
                <X className="h-4 w-4" />
              </button>
              {/* 序号标识 */}
              <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/60 text-white text-xs rounded">
                {index + 1}
              </div>
            </div>
            {/* Alt 文本输入框 */}
            <Input
              value={image.alt}
              disabled={controlsDisabled}
              onChange={(e) => handleAltChange(index, e.target.value)}
              placeholder="Image description for SEO"
              className="text-sm"
            />
          </div>
        ))}

        {value.length < maxImages && (
          <label
            className={cn(
              'aspect-square border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors',
              controlsDisabled && 'pointer-events-none opacity-50'
            )}
          >
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              className="hidden"
              onChange={(event) => {
                const files = Array.from(event.target.files ?? [])
                event.target.value = ''
                void handleUpload(files)
              }}
              disabled={controlsDisabled}
            />
            {uploading ? (
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            ) : (
              <>
                <Upload className="h-8 w-8 text-muted-foreground" />
                <span className="text-sm text-muted-foreground mt-2">
                  Upload
                </span>
              </>
            )}
          </label>
        )}
      </div>

      {pasteAndDrop && (
        <button
          type="button"
          aria-label="粘贴或拖拽上传图片"
          aria-describedby={`${uploadId}-help`}
          disabled={controlsDisabled || value.length >= maxImages}
          onClick={(event) => event.currentTarget.focus()}
          className={cn('flex min-h-24 w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-4 text-center text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 [-webkit-tap-highlight-color:transparent]', fileDragging && !controlsDisabled && value.length < maxImages ? 'border-primary bg-primary/5' : 'border-muted-foreground/30 bg-muted/20')}
        >
          <span>{value.length >= maxImages ? `已达到 ${maxImages} 张图片上限` : '将图片拖到这里，或点击这里后按 Ctrl+V 粘贴'}</span>
          <span id={`${uploadId}-help`} className="text-xs text-muted-foreground">JPEG / PNG / WebP / GIF，单张不超过 10 MB，最多 {maxImages} 张</span>
        </button>
      )}
      {uploading && <p role="status" className="text-sm text-muted-foreground">{progress.total ? `正在上传图片（${progress.current}/${progress.total}），请等待上传完成…` : '正在准备图片，请稍候…'}</p>}
      {uploadError && <p role="alert" className="break-words text-sm text-red-600">{uploadError}</p>}

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {value.length}/{maxImages} images uploaded
          {value.length > 1 && <span className="ml-2">• Drag to reorder</span>}
        </p>
        {value.length < maxImages && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={openAiDialogForAdd}
            disabled={controlsDisabled}
            className="gap-2"
          >
            <Sparkles className="h-4 w-4" />
            AI 生成图片
          </Button>
        )}
      </div>

      <AIImageDialog
        open={aiDialogOpen}
        onOpenChange={(open) => {
          if (busyRef.current) return
          setAiDialogOpen(open)
          if (!open) setRegenerateIndex(-1)
        }}
        referenceImages={
          regenerateIndex >= 0
            ? [value[regenerateIndex].url] // 重新生成模式：只用当前图片
            : value.map((img) => img.url) // 添加模式：用所有图片
        }
        productName={productName}
        onImagesGenerated={handleAIImagesGenerated}
      />

      {/* 图片预览弹框 */}
      <ImagePreviewDialog
        open={!!previewImage}
        onOpenChange={(open) => !open && setPreviewImage(null)}
        src={previewImage || ''}
        alt="产品图片预览"
      />
    </div>
  )
}
