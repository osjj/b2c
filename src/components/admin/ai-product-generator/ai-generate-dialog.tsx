'use client'

import { useState, useCallback } from 'react'
import Image from 'next/image'
import { Upload, X, Loader2, Sparkles, RefreshCw, ImageIcon } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { AIImageDialog } from './ai-image-dialog'
import type { Category, Collection } from '@prisma/client'
import type {
  AIGeneratedProduct,
  PresetOptions,
  GenerateProductResponse,
} from '@/types/ai-generation'
import { GEMINI_MODELS, DEFAULT_MODEL } from '@/types/ai-generation'

interface AIGenerateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  categories: Category[]
  collections: Collection[]
  onApply: (data: AIGeneratedProduct) => void
}

export function AIGenerateDialog({
  open,
  onOpenChange,
  categories,
  collections,
  onApply,
}: AIGenerateDialogProps) {
  // 图片上传状态
  const [uploadedImages, setUploadedImages] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)

  // 预设选项
  const [categoryId, setCategoryId] = useState<string>('')
  const [selectedCollections, setSelectedCollections] = useState<string[]>([])
  const [basePrice, setBasePrice] = useState<string>('')
  const [language, setLanguage] = useState<'en' | 'zh' | 'both'>('en')
  const [model, setModel] = useState<string>(DEFAULT_MODEL)
  const [customPrompt, setCustomPrompt] = useState<string>('')

  // 生成状态
  const [generating, setGenerating] = useState(false)
  const [generatedData, setGeneratedData] = useState<AIGeneratedProduct | null>(null)
  const [error, setError] = useState<string>('')

  // 图片生成弹框
  const [imageDialogOpen, setImageDialogOpen] = useState(false)

  // 图片上传处理
  const handleImageUpload = useCallback(async (files: FileList) => {
    if (uploadedImages.length >= 5) return

    setUploading(true)
    const newImages: string[] = []

    for (const file of Array.from(files)) {
      if (uploadedImages.length + newImages.length >= 5) break

      // 转换为 Base64
      const reader = new FileReader()
      const base64 = await new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string)
        reader.readAsDataURL(file)
      })
      newImages.push(base64)
    }

    setUploadedImages((prev) => [...prev, ...newImages])
    setUploading(false)
  }, [uploadedImages.length])

  const removeImage = (index: number) => {
    setUploadedImages((prev) => prev.filter((_, i) => i !== index))
  }

  const toggleCollection = (collectionId: string) => {
    setSelectedCollections((prev) =>
      prev.includes(collectionId)
        ? prev.filter((id) => id !== collectionId)
        : [...prev, collectionId]
    )
  }

  // 生成商品信息
  const handleGenerate = async () => {
    if (uploadedImages.length === 0) {
      setError('Please upload at least one product image')
      return
    }

    setGenerating(true)
    setError('')

    try {
      const presets: PresetOptions = {
        categoryId: categoryId || undefined,
        collectionIds: selectedCollections.length > 0 ? selectedCollections : undefined,
        basePrice: basePrice ? parseFloat(basePrice) : undefined,
        language,
      }

      const categoryName = categoryId
        ? categories.find((c) => c.id === categoryId)?.name
        : undefined

      const collectionNames = selectedCollections.length > 0
        ? collections
            .filter((c) => selectedCollections.includes(c.id))
            .map((c) => c.name)
        : undefined

      const response = await fetch('/api/ai/generate-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images: uploadedImages,
          presets,
          categoryName,
          collectionNames,
          model,
          customPrompt: customPrompt.trim() || undefined,
        }),
      })

      const result: GenerateProductResponse = await response.json()

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to generate product data')
      }

      setGeneratedData(result.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate')
    } finally {
      setGenerating(false)
    }
  }

  // 应用生成的数据
  const handleApply = () => {
    if (generatedData) {
      onApply(generatedData)
    }
  }

  // 处理图片生成结果
  const handleImagesGenerated = async (images: string[]) => {
    // 上传生成的图片到服务器
    const uploadedUrls: string[] = []

    for (const imageBase64 of images) {
      try {
        // 将 Base64 转换为 Blob
        const response = await fetch(imageBase64)
        const blob = await response.blob()
        const file = new File([blob], 'generated-image.png', { type: 'image/png' })

        const formData = new FormData()
        formData.append('file', file)

        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        })

        if (uploadRes.ok) {
          const { url } = await uploadRes.json()
          uploadedUrls.push(url)
        }
      } catch (error) {
        console.error('Failed to upload generated image:', error)
      }
    }

    if (uploadedUrls.length > 0 && generatedData) {
      setGeneratedData({
        ...generatedData,
        images: uploadedUrls,
      })
    }

    setImageDialogOpen(false)
  }

  // 重置对话框
  const handleClose = (isOpen: boolean) => {
    if (!isOpen && generatedData) {
      // 有生成内容时，二次确认
      const confirmed = window.confirm(
        'You have generated content that has not been applied. Are you sure you want to close?'
      )
      if (!confirmed) return
    }

    if (!isOpen) {
      setUploadedImages([])
      setCategoryId('')
      setSelectedCollections([])
      setBasePrice('')
      setLanguage('en')
      setModel(DEFAULT_MODEL)
      setCustomPrompt('')
      setGeneratedData(null)
      setError('')
    }
    onOpenChange(isOpen)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-7xl h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              AI Product Generator
            </DialogTitle>
            <DialogDescription>
              Upload product images and let AI generate complete product information
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto pr-2">
            <div className="space-y-6 py-4">
              {/* 图片上传区域 */}
              <div className="space-y-3">
                <Label>Reference Images *</Label>
                <div className="grid grid-cols-5 gap-3">
                  {uploadedImages.map((src, index) => (
                    <div key={index} className="relative aspect-square group">
                      <Image
                        src={src}
                        alt={`Upload ${index + 1}`}
                        fill
                        className="object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}

                  {uploadedImages.length < 5 && (
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
                        onChange={(e) => e.target.files && handleImageUpload(e.target.files)}
                        disabled={uploading}
                      />
                      {uploading ? (
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      ) : (
                        <>
                          <Upload className="h-6 w-6 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground mt-1">Upload</span>
                        </>
                      )}
                    </label>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {uploadedImages.length}/5 images • Drag or click to upload
                </p>
              </div>

              {/* 预设选项 */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>AI Model</Label>
                  <Select value={model} onValueChange={setModel}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select model" />
                    </SelectTrigger>
                    <SelectContent>
                      {GEMINI_MODELS.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Category (Optional)</Label>
                  <Select value={categoryId || 'auto'} onValueChange={(v) => setCategoryId(v === 'auto' ? '' : v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Auto detect from image" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Auto detect</SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Base Price (Optional)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="AI will estimate if empty"
                    value={basePrice}
                    onChange={(e) => setBasePrice(e.target.value)}
                  />
                </div>
              </div>

              {collections.length > 0 && (
                <div className="space-y-2">
                  <Label>Collections (Optional)</Label>
                  <div className="flex flex-wrap gap-3">
                    {collections.map((collection) => (
                      <div key={collection.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`ai-collection-${collection.id}`}
                          checked={selectedCollections.includes(collection.id)}
                          onCheckedChange={() => toggleCollection(collection.id)}
                        />
                        <label
                          htmlFor={`ai-collection-${collection.id}`}
                          className="text-sm cursor-pointer"
                        >
                          {collection.name}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Output Language</Label>
                <RadioGroup
                  value={language}
                  onValueChange={(v: string) => setLanguage(v as 'en' | 'zh' | 'both')}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="en" id="lang-en" />
                    <Label htmlFor="lang-en" className="cursor-pointer">English</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="zh" id="lang-zh" />
                    <Label htmlFor="lang-zh" className="cursor-pointer">中文</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="both" id="lang-both" />
                    <Label htmlFor="lang-both" className="cursor-pointer">Both</Label>
                  </div>
                </RadioGroup>
              </div>

              {/* 自定义提示词 */}
              <div className="space-y-2">
                <Label>Custom Prompt (Optional)</Label>
                <Textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="Add your own instructions, e.g., 'This is a premium product for industrial use, emphasize durability and safety features...'"
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  Your instructions will be combined with the AI analysis
                </p>
              </div>

              {/* 生成按钮 */}
              <Button
                type="button"
                onClick={handleGenerate}
                disabled={uploadedImages.length === 0 || generating}
                className="w-full gap-2"
              >
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Generate Product Info
                  </>
                )}
              </Button>

              {error && (
                <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
                  {error}
                </div>
              )}

              {/* 生成结果预览 */}
              {generatedData && (
                <Card>
                  <CardContent className="pt-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">Generated Result</h3>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleGenerate}
                        disabled={generating}
                        className="gap-1"
                      >
                        <RefreshCw className="h-3 w-3" />
                        Regenerate
                      </Button>
                    </div>

                    <div className="grid gap-3 text-sm">
                      <div>
                        <span className="font-medium">Name: </span>
                        {generatedData.name}
                      </div>
                      <div>
                        <span className="font-medium">Description: </span>
                        {generatedData.description}
                      </div>
                      <div className="flex gap-4">
                        <div>
                          <span className="font-medium">Price: </span>
                          ${generatedData.price}
                        </div>
                        {generatedData.comparePrice && (
                          <div>
                            <span className="font-medium">Compare: </span>
                            ${generatedData.comparePrice}
                          </div>
                        )}
                        <div>
                          <span className="font-medium">SKU: </span>
                          {generatedData.sku}
                        </div>
                      </div>
                      {generatedData.priceTiers && generatedData.priceTiers.length > 0 && (
                        <div>
                          <span className="font-medium">Price Tiers: </span>
                          {generatedData.priceTiers.map((tier, i) => (
                            <span key={i} className="mr-2">
                              {tier.minQuantity}+: ${tier.price}
                            </span>
                          ))}
                        </div>
                      )}
                      <div>
                        <span className="font-medium">Specifications: </span>
                        {generatedData.specifications?.map((spec, i) => (
                          <span key={i} className="mr-2">
                            {spec.name}: {spec.value}
                            {i < generatedData.specifications!.length - 1 && ','}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* 图片预览 */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Product Images</Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setImageDialogOpen(true)}
                          className="gap-1"
                        >
                          <ImageIcon className="h-3 w-3" />
                          AI Generate Images
                        </Button>
                      </div>
                      <div className="grid grid-cols-5 gap-2">
                        {generatedData.images.map((src, index) => (
                          <div
                            key={index}
                            className="relative aspect-square bg-muted rounded-md flex items-center justify-center text-xs text-muted-foreground"
                          >
                            {src.startsWith('http') || src.startsWith('data:') ? (
                              <Image
                                src={src}
                                alt={`Product ${index + 1}`}
                                fill
                                className="object-cover rounded-md"
                              />
                            ) : (
                              <span>Placeholder</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          <DialogFooter className="flex-shrink-0 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => handleClose(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleApply}
              disabled={!generatedData}
            >
              Apply to Form
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 图片生成子弹框 */}
      <AIImageDialog
        open={imageDialogOpen}
        onOpenChange={setImageDialogOpen}
        referenceImages={uploadedImages}
        productName={generatedData?.name || ''}
        onImagesGenerated={handleImagesGenerated}
      />
    </>
  )
}
