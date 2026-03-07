'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'

const PRESET_PROMPTS = [
  {
    label: '把图片文本全改成英文',
    value:
      'Change all text in the image to English, regenerate the image, keep all other visual elements unchanged',
  },
  {
    label: '删除图片 Logo',
    value:
      'Remove the logo from the image, regenerate the image, keep all other visual elements unchanged',
  },
]

interface CollectImageAIDialogProps {
  open: boolean
  onClose: () => void
  /** All image URLs in this section */
  images: string[]
  /** Currently selected image URLs in parent */
  selectedImages: Set<string>
  /** Called when generation completes; parent updates its state */
  onImagesUpdate: (newImages: string[], newSelected: Set<string>) => void
}

export function CollectImageAIDialog({
  open,
  onClose,
  images,
  selectedImages,
  onImagesUpdate,
}: CollectImageAIDialogProps) {
  // Only show images that are currently selected in parent
  const availableImages = images.filter((url) => selectedImages.has(url))

  const [refSelected, setRefSelected] = useState<Set<string>>(new Set())
  const [prompt, setPrompt] = useState('')
  const [generating, setGenerating] = useState(false)
  const [generatingSet, setGeneratingSet] = useState<Set<string>>(new Set())

  // Default: select all available images as references when dialog opens
  useEffect(() => {
    if (open) {
      setRefSelected(new Set(availableImages))
      setPrompt('')
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  function toggleRef(url: string) {
    const next = new Set(refSelected)
    if (next.has(url)) next.delete(url)
    else next.add(url)
    setRefSelected(next)
  }

  async function generateSingleImage(sourceUrl: string | null): Promise<string | null> {
    const body: Record<string, unknown> = {
      url: process.env.NEXT_PUBLIC_THIRD_PARTY_IMAGE_URL,
      apiKey: process.env.NEXT_PUBLIC_THIRD_PARTY_IMAGE_API_KEY,
      model: process.env.NEXT_PUBLIC_THIRD_PARTY_IMAGE_MODEL,
      prompt,
    }
    if (sourceUrl) {
      body.referenceImages = [sourceUrl]
    }

    const res = await fetch('/api/ai/generate-image-third-party', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const json = await res.json()
    if (!res.ok || !json.success || !json.images?.[0]) {
      throw new Error(json.error || 'Generation failed')
    }
    return json.images[0] as string
  }

  async function handleGenerate() {
    if (!prompt.trim()) {
      toast.error('请输入提示词')
      return
    }

    setGenerating(true)

    const refUrls = Array.from(refSelected)

    if (refUrls.length === 0) {
      // Pure text generation — append one new image
      try {
        const newUrl = await generateSingleImage(null)
        if (newUrl) {
          const newImages = [...images, newUrl]
          const newSelected = new Set(selectedImages)
          newSelected.add(newUrl)
          onImagesUpdate(newImages, newSelected)
          toast.success('图片生成成功')
          onClose()
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : '生成失败')
      } finally {
        setGenerating(false)
      }
      return
    }

    // Generate per reference image — replace in-place
    setGeneratingSet(new Set(refUrls))

    const replacements = new Map<string, string>()
    const newSelected = new Set(selectedImages)
    let failCount = 0

    await Promise.all(
      refUrls.map(async (srcUrl) => {
        try {
          const newUrl = await generateSingleImage(srcUrl)
          if (newUrl) {
            replacements.set(srcUrl, newUrl)
            newSelected.delete(srcUrl)
            newSelected.add(newUrl)
          }
        } catch (e) {
          console.error('Image generation failed for', srcUrl, e)
          failCount++
        } finally {
          setGeneratingSet((prev) => {
            const next = new Set(prev)
            next.delete(srcUrl)
            return next
          })
        }
      })
    )

    const successCount = replacements.size
    setGenerating(false)

    if (successCount > 0) {
      const newImages = images.map((url) => replacements.get(url) ?? url)
      onImagesUpdate(newImages, newSelected)
    }

    if (failCount === 0) {
      toast.success(`${successCount} 张图片生成成功`)
      onClose()
    } else {
      toast.warning(`${successCount} 张成功，${failCount} 张失败`)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>AI 图片生成</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-2">
          {/* Reference image grid */}
          <div>
            <p className="text-sm font-medium mb-2">
              选择参考图（已选 {refSelected.size}/{availableImages.length}，不选则纯文本生成）
            </p>
            {availableImages.length === 0 ? (
              <p className="text-sm text-muted-foreground">暂无可选图片（请先在主界面勾选图片）</p>
            ) : (
              <div className="grid grid-cols-5 gap-2">
                {availableImages.map((url, i) => {
                  const isRef = refSelected.has(url)
                  const isGenerating = generatingSet.has(url)
                  return (
                    <div
                      key={url}
                      className="relative cursor-pointer"
                      onClick={() => !generating && toggleRef(url)}
                    >
                      <img
                        src={url}
                        alt={`图片 ${i + 1}`}
                        className={`w-full aspect-square object-cover rounded border-2 transition-all ${
                          isRef ? 'border-primary' : 'border-transparent opacity-40'
                        }`}
                      />
                      {isGenerating && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded">
                          <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        </div>
                      )}
                      <div
                        className={`absolute top-1 right-1 w-5 h-5 rounded-full border-2 flex items-center justify-center text-xs font-bold ${
                          isRef ? 'bg-primary border-primary text-white' : 'bg-white border-gray-300'
                        }`}
                      >
                        {isRef && '✓'}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Prompt input */}
          <div>
            <p className="text-sm font-medium mb-2">提示词</p>
            <Textarea
              placeholder="描述你想要的图片效果..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              disabled={generating}
            />
          </div>

          {/* Preset prompts */}
          <div>
            <p className="text-sm font-medium mb-2">预置 Prompt</p>
            <div className="flex flex-wrap gap-2">
              {PRESET_PROMPTS.map((p) => (
                <Button
                  key={p.label}
                  variant="outline"
                  size="sm"
                  disabled={generating}
                  onClick={() => setPrompt(p.value)}
                >
                  {p.label}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button variant="outline" onClick={onClose} disabled={generating}>
            取消
          </Button>
          <Button onClick={handleGenerate} disabled={generating || !prompt.trim()}>
            {generating ? '生成中...' : '开始生成'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}