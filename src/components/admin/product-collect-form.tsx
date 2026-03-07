'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { toast } from 'sonner'
import {
  saveCollectedProduct,
  updateCollectedProduct,
} from '@/actions/collect'
import type { ScrapedProduct } from '@/lib/scraper/types'
import { CollectImageAIDialog } from '@/components/admin/collect-image-ai-dialog'

type CollectStatus = 'idle' | 'scraping' | 'previewing' | 'saving'

export function ProductCollectForm() {
  const router = useRouter()
  const [url, setUrl] = useState('')
  const [status, setStatus] = useState<CollectStatus>('idle')
  const [data, setData] = useState<ScrapedProduct | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])
  const [duration, setDuration] = useState(0)
  const [existingId, setExistingId] = useState<string | null>(null)

  // Text optimization
  const [optimizingText, setOptimizingText] = useState(false)

  // Image AI dialog
  const [imageAIDialog, setImageAIDialog] = useState<{
    open: boolean
    section: 'main' | 'detail'
  }>({ open: false, section: 'main' })

  // 图片选择：存储已选中的 URL 集合，默认全选
  const [selectedMain, setSelectedMain] = useState<Set<string>>(new Set())
  const [selectedDetail, setSelectedDetail] = useState<Set<string>>(new Set())

  function toggleImage(set: Set<string>, url: string, setter: (s: Set<string>) => void) {
    const next = new Set(set)
    if (next.has(url)) next.delete(url)
    else next.add(url)
    setter(next)
  }

  function toggleAll(urls: string[], set: Set<string>, setter: (s: Set<string>) => void) {
    setter(set.size === urls.length ? new Set() : new Set(urls))
  }

  async function handleScrape() {
    if (!url.trim()) {
      toast.error('请输入 1688 商品链接')
      return
    }

    setStatus('scraping')
    setData(null)
    setWarnings([])
    setExistingId(null)

    try {
      const res = await fetch('/api/admin/products/scrape-1688', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      })

      const json = await res.json()

      if (!res.ok) {
        toast.error(json.error || '采集失败')
        setStatus('idle')
        return
      }

      setData(json.data)
      setWarnings(json.warnings || [])
      setDuration(json.duration)
      // 默认全选所有图片
      setSelectedMain(new Set(json.data.mainImages))
      setSelectedDetail(new Set(json.data.detailImages))
      setStatus('previewing')
      toast.success(`采集成功，耗时 ${(json.duration / 1000).toFixed(1)}s`)
    } catch {
      toast.error('网络错误，请重试')
      setStatus('idle')
    }
  }

  async function handleSave() {
    if (!data) return
    setStatus('saving')

    // 只保存已选中的图片
    const saveData: ScrapedProduct = {
      ...data,
      mainImages: data.mainImages.filter((u) => selectedMain.has(u)),
      detailImages: data.detailImages.filter((u) => selectedDetail.has(u)),
    }

    try {
      const result = existingId
        ? await updateCollectedProduct(existingId, saveData)
        : await saveCollectedProduct(saveData)

      const r = result as Record<string, unknown>
      if (!result.success) {
        if ('existingId' in r && typeof r.existingId === 'string') {
          setExistingId(r.existingId)
          toast.error('该商品已采集过，点击"更新商品"可覆盖更新')
          setStatus('previewing')
          return
        }
        toast.error(typeof r.error === 'string' ? r.error : '保存失败')
        setStatus('previewing')
        return
      }

      toast.success('商品保存成功')
      router.push(`/admin/products/${result.productId}`)
    } catch {
      toast.error('保存失败，请重试')
      setStatus('previewing')
    }
  }

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

  const isSaving = status === 'saving'

  return (
    <div className="space-y-6">
      {/* 输入区 */}
      <Card className="p-6">
        <div className="flex gap-3">
          <Input
            placeholder="粘贴 1688 商品链接，如 https://detail.1688.com/offer/xxx.html"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={status === 'scraping' || status === 'saving'}
            onKeyDown={(e) => e.key === 'Enter' && handleScrape()}
          />
          <Button
            onClick={handleScrape}
            disabled={status === 'scraping' || status === 'saving'}
          >
            {status === 'scraping' ? '采集中...' : '采集'}
          </Button>
        </div>
      </Card>

      {/* 采集中提示 */}
      {status === 'scraping' && (
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span>正在采集商品数据，请稍候（约 30-60 秒）...</span>
          </div>
        </Card>
      )}

      {/* 预览区 */}
      {status === 'previewing' && data && (
        <>
          {/* 警告信息 */}
          {warnings.length > 0 && (
            <Card className="border-yellow-200 bg-yellow-50 p-4">
              <p className="font-medium text-yellow-800 mb-2">采集警告：</p>
              <ul className="list-disc list-inside text-sm text-yellow-700">
                {warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </Card>
          )}

          {/* 基本信息 */}
          <Card className="p-6 space-y-4">
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
            <div className="space-y-3">
              <div>
                <label className="text-sm text-muted-foreground">商品标题</label>
                <Input
                  value={data.name}
                  onChange={(e) => setData({ ...data, name: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">商品描述</label>
                <Input
                  value={data.description}
                  onChange={(e) => setData({ ...data, description: e.target.value })}
                />
              </div>
              <div className="flex gap-4">
                <div>
                  <label className="text-sm text-muted-foreground">价格</label>
                  <Input
                    type="number"
                    value={data.price}
                    onChange={(e) =>
                      setData({ ...data, price: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>
                {data.comparePrice && (
                  <div>
                    <label className="text-sm text-muted-foreground">原价</label>
                    <Input type="number" value={data.comparePrice} disabled />
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* 阶梯价 */}
          {data.priceTiers.length > 0 && (
            <Card className="p-6 space-y-4">
              <h2 className="text-lg font-semibold">
                阶梯价（{data.priceTiers.length} 档）
              </h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">起订量</th>
                    <th className="text-left py-2">上限</th>
                    <th className="text-left py-2">单价</th>
                  </tr>
                </thead>
                <tbody>
                  {data.priceTiers.map((tier, i) => (
                    <tr key={i} className="border-b">
                      <td className="py-2">{tier.minQuantity}</td>
                      <td className="py-2">{tier.maxQuantity ?? '不限'}</td>
                      <td className="py-2">¥{tier.price}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}

          {/* SKU 变体 */}
          {data.variants.length > 0 && (
            <Card className="p-6 space-y-4">
              <h2 className="text-lg font-semibold">
                SKU 变体（{data.variants.length} 组）
              </h2>
              {data.variants.map((v, i) => (
                <div key={i}>
                  <p className="font-medium mb-2">{v.name}</p>
                  <div className="flex flex-wrap gap-2">
                    {v.options.map((opt, j) => (
                      <div
                        key={j}
                        className="flex items-center gap-2 border rounded px-3 py-1.5 text-sm"
                      >
                        {opt.imageUrl && (
                          <img
                            src={opt.imageUrl}
                            alt={opt.value}
                            className="w-8 h-8 object-cover rounded"
                          />
                        )}
                        <span>{opt.value}</span>
                        {opt.price && (
                          <span className="text-muted-foreground">¥{opt.price}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </Card>
          )}

          {/* 规格参数 */}
          {Object.keys(data.specifications).length > 0 && (
            <Card className="p-6 space-y-4">
              <h2 className="text-lg font-semibold">
                规格参数（{Object.keys(data.specifications).length} 项）
              </h2>
              <table className="w-full text-sm">
                <tbody>
                  {Object.entries(data.specifications).map(([key, value]) => (
                    <tr key={key} className="border-b">
                      <td className="py-2 font-medium w-1/3">{key}</td>
                      <td className="py-2">{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}

          {/* 主图 */}
          {data.mainImages.length > 0 && (
            <Card className="p-6 space-y-4">
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
              <div className="grid grid-cols-4 gap-3">
                {data.mainImages.map((imgUrl, i) => {
                  const selected = selectedMain.has(imgUrl)
                  return (
                    <div
                      key={i}
                      className="relative cursor-pointer"
                      onClick={() => toggleImage(selectedMain, imgUrl, setSelectedMain)}
                    >
                      <img
                        src={imgUrl}
                        alt={`主图 ${i + 1}`}
                        className={`w-full aspect-square object-cover rounded border-2 transition-all ${
                          selected ? 'border-primary' : 'border-transparent opacity-40'
                        }`}
                      />
                      <div className={`absolute top-1.5 right-1.5 w-5 h-5 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all ${
                        selected
                          ? 'bg-primary border-primary text-white'
                          : 'bg-white border-gray-300'
                      }`}>
                        {selected && '✓'}
                      </div>
                    </div>
                  )
                })}
              </div>
            </Card>
          )}

          {/* 详情图 */}
          {data.detailImages.length > 0 && (
            <Card className="p-6 space-y-4">
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
              <div className="grid grid-cols-3 gap-3 max-h-[600px] overflow-y-auto">
                {data.detailImages.map((imgUrl, i) => {
                  const selected = selectedDetail.has(imgUrl)
                  return (
                    <div
                      key={i}
                      className="relative cursor-pointer"
                      onClick={() => toggleImage(selectedDetail, imgUrl, setSelectedDetail)}
                    >
                      <img
                        src={imgUrl}
                        alt={`详情图 ${i + 1}`}
                        className={`w-full object-cover rounded border-2 transition-all ${
                          selected ? 'border-primary' : 'border-transparent opacity-40'
                        }`}
                      />
                      <div className={`absolute top-1.5 right-1.5 w-5 h-5 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all ${
                        selected
                          ? 'bg-primary border-primary text-white'
                          : 'bg-white border-gray-300'
                      }`}>
                        {selected && '✓'}
                      </div>
                    </div>
                  )
                })}
              </div>
            </Card>
          )}

          {/* 操作按钮 */}
          <div className="flex gap-3">
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving
                ? '保存中...'
                : existingId
                  ? '更新商品'
                  : '保存商品'}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setStatus('idle')
                setData(null)
              }}
            >
              取消
            </Button>
          </div>
        </>
      )}
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
    </div>
  )
}