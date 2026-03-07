# Collect Page AI Optimize Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add AI text optimization (OpenAI) and AI image generation (third-party) to the product collect page at `/admin/products/collect`.

**Architecture:** Three changes — a new API route for text optimization, a new image AI dialog component, and modifications to the existing collect form to wire them together. Text optimization uses server-side OpenAI via existing `generateText`. Image generation uses the existing `/api/ai/generate-image-third-party` route with `NEXT_PUBLIC_*` env vars.

**Tech Stack:** Next.js 15 App Router, TypeScript, Tailwind CSS, shadcn/ui Dialog, existing `generateText` from `@/lib/openai`, existing `/api/ai/generate-image-third-party`

---

## Context

- Design doc: `docs/plans/2026-03-07-collect-ai-optimize-design.md`
- Main form: `src/components/admin/product-collect-form.tsx` (400 lines)
- Types: `src/lib/scraper/types.ts` — `ScrapedProduct` has `name`, `description`, `specifications: Record<string,string>`, `mainImages: string[]`, `detailImages: string[]`
- Text generation: `src/lib/openai.ts` → `generateText(prompt, images?, options?)`
- Image generation route: `src/app/api/ai/generate-image-third-party/route.ts` — accepts `{ url, apiKey, model, prompt, referenceImages? }`
- Env vars for image: `NEXT_PUBLIC_THIRD_PARTY_IMAGE_URL`, `NEXT_PUBLIC_THIRD_PARTY_IMAGE_API_KEY`, `NEXT_PUBLIC_THIRD_PARTY_IMAGE_MODEL`

---

## Task 1: Text Optimization API Route

**Files:**
- Create: `src/app/api/ai/optimize-collect-text/route.ts`

### Step 1: Create the route file

```typescript
// src/app/api/ai/optimize-collect-text/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { generateText, parseJSONResponse } from '@/lib/openai'

interface OptimizeRequest {
  name: string
  description: string
  specifications: Record<string, string>
}

interface OptimizeResponse {
  success: boolean
  name?: string
  description?: string
  specifications?: Record<string, string>
  error?: string
}

function buildOptimizePrompt(data: OptimizeRequest): string {
  const specsText = Object.entries(data.specifications)
    .map(([k, v]) => `  "${k}": "${v}"`)
    .join('\n')

  return `You are a professional B2B e-commerce copywriter. Translate and rewrite the following product information into professional English suitable for an international B2B/B2C e-commerce platform.

Rules:
1. Translate all Chinese text to English
2. Keep technical specifications accurate — do not invent data
3. Product name: concise, descriptive, include key features (max 80 chars)
4. Description: 1-2 professional sentences highlighting key benefits
5. Specification keys and values: use standard English technical terminology
6. Return ONLY valid JSON, no markdown

Input:
{
  "name": "${data.name}",
  "description": "${data.description}",
  "specifications": {
${specsText}
  }
}

Output format:
{
  "name": "...",
  "description": "...",
  "specifications": { "Key": "Value", ... }
}`
}

export async function POST(request: NextRequest) {
  try {
    const body: OptimizeRequest = await request.json()

    if (!body.name) {
      return NextResponse.json<OptimizeResponse>(
        { success: false, error: 'name is required' },
        { status: 400 }
      )
    }

    const prompt = buildOptimizePrompt(body)
    const result = await generateText(prompt, undefined, {
      temperature: 0.4,
      maxTokens: 2048,
    })

    if (!result.success || !result.text) {
      return NextResponse.json<OptimizeResponse>(
        { success: false, error: result.error || 'Failed to optimize text' },
        { status: 500 }
      )
    }

    const parsed = parseJSONResponse<{ name: string; description: string; specifications: Record<string, string> }>(result.text)

    if (!parsed) {
      return NextResponse.json<OptimizeResponse>(
        { success: false, error: 'Failed to parse AI response' },
        { status: 500 }
      )
    }

    return NextResponse.json<OptimizeResponse>({
      success: true,
      name: parsed.name,
      description: parsed.description,
      specifications: parsed.specifications,
    })
  } catch (error) {
    return NextResponse.json<OptimizeResponse>(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
```

### Step 2: Manual smoke test

Start dev server and run:
```bash
curl -X POST http://localhost:3000/api/ai/optimize-collect-text \
  -H "Content-Type: application/json" \
  -d '{"name":"安全帽","description":"高强度ABS材质","specifications":{"颜色":"黄色","重量":"350g"}}'
```
Expected: `{ "success": true, "name": "...", "description": "...", "specifications": {...} }`

