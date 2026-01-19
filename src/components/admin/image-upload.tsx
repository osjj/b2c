'use client'

import { useState, useCallback } from 'react'
import Image from 'next/image'
import { Upload, X, Loader2, Sparkles, ZoomIn } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { AIImageDialog } from './ai-product-generator'
import { ImagePreviewDialog } from './image-preview-dialog'

interface ImageUploadProps {
  value: string[]
  onChange: (urls: string[]) => void
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

  const handleUpload = useCallback(
    async (files: FileList) => {
      if (value.length >= maxImages) return

      setUploading(true)
      const newUrls: string[] = []

      for (const file of Array.from(files)) {
        if (value.length + newUrls.length >= maxImages) break

        const formData = new FormData()
        formData.append('file', file)

        try {
          const res = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
          })

          if (res.ok) {
            const { url } = await res.json()
            newUrls.push(url)
          }
        } catch (error) {
          console.error('Upload failed:', error)
        }
      }

      onChange([...value, ...newUrls])
      setUploading(false)
    },
    [value, onChange, maxImages]
  )

  const handleRemove = (index: number) => {
    const newUrls = value.filter((_, i) => i !== index)
    onChange(newUrls)
  }

  // 处理 AI 生成的图片
  const handleAIImagesGenerated = async (generatedImages: string[]) => {
    // 上传 base64 图片到服务器
    const uploadedUrls: string[] = []

    for (const base64 of generatedImages) {
      if (value.length + uploadedUrls.length >= maxImages) break

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
          uploadedUrls.push(url)
        }
      } catch (error) {
        console.error('Failed to upload AI generated image:', error)
      }
    }

    if (uploadedUrls.length > 0) {
      onChange([...value, ...uploadedUrls])
    }
    setAiDialogOpen(false)
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {value.map((url, index) => (
          <div key={url} className="relative aspect-square group">
            <Image
              src={url}
              alt={`Product image ${index + 1}`}
              fill
              className="object-cover rounded-lg cursor-pointer"
              onClick={() => setPreviewImage(url)}
            />
            <input type="hidden" name="images" value={url} />
            {/* 放大按钮 */}
            <button
              type="button"
              onClick={() => setPreviewImage(url)}
              className="absolute top-2 left-2 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              title="查看大图"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
            {/* 删除按钮 */}
            <button
              type="button"
              onClick={() => handleRemove(index)}
              className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              title="删除图片"
            >
              <X className="h-4 w-4" />
            </button>
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
        </p>
        {value.length < maxImages && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setAiDialogOpen(true)}
            className="gap-2"
          >
            <Sparkles className="h-4 w-4" />
            AI 生成图片
          </Button>
        )}
      </div>

      <AIImageDialog
        open={aiDialogOpen}
        onOpenChange={setAiDialogOpen}
        referenceImages={value}
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
