'use client'

import { useState, useCallback } from 'react'
import Image from 'next/image'
import { Upload, X, Loader2, ImageIcon, Check } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { IMAGE_PROMPT_PRESETS, GEMINI_IMAGE_MODELS, DEFAULT_IMAGE_MODEL } from '@/types/ai-generation'
import type { GenerateImageResponse } from '@/types/ai-generation'

interface AIImageDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  referenceImages: string[]
  productName: string
  onImagesGenerated: (images: string[]) => void
}

export function AIImageDialog({
  open,
  onOpenChange,
  referenceImages,
  productName,
  onImagesGenerated,
}: AIImageDialogProps) {
  // 参考图片（继承自主弹框或新上传）
  const [images, setImages] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)

  // 模型选择
  const [model, setModel] = useState<string>(DEFAULT_IMAGE_MODEL)
  const [aspectRatio, setAspectRatio] = useState<string>('1:1')
  const [imageSize, setImageSize] = useState<string>('1K')

  // 提示词
  const [prompt, setPrompt] = useState('')

  // 生成状态
  const [generating, setGenerating] = useState(false)
  const [generatedImages, setGeneratedImages] = useState<string[]>([])
  const [selectedImages, setSelectedImages] = useState<Set<number>>(new Set())
  const [error, setError] = useState('')

  // 初始化时使用主弹框的参考图
  const effectiveImages = images.length > 0 ? images : referenceImages

  // 图片上传
  const handleImageUpload = useCallback(async (files: FileList) => {
    if (images.length >= 3) return

    setUploading(true)
    const newImages: string[] = []

    for (const file of Array.from(files)) {
      if (images.length + newImages.length >= 3) break

      const reader = new FileReader()
      const base64 = await new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string)
        reader.readAsDataURL(file)
      })
      newImages.push(base64)
    }

    setImages((prev) => [...prev, ...newImages])
    setUploading(false)
  }, [images.length])

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index))
  }

  // 应用预设提示词
  const applyPreset = (presetPrompt: string) => {
    const productContext = productName
      ? `Product: ${productName}. `
      : ''
    setPrompt(productContext + presetPrompt)
  }

  // 生成图片
  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt')
      return
    }

    setGenerating(true)
    setError('')
    setGeneratedImages([])
    setSelectedImages(new Set())

    try {
      const response = await fetch('/api/ai/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          referenceImages: effectiveImages,
          prompt: prompt.trim(),
          count: 4,
          model,
          aspectRatio,
          imageSize,
        }),
      })

      const result: GenerateImageResponse = await response.json()

      if (!result.success || !result.images) {
        throw new Error(result.error || 'Failed to generate images')
      }

      setGeneratedImages(result.images)
      // 默认选中所有图片
      setSelectedImages(new Set(result.images.map((_, i) => i)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate images')
    } finally {
      setGenerating(false)
    }
  }

  // 切换图片选择
  const toggleImageSelection = (index: number) => {
    setSelectedImages((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(index)) {
        newSet.delete(index)
      } else {
        newSet.add(index)
      }
      return newSet
    })
  }

  // 应用选中的图片
  const handleApply = () => {
    const selected = generatedImages.filter((_, i) => selectedImages.has(i))
    if (selected.length > 0) {
      onImagesGenerated(selected)
    }
  }

  // 重置弹框
  const handleClose = (isOpen: boolean) => {
    if (!isOpen && generatedImages.length > 0) {
      // 有生成内容时，二次确认
      const confirmed = window.confirm(
        'You have generated images that have not been used. Are you sure you want to close?'
      )
      if (!confirmed) return
    }

    if (!isOpen) {
      setImages([])
      setModel(DEFAULT_IMAGE_MODEL)
      setAspectRatio('1:1')
      setImageSize('1K')
      setPrompt('')
      setGeneratedImages([])
      setSelectedImages(new Set())
      setError('')
    }
    onOpenChange(isOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            AI Image Generator
          </DialogTitle>
          <DialogDescription>
            Generate product images using AI based on reference images and prompt
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 参考图片 */}
          <div className="space-y-2">
            <Label>Reference Images</Label>
            <div className="flex gap-2">
              {effectiveImages.slice(0, 3).map((src, index) => (
                <div key={index} className="relative w-20 h-20 group">
                  <Image
                    src={src}
                    alt={`Reference ${index + 1}`}
                    fill
                    className="object-cover rounded-md"
                  />
                  {images.length > 0 && (
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute -top-1 -right-1 p-0.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ))}

              {effectiveImages.length < 3 && (
                <label
                  className={cn(
                    'w-20 h-20 border-2 border-dashed rounded-md flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors',
                    uploading && 'pointer-events-none opacity-50'
                  )}
                >
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => e.target.files && handleImageUpload(e.target.files)}
                    disabled={uploading}
                  />
                  {uploading ? (
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  ) : (
                    <Upload className="h-5 w-5 text-muted-foreground" />
                  )}
                </label>
              )}
            </div>
          </div>

          {/* 模型和比例选择 */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Image Model</Label>
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger>
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  {GEMINI_IMAGE_MODELS.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Aspect Ratio</Label>
              <Select value={aspectRatio} onValueChange={setAspectRatio}>
                <SelectTrigger>
                  <SelectValue placeholder="Select ratio" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1:1">1:1 (Square)</SelectItem>
                  <SelectItem value="16:9">16:9 (Landscape)</SelectItem>
                  <SelectItem value="9:16">9:16 (Portrait)</SelectItem>
                  <SelectItem value="4:3">4:3</SelectItem>
                  <SelectItem value="3:4">3:4</SelectItem>
                  <SelectItem value="21:9">21:9 (Ultra Wide)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Image Size</Label>
              <Select value={imageSize} onValueChange={setImageSize}>
                <SelectTrigger>
                  <SelectValue placeholder="Select size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1K">1K</SelectItem>
                  <SelectItem value="2K">2K</SelectItem>
                  <SelectItem value="4K">4K</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 提示词 */}
          <div className="space-y-2">
            <Label>Prompt</Label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the image you want to generate..."
              rows={3}
            />
          </div>

          {/* 预设提示词 */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Quick Presets</Label>
            <div className="flex flex-wrap gap-2">
              {IMAGE_PROMPT_PRESETS.map((preset) => (
                <Button
                  key={preset.id}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => applyPreset(preset.prompt)}
                  className="text-xs"
                >
                  {preset.nameZh}
                </Button>
              ))}
            </div>
          </div>

          {/* 生成按钮 */}
          <Button
            type="button"
            onClick={handleGenerate}
            disabled={generating || !prompt.trim()}
            className="w-full gap-2"
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating Images...
              </>
            ) : (
              <>
                <ImageIcon className="h-4 w-4" />
                Generate Images
              </>
            )}
          </Button>

          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
              {error}
            </div>
          )}

          {/* 生成结果 */}
          {generatedImages.length > 0 && (
            <div className="space-y-2">
              <Label>Generated Images (Click to select)</Label>
              <div className="grid grid-cols-4 gap-3">
                {generatedImages.map((src, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => toggleImageSelection(index)}
                    className={cn(
                      'relative aspect-square rounded-lg overflow-hidden border-2 transition-all',
                      selectedImages.has(index)
                        ? 'border-primary ring-2 ring-primary/20'
                        : 'border-transparent hover:border-muted-foreground/30'
                    )}
                  >
                    <Image
                      src={src}
                      alt={`Generated ${index + 1}`}
                      fill
                      className="object-cover"
                    />
                    {selectedImages.has(index) && (
                      <div className="absolute top-2 right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                        <Check className="h-3 w-3 text-primary-foreground" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {selectedImages.size} image(s) selected
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleClose(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleApply}
            disabled={selectedImages.size === 0}
          >
            Use Selected Images
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