### Step 3: Commit

```bash
git add src/app/api/ai/optimize-collect-text/route.ts
git commit -m "feat: add optimize-collect-text API route"
```

---

## Task 2: Image AI Generate Dialog Component

**Files:**
- Create: `src/components/admin/collect-image-ai-dialog.tsx`

### Step 1: Create the component file

```typescript
// src/components/admin/collect-image-ai-dialog.tsx
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

    const newImages = [...images]
    const newSelected = new Set(selectedImages)
    let successCount = 0
    let failCount = 0

    await Promise.all(
      refUrls.map(async (srcUrl) => {
        try {
          const newUrl = await generateSingleImage(srcUrl)
          if (newUrl) {
            const idx = newImages.indexOf(srcUrl)
            if (idx !== -1) newImages[idx] = newUrl
            newSelected.delete(srcUrl)
            newSelected.add(newUrl)
            successCount++
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

    onImagesUpdate(newImages, newSelected)
    setGenerating(false)

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
                      key={i}
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
```

### Step 2: Verify the component compiles

```bash
cd d:/project/b2c-store && npx tsc --noEmit 2>&1 | head -30
```
Expected: no errors referencing `collect-image-ai-dialog.tsx`

### Step 3: Commit

```bash
git add src/components/admin/collect-image-ai-dialog.tsx
git commit -m "feat: add CollectImageAIDialog component"
```

---

## Task 3: Wire AI Features into the Collect Form

**Files:**
- Modify: `src/components/admin/product-collect-form.tsx`

### Step 1: Add imports at the top

After the existing imports, add:
```typescript
import { CollectImageAIDialog } from '@/components/admin/collect-image-ai-dialog'
```

### Step 2: Add new state variables

Inside `ProductCollectForm()`, after the existing state declarations (after `setExistingId`), add:
```typescript
// Text optimization
const [optimizingText, setOptimizingText] = useState(false)

// Image AI dialog
const [imageAIDialog, setImageAIDialog] = useState<{
  open: boolean
  section: 'main' | 'detail'
}>({ open: false, section: 'main' })
```

### Step 3: Add handleOptimizeText function

After the `handleSave` function, add:
```typescript
async function handleOptimizeText() {
  if (!data) return
  setOptimizingText(true)
  try {
    const res = await fetch('/api/ai/optimize-collect-text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: data.name,
        description: data.description,
        specifications: data.specifications,
      }),
    })
    const json = await res.json()
    if (!res.ok || !json.success) {
      toast.error(json.error || 'AI 优化失败')
      return
    }
    setData({
      ...data,
      name: json.name ?? data.name,
      description: json.description ?? data.description,
      specifications: json.specifications ?? data.specifications,
    })
    toast.success('文本 AI 优化完成')
  } catch {
    toast.error('网络错误，请重试')
  } finally {
    setOptimizingText(false)
  }
}
```

### Step 4: Add handleImagesUpdate function

After `handleOptimizeText`, add:
```typescript
function handleImagesUpdate(
  section: 'main' | 'detail',
  newImages: string[],
  newSelected: Set<string>
) {
  if (!data) return
  if (section === 'main') {
    setData({ ...data, mainImages: newImages })
    setSelectedMain(newSelected)
  } else {
    setData({ ...data, detailImages: newImages })
    setSelectedDetail(newSelected)
  }
}
```

### Step 5: Update the 基本信息 Card header

Find the line:
```tsx
<h2 className="text-lg font-semibold">基本信息</h2>
```

Replace with:
```tsx
<div className="flex items-center justify-between">
  <h2 className="text-lg font-semibold">基本信息</h2>
  <Button
    variant="outline"
    size="sm"
    onClick={handleOptimizeText}
    disabled={optimizingText || isSaving}
  >
    {optimizingText ? 'AI 优化中...' : 'AI 优化文本'}
  </Button>
</div>
```

### Step 6: Update the 主图 Card header

Find the line:
```tsx
<h2 className="text-lg font-semibold">
  主图（已选 {selectedMain.size}/{data.mainImages.length} 张）
</h2>
```

Replace with:
```tsx
<h2 className="text-lg font-semibold">
  主图（已选 {selectedMain.size}/{data.mainImages.length} 张）
</h2>
<Button
  variant="outline"
  size="sm"
  onClick={() => setImageAIDialog({ open: true, section: 'main' })}
  disabled={isSaving}
>
  AI 生成
</Button>
```

