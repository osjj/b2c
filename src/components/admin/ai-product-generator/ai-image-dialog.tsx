'use client'

import { useState, useCallback, useEffect } from 'react'
import Image from 'next/image'
import { Upload, X, Loader2, ImageIcon, Check, RotateCcw, Settings, ZoomIn } from 'lucide-react'
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
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { ImagePreviewDialog } from '../image-preview-dialog'
import {
  IMAGE_PROMPT_PRESETS,
  GEMINI_IMAGE_MODELS,
  DEFAULT_IMAGE_MODEL,
  IMAGE_ANGLE_PRESETS,
  DEFAULT_ANGLE_COMBINATION,
  NANO_BANANA_MODELS,
} from '@/types/ai-generation'
import type { GenerateImageResponse, ThirdPartyImageConfig } from '@/types/ai-generation'

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
  const [imageCount, setImageCount] = useState<number>(1)

  // 提示词
  const [prompt, setPrompt] = useState('')

  // 生成状态
  const [generating, setGenerating] = useState(false)
  const [generatedImages, setGeneratedImages] = useState<string[]>([])
  const [selectedImages, setSelectedImages] = useState<Set<number>>(new Set())
  const [error, setError] = useState('')

  // 多角度模式
  const [multiAngleMode, setMultiAngleMode] = useState(false)
  const [angleSelections, setAngleSelections] = useState<string[]>(
    [...DEFAULT_ANGLE_COMBINATION]
  )
  const [generatingProgress, setGeneratingProgress] = useState<{
    current: number
    total: number
    currentAngle: string
  } | null>(null)

  // 第三方接口配置
  const [thirdPartyConfig, setThirdPartyConfig] = useState<ThirdPartyImageConfig>({
    url: 'https://grsai.dakka.com.cn/v1/draw/nano-banana',
    apiKey: '',
    model: 'nano-banana-fast',
  })
  const [settingsOpen, setSettingsOpen] = useState(false)

  // 图片预览状态
  const [previewImage, setPreviewImage] = useState<string | null>(null)

  // 判断是否使用第三方接口
  const useThirdParty = thirdPartyConfig.url && thirdPartyConfig.apiKey

  // 标记是否已初始化（防止删除后重新初始化）
  const [initialized, setInitialized] = useState(false)

  // 弹框打开时，将父组件的参考图初始化到本地状态
  useEffect(() => {
    if (open && !initialized && referenceImages.length > 0) {
      setImages([...referenceImages])
      setInitialized(true)
    }
    // 弹框关闭时重置初始化标记
    if (!open) {
      setInitialized(false)
    }
  }, [open, referenceImages, initialized])

  // 使用本地 images 状态（已包含初始化的参考图）
  const effectiveImages = images

  // 将 URL 转换为 base64 (通过后端 API 代理避免 CORS 问题)
  const urlToBase64 = async (url: string): Promise<string> => {
    // 如果已经是 base64，直接返回
    if (url.startsWith('data:')) {
      return url
    }

    try {
      const response = await fetch('/api/image-to-base64', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })

      const result = await response.json()
      if (result.success && result.base64) {
        return result.base64
      }
      console.error('Failed to convert image:', result.error)
      return ''
    } catch (error) {
      console.error('Failed to convert URL to base64:', error)
      return ''
    }
  }

  // 图片上传
  const handleImageUpload = useCallback(async (files: FileList) => {
    if (images.length >= 10) return

    setUploading(true)
    const newImages: string[] = []

    for (const file of Array.from(files)) {
      if (images.length + newImages.length >= 10) break

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

  // 更新角度选择
  const updateAngleSelection = (index: number, angleId: string) => {
    setAngleSelections((prev) => {
      const newSelections = [...prev]
      newSelections[index] = angleId
      return newSelections
    })
  }

  // 重置为默认角度
  const resetToDefaultAngles = () => {
    setAngleSelections([...DEFAULT_ANGLE_COMBINATION])
  }

  // 获取角度的中文名称
  const getAngleName = (angleId: string) => {
    const angle = IMAGE_ANGLE_PRESETS.find((a) => a.id === angleId)
    return angle?.nameZh || angleId
  }

  // 构建最终的图片生成 prompt
  // 顺序：productName + anglePrompt + userPrompt
  const buildFinalPrompt = (userPrompt: string, anglePrompt?: string) => {
    const parts: string[] = []

    // 1. 产品名称
    if (productName) {
      parts.push(`Product: ${productName}`)
    }

    // 2. 角度描述
    if (anglePrompt) {
      parts.push(anglePrompt)
    }

    // 3. 用户自定义 prompt（包含预设内容，如白底图的完整 prompt）
    if (userPrompt.trim()) {
      parts.push(userPrompt.trim())
    }

    return parts.join('. ')
  }

  // 使用第三方接口生成单张图片
  const generateWithThirdParty = async (
    finalPrompt: string,
    referenceUrls: string[]
  ): Promise<string[]> => {
    const response = await fetch('/api/ai/generate-image-third-party', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: thirdPartyConfig.url,
        apiKey: thirdPartyConfig.apiKey,
        model: thirdPartyConfig.model,
        prompt: finalPrompt,
        aspectRatio: aspectRatio === '1:1' ? 'auto' : aspectRatio,
        imageSize: '1K',
        referenceImages: referenceUrls,
      }),
    })

    const result: GenerateImageResponse = await response.json()

    if (!result.success || !result.images) {
      throw new Error(result.error || 'Third-party generation failed')
    }

    return result.images
  }

  // 生成图片
  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt')
      return
    }

    setGenerating(true)
    setError('')

    try {
      // 将所有图片转换为 base64 格式
      const base64Images = await Promise.all(
        effectiveImages.map((img) => urlToBase64(img))
      )
      const validImages = base64Images.filter((img) => img.length > 0)

      if (multiAngleMode) {
        // 多角度模式：分别为每个角度生成图片
        const allGeneratedImages: string[] = []
        const totalAngles = angleSelections.length

        for (let i = 0; i < totalAngles; i++) {
          const angleId = angleSelections[i]
          const anglePreset = IMAGE_ANGLE_PRESETS.find((a) => a.id === angleId)
          if (!anglePreset) continue

          setGeneratingProgress({
            current: i + 1,
            total: totalAngles,
            currentAngle: anglePreset.nameZh,
          })

          // 使用 buildFinalPrompt 构建完整提示词
          const finalPrompt = buildFinalPrompt(prompt, anglePreset.prompt)

          let images: string[] = []

          if (useThirdParty) {
            // 使用第三方接口
            images = await generateWithThirdParty(finalPrompt, validImages)
          } else {
            // 使用 Gemini 接口
            const response = await fetch('/api/ai/generate-image', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                referenceImages: validImages,
                prompt: finalPrompt,
                count: 1,
                model,
                aspectRatio,
              }),
            })

            const result: GenerateImageResponse = await response.json()
            if (result.success && result.images) {
              images = result.images
            }
          }

          if (images.length > 0) {
            allGeneratedImages.push(images[0])
          }
        }

        setGeneratingProgress(null)

        if (allGeneratedImages.length === 0) {
          throw new Error('Failed to generate any images')
        }

        // 将新生成的图片添加到已有图片前面
        setGeneratedImages((prev) => [...allGeneratedImages, ...prev])
        // 更新选中状态：选中新生成的图片
        setSelectedImages((prev) => {
          const newCount = allGeneratedImages.length
          const shiftedPrev = new Set(Array.from(prev).map((i) => i + newCount))
          const newSelected = new Set(allGeneratedImages.map((_, i) => i))
          return new Set([...newSelected, ...shiftedPrev])
        })
      } else {
        // 普通模式：一次生成多张
        const finalPrompt = buildFinalPrompt(prompt)

        let generatedImagesResult: string[] = []

        if (useThirdParty) {
          // 使用第三方接口（第三方一次只生成1张，需要循环）
          for (let i = 0; i < imageCount; i++) {
            setGeneratingProgress({
              current: i + 1,
              total: imageCount,
              currentAngle: `图片 ${i + 1}`,
            })
            const images = await generateWithThirdParty(finalPrompt, validImages)
            if (images.length > 0) {
              generatedImagesResult.push(images[0])
            }
          }
          setGeneratingProgress(null)
        } else {
          // 使用 Gemini 接口
          const response = await fetch('/api/ai/generate-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              referenceImages: validImages,
              prompt: finalPrompt,
              count: imageCount,
              model,
              aspectRatio,
            }),
          })

          const result: GenerateImageResponse = await response.json()

          if (!result.success || !result.images) {
            throw new Error(result.error || 'Failed to generate images')
          }

          generatedImagesResult = result.images
        }

        if (generatedImagesResult.length === 0) {
          throw new Error('Failed to generate any images')
        }

        // 将新生成的图片添加到已有图片前面
        setGeneratedImages((prev) => [...generatedImagesResult, ...prev])
        // 更新选中状态：选中新生成的图片
        setSelectedImages((prev) => {
          const newCount = generatedImagesResult.length
          const shiftedPrev = new Set(Array.from(prev).map((i) => i + newCount))
          const newSelected = new Set(generatedImagesResult.map((_, i) => i))
          return new Set([...newSelected, ...shiftedPrev])
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate images')
      setGeneratingProgress(null)
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
      setImageCount(1)
      setPrompt('')
      setGeneratedImages([])
      setSelectedImages(new Set())
      setError('')
      setMultiAngleMode(false)
      setAngleSelections([...DEFAULT_ANGLE_COMBINATION])
      setGeneratingProgress(null)
    }
    onOpenChange(isOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex flex-row items-start justify-between flex-shrink-0">
          <div>
            <DialogTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              AI Image Generator
              {useThirdParty && (
                <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                  第三方
                </span>
              )}
            </DialogTitle>
            <DialogDescription>
              Generate product images using AI based on reference images and prompt
            </DialogDescription>
          </div>

          {/* 设置按钮 */}
          <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  'h-8 w-8',
                  useThirdParty && 'text-green-600'
                )}
              >
                <Settings className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>第三方接口配置</SheetTitle>
                <SheetDescription>
                  配置后将使用第三方接口生成图片，清空 API Key 可恢复使用 Gemini
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>API URL</Label>
                  <Input
                    value={thirdPartyConfig.url}
                    onChange={(e) =>
                      setThirdPartyConfig((prev) => ({
                        ...prev,
                        url: e.target.value,
                      }))
                    }
                    placeholder="https://..."
                  />
                </div>

                <div className="space-y-2">
                  <Label>API Key</Label>
                  <Input
                    type="password"
                    value={thirdPartyConfig.apiKey}
                    onChange={(e) =>
                      setThirdPartyConfig((prev) => ({
                        ...prev,
                        apiKey: e.target.value,
                      }))
                    }
                    placeholder="输入 API Key 以启用第三方接口"
                  />
                </div>

                <div className="space-y-2">
                  <Label>模型</Label>
                  <Select
                    value={thirdPartyConfig.model}
                    onValueChange={(v) =>
                      setThirdPartyConfig((prev) => ({
                        ...prev,
                        model: v,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {NANO_BANANA_MODELS.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="pt-4 flex justify-between items-center border-t">
                  <span className="text-sm text-muted-foreground">
                    状态：{useThirdParty ? '已启用第三方接口' : '使用 Gemini（默认）'}
                  </span>
                  {useThirdParty && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setThirdPartyConfig((prev) => ({
                          ...prev,
                          apiKey: '',
                        }))
                      }
                    >
                      清除配置
                    </Button>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </DialogHeader>

        <div className="space-y-4 py-4 overflow-y-auto flex-1">
          {/* 参考图片 */}
          <div className="space-y-2">
            <Label>Reference Images (Max 10)</Label>
            <div className="flex flex-wrap gap-2">
              {effectiveImages.slice(0, 10).map((src, index) => (
                <div key={index} className="relative w-20 h-20 group">
                  <Image
                    src={src}
                    alt={`Reference ${index + 1}`}
                    fill
                    className="object-cover rounded-md cursor-pointer"
                    onClick={() => setPreviewImage(src)}
                  />
                  {/* 放大按钮 */}
                  <button
                    type="button"
                    onClick={() => setPreviewImage(src)}
                    className="absolute top-1 left-1 p-0.5 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    title="查看大图"
                  >
                    <ZoomIn className="h-3 w-3" />
                  </button>
                  {/* 删除按钮 */}
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute -top-1 -right-1 p-0.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}

              {effectiveImages.length < 10 && (
                <label
                  className={cn(
                    'w-20 h-20 border-2 border-dashed rounded-md flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors',
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
              <Label>Image Count</Label>
              <Select
                value={String(imageCount)}
                onValueChange={(v) => setImageCount(Number(v))}
                disabled={multiAngleMode}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Count" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1</SelectItem>
                  <SelectItem value="2">2</SelectItem>
                  <SelectItem value="3">3</SelectItem>
                  <SelectItem value="4">4</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 多角度模式 */}
          <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch
                  id="multi-angle-mode"
                  checked={multiAngleMode}
                  onCheckedChange={setMultiAngleMode}
                />
                <Label htmlFor="multi-angle-mode" className="cursor-pointer">
                  多角度模式
                </Label>
                <span className="text-xs text-muted-foreground">
                  (自动生成4张不同角度的图片)
                </span>
              </div>
              {multiAngleMode && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={resetToDefaultAngles}
                  className="h-7 text-xs gap-1"
                >
                  <RotateCcw className="h-3 w-3" />
                  重置默认
                </Button>
              )}
            </div>

            {multiAngleMode && (
              <div className="grid grid-cols-4 gap-3">
                {angleSelections.map((angleId, index) => (
                  <div key={index} className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      图片 {index + 1}
                    </Label>
                    <Select
                      value={angleId}
                      onValueChange={(v) => updateAngleSelection(index, v)}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {IMAGE_ANGLE_PRESETS.map((angle) => (
                          <SelectItem key={angle.id} value={angle.id}>
                            {angle.nameZh}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            )}
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
                {generatingProgress
                  ? `生成中 (${generatingProgress.current}/${generatingProgress.total}) - ${generatingProgress.currentAngle}...`
                  : 'Generating Images...'}
              </>
            ) : (
              <>
                <ImageIcon className="h-4 w-4" />
                {multiAngleMode ? '生成4张多角度图片' : 'Generate Images'}
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
                      'relative aspect-square rounded-lg overflow-hidden border-2 transition-all group',
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
                    {/* 放大按钮 */}
                    <div
                      onClick={(e) => {
                        e.stopPropagation()
                        setPreviewImage(src)
                      }}
                      className="absolute top-2 left-2 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:bg-black/70"
                      title="查看大图"
                    >
                      <ZoomIn className="h-3 w-3" />
                    </div>
                    {/* 选中标记 */}
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

        <DialogFooter className="flex-shrink-0">
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

      {/* 图片预览弹框 */}
      <ImagePreviewDialog
        open={!!previewImage}
        onOpenChange={(open) => !open && setPreviewImage(null)}
        src={previewImage || ''}
        alt="图片预览"
      />
    </Dialog>
  )
}
