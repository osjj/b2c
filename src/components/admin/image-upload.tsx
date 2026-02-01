'use client'

import { useState, useCallback, useRef } from 'react'
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
}

export function ImageUpload({
  value = [],
  onChange,
  maxImages = 5,
  productName = '',
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [aiDialogOpen, setAiDialogOpen] = useState(false)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  // 单图重新生成：记录要替换的图片索引，-1 表示添加新图片模式
  const [regenerateIndex, setRegenerateIndex] = useState<number>(-1)
  // 拖拽排序状态
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const dragNodeRef = useRef<HTMLDivElement | null>(null)

  // 生成默认 alt 文本
  const generateDefaultAlt = (index: number) => {
    if (productName) {
      return index === 0 ? productName : `${productName} - Image ${index + 1}`
    }
    return `Product image ${index + 1}`
  }

  const handleUpload = useCallback(
    async (files: FileList) => {
      if (value.length >= maxImages) return

      setUploading(true)
      const newImages: ImageData[] = []

      for (const file of Array.from(files)) {
        if (value.length + newImages.length >= maxImages) break

        const formData = new FormData()
        formData.append('file', file)

        try {
          const res = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
          })

          if (res.ok) {
            const { url } = await res.json()
            newImages.push({
              url,
              alt: generateDefaultAlt(value.length + newImages.length),
            })
          }
        } catch (error) {
          console.error('Upload failed:', error)
        }
      }

      onChange([...value, ...newImages])
      setUploading(false)
    },
    [value, onChange, maxImages, productName]
  )

  const handleRemove = (index: number) => {
    const newImages = value.filter((_, i) => i !== index)
    onChange(newImages)
  }

  const handleAltChange = (index: number, alt: string) => {
    const newImages = [...value]
    newImages[index] = { ...newImages[index], alt }
    onChange(newImages)
  }

  // 拖拽排序处理
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDragIndex(index)
    dragNodeRef.current = e.target as HTMLDivElement
    // 设置拖拽时的透明效果
    if (dragNodeRef.current) {
      dragNodeRef.current.style.opacity = '0.5'
    }
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragIndex !== null && dragIndex !== index) {
      setDragOverIndex(index)
    }
  }

  const handleDragEnter = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (dragIndex !== null && dragIndex !== index) {
      setDragOverIndex(index)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    if (dragIndex === null || dragIndex === dropIndex) return

    const newImages = [...value]
    const draggedImage = newImages[dragIndex]

    // 移除拖拽的图片
    newImages.splice(dragIndex, 1)
    // 在目标位置插入
    newImages.splice(dropIndex, 0, draggedImage)

    onChange(newImages)
    setDragIndex(null)
    setDragOverIndex(null)
  }

  const handleDragEnd = () => {
    if (dragNodeRef.current) {
      dragNodeRef.current.style.opacity = '1'
    }
    setDragIndex(null)
    setDragOverIndex(null)
    dragNodeRef.current = null
  }

  // 打开 AI 弹框（添加新图片模式）
  const openAiDialogForAdd = () => {
    setRegenerateIndex(-1)
    setAiDialogOpen(true)
  }

  // 打开 AI 弹框（重新生成指定图片）
  const openAiDialogForRegenerate = (index: number) => {
    setRegenerateIndex(index)
    setAiDialogOpen(true)
  }

  // 处理 AI 生成的图片
  const handleAIImagesGenerated = async (generatedImages: string[]) => {
    // 上传 base64 图片到服务器
    const uploadedImages: ImageData[] = []

    for (const base64 of generatedImages) {
      // 在替换模式下只需要第一张图
      if (regenerateIndex >= 0 && uploadedImages.length >= 1) break
      // 在添加模式下检查数量限制
      if (regenerateIndex < 0 && value.length + uploadedImages.length >= maxImages) break

      try {
        // 将 base64 转换为 Blob
        const response = await fetch(base64)
        const blob = await response.blob()
        const file = new File([blob], `ai-generated-${Date.now()}.png`, { type: 'image/png' })

        const formData = new FormData()
        formData.append('file', file)

        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        })

        if (res.ok) {
          const { url } = await res.json()
          uploadedImages.push({
            url,
            alt: regenerateIndex >= 0
              ? value[regenerateIndex].alt // 保留原 alt
              : generateDefaultAlt(value.length + uploadedImages.length),
          })
        }
      } catch (error) {
        console.error('Failed to upload AI generated image:', error)
      }
    }

    if (uploadedImages.length > 0) {
      if (regenerateIndex >= 0) {
        // 替换模式：用新图片替换指定位置的图片
        const newValue = [...value]
        newValue[regenerateIndex] = uploadedImages[0]
        onChange(newValue)
      } else {
        // 添加模式：追加新图片
        onChange([...value, ...uploadedImages])
      }
    }
    setAiDialogOpen(false)
    setRegenerateIndex(-1)
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {value.map((image, index) => (
          <div
            key={image.url}
            className={cn(
              "space-y-2 transition-all duration-200",
              dragOverIndex === index && dragIndex !== index && "scale-105",
              dragIndex === index && "opacity-50"
            )}
            draggable
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnter={(e) => handleDragEnter(e, index)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
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
                className="object-cover rounded-lg"
                onClick={() => setPreviewImage(image.url)}
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
                onClick={() => setPreviewImage(image.url)}
                className="absolute top-2 left-10 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                title="View"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
              {/* AI 重新生成按钮 */}
              <button
                type="button"
                onClick={() => openAiDialogForRegenerate(index)}
                className="absolute top-2 left-[4.5rem] p-1 bg-purple-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                title="AI Regenerate"
              >
                <Wand2 className="h-4 w-4" />
              </button>
              {/* 删除按钮 */}
              <button
                type="button"
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
              uploading && 'pointer-events-none opacity-50'
            )}
          >
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => e.target.files && handleUpload(e.target.files)}
              disabled={uploading}
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