Note: the parent `<div>` already has `className="flex items-center justify-between"` — the existing `全选` button and the new `AI 生成` button should both sit in a flex-row. Update that div to:
```tsx
<div className="flex items-center justify-between">
  <h2 className="text-lg font-semibold">
    主图（已选 {selectedMain.size}/{data.mainImages.length} 张）
  </h2>
  <div className="flex gap-2">
    <Button
      variant="outline"
      size="sm"
      onClick={() => setImageAIDialog({ open: true, section: 'main' })}
      disabled={isSaving}
    >
      AI 生成
    </Button>
    <Button
      variant="outline"
      size="sm"
      onClick={() => toggleAll(data.mainImages, selectedMain, setSelectedMain)}
    >
      {selectedMain.size === data.mainImages.length ? '取消全选' : '全选'}
    </Button>
  </div>
</div>
```

### Step 7: Update the 详情图 Card header

Same pattern — find the 详情图 `flex items-center justify-between` div and update to:
```tsx
<div className="flex items-center justify-between">
  <h2 className="text-lg font-semibold">
    详情图（已选 {selectedDetail.size}/{data.detailImages.length} 张）
  </h2>
  <div className="flex gap-2">
    <Button
      variant="outline"
      size="sm"
      onClick={() => setImageAIDialog({ open: true, section: 'detail' })}
      disabled={isSaving}
    >
      AI 生成
    </Button>
    <Button
      variant="outline"
      size="sm"
      onClick={() => toggleAll(data.detailImages, selectedDetail, setSelectedDetail)}
    >
      {selectedDetail.size === data.detailImages.length ? '取消全选' : '全选'}
    </Button>
  </div>
</div>
```

### Step 8: Add the dialog at the bottom of JSX

Just before the closing `</div>` of the return statement (after `{status === 'previewing' && data && (...)}`), add:
```tsx
{/* Image AI Dialog */}
{data && (
  <CollectImageAIDialog
    open={imageAIDialog.open}
    onClose={() => setImageAIDialog((prev) => ({ ...prev, open: false }))}
    images={imageAIDialog.section === 'main' ? data.mainImages : data.detailImages}
    selectedImages={imageAIDialog.section === 'main' ? selectedMain : selectedDetail}
    onImagesUpdate={(newImgs, newSel) =>
      handleImagesUpdate(imageAIDialog.section, newImgs, newSel)
    }
  />
)}
```

### Step 9: TypeScript check

```bash
cd d:/project/b2c-store && npx tsc --noEmit 2>&1 | head -40
```
Expected: zero errors

### Step 10: Commit

```bash
git add src/components/admin/product-collect-form.tsx
git commit -m "feat: wire AI text optimization and image generation into collect form"
```

---

## Task 4: Manual Integration Test

### Step 1: Run dev server

```bash
npm run dev
```

### Step 2: Test text optimization

1. Navigate to `http://localhost:3000/admin/products/collect`
2. Scrape a 1688 product URL
3. After preview loads, click **AI 优化文本** in the 基本信息 card
4. Verify: button shows loading, then name/description/specifications update to English

### Step 3: Test image AI dialog — with reference images

1. In the 主图 section, ensure at least 1 image is selected
2. Click **AI 生成**
3. Dialog opens showing selected images
4. Select 1 reference image, type a prompt or click a preset
5. Click **开始生成**
6. Verify: spinner on that image, then it gets replaced with the generated image
7. Dialog closes, new image visible in the grid

### Step 4: Test image AI dialog — pure text generation

1. Open AI 生成 dialog again
2. Deselect all reference images
3. Enter a prompt, click **开始生成**
4. Verify: new image appended to the list

### Step 5: Final commit if any fixes needed

```bash
git add -A
git commit -m "fix: address any issues found during manual testing"
```

---

## Summary of New Files

| File | Purpose |
|------|---------|
| `src/app/api/ai/optimize-collect-text/route.ts` | Text optimization API: translates+rewrites to English via OpenAI |
| `src/components/admin/collect-image-ai-dialog.tsx` | Image AI generation dialog with reference image selection |

## Modified Files

| File | Changes |
|------|---------|
| `src/components/admin/product-collect-form.tsx` | +2 state vars, +2 handlers, +3 button placements, +1 dialog mount |
