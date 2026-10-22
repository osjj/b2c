'use client'

import { useEffect, useRef, useState } from 'react'
import { scanCommonProductImageOptimization, optimizeCommonProductImage } from '@/actions/admin/common-product-image-optimization'
import { imageOptimizationScanResultSchema, imageOptimizationResultSchema, type ImageOptimizationProduct, type ImageOptimizationImage } from '@/lib/quotation/common-product-image-optimization'
import { Button } from '@/components/ui/button'
import { PrivateImagePreview } from './private-image-preview'
import { useQuotationConfirm } from './use-quotation-confirm'

type Outcome = { status: 'processing' | 'optimized' | 'unchanged' | 'failed' | 'blocked' | 'unknown'; reason: string; savedBytes?: number }
type ImageJob = { productId: string; updatedAt: string; image: ImageOptimizationImage }

function formatBytes(bytes: number) {
  return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`
}

export function CommonProductImageOptimization() {
  const [products, setProducts] = useState<ImageOptimizationProduct[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [outcomes, setOutcomes] = useState<Record<string, Outcome>>({})
  const [phase, setPhase] = useState<'idle' | 'scanning' | 'running'>('idle')
  const [scanned, setScanned] = useState(false)
  const [needsRescan, setNeedsRescan] = useState(false)
  const [stopRequested, setStopRequested] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const busyRef = useRef(false)
  const stopRef = useRef(false)
  const confirmation = useQuotationConfirm()
  const busy = phase !== 'idle'
  const images = products.flatMap((product) => product.images)
  const eligible = images.filter((image) => image.status === 'pending' && !outcomes[image.id])
  const chosen = eligible.filter((image) => selected.has(image.id))
  const savedBytes = Object.values(outcomes).reduce((sum, outcome) => sum + (outcome.savedBytes ?? 0), 0)

  useEffect(() => () => { stopRef.current = true }, [])

  useEffect(() => {
    if (phase !== 'running') return
    const preventExit = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', preventExit)
    return () => window.removeEventListener('beforeunload', preventExit)
  }, [phase])

  async function scan() {
    if (busyRef.current) return
    busyRef.current = true
    setPhase('scanning'); setScanned(false); setError(''); setMessage(''); setProducts([]); setOutcomes({}); setSelected(new Set()); setProgress({ done: 0, total: 0 })
    try {
      const gathered: ImageOptimizationProduct[] = []
      const seenProducts = new Set<string>()
      const seenImages = new Set<string>()
      const seenCursors = new Set<string>()
      let cursor: string | undefined
      do {
        const response = await scanCommonProductImageOptimization(cursor ? { cursor } : {})
        if (!response.success) throw new Error(response.reason || '扫描失败，请重新扫描')
        const page = imageOptimizationScanResultSchema.parse(response.data)
        for (const product of page.products) {
          if (seenProducts.has(product.id)) throw new Error('扫描期间列表发生变化，请重新扫描')
          seenProducts.add(product.id)
          for (const image of product.images) {
            if (seenImages.has(image.id)) throw new Error('图片列表存在重复，请重新扫描')
            seenImages.add(image.id)
          }
          gathered.push(product)
        }
        setProducts([...gathered])
        if (page.nextCursor && seenCursors.has(page.nextCursor)) throw new Error('扫描未能继续，请重新扫描')
        if (page.nextCursor) seenCursors.add(page.nextCursor)
        cursor = page.nextCursor ?? undefined
      } while (cursor)
      setSelected(new Set(gathered.flatMap((product) => product.images.filter((image) => image.status === 'pending').map((image) => image.id))))
      setNeedsRescan(false); setScanned(true)
      setMessage(gathered.length ? '扫描完成。已默认选中待优化图片，可取消不需要处理的图片。' : '没有找到带图片的常用产品。')
    } catch (cause) {
      setNeedsRescan(true)
      setError(cause instanceof Error && !(cause.name === 'ZodError') ? cause.message : '扫描结果无效，请重新扫描')
    } finally {
      busyRef.current = false; setPhase('idle')
    }
  }

  async function run(queue: ImageJob[]) {
    if (busyRef.current || !scanned || needsRescan || !queue.length) return
    busyRef.current = true; stopRef.current = false
    setPhase('running'); setStopRequested(false); setError(''); setMessage(''); setProgress({ done: 0, total: queue.length })
    const versions = new Map(queue.map((job) => [job.productId, job.updatedAt]))
    const blockedProducts = new Set<string>()
    let optimized = 0
    let unchanged = 0
    let interrupted = false
    try {
      for (const [index, job] of queue.entries()) {
        if (stopRef.current) { interrupted = true; break }
        if (blockedProducts.has(job.productId)) {
          setOutcomes((current) => ({ ...current, [job.image.id]: { status: 'blocked', reason: '同一产品有图片未能处理，请重新扫描后检查。' } }))
          setProgress({ done: index + 1, total: queue.length })
          continue
        }
        const sourceFileId = job.image.sourceFileId
        const expectedUpdatedAt = versions.get(job.productId)
        if (!sourceFileId || !expectedUpdatedAt) throw new Error('图片状态无效')
        setOutcomes((current) => ({ ...current, [job.image.id]: { status: 'processing', reason: '正在优化…' } }))
        try {
          const response = await optimizeCommonProductImage({ requestId: crypto.randomUUID(), productId: job.productId, imageId: job.image.id, sourceFileId, expectedUpdatedAt })
          if (!response.success) {
            if (response.code === 'INTERNAL_ERROR' || response.code === 'UNAUTHORIZED' || response.code === 'FORBIDDEN' || response.code === 'FEATURE_DISABLED') throw new Error('操作结果未确认')
            blockedProducts.add(job.productId)
            setOutcomes((current) => ({ ...current, [job.image.id]: { status: 'failed', reason: response.reason || '处理失败，请重新扫描后检查。' } }))
            continue
          }
          const result = imageOptimizationResultSchema.parse(response.data)
          if (result.productId !== job.productId || result.imageId !== job.image.id || result.afterBytes > result.beforeBytes) throw new Error('操作结果不匹配')
          versions.set(job.productId, result.updatedAt)
          if (result.status === 'optimized') optimized++; else unchanged++
          setOutcomes((current) => ({ ...current, [job.image.id]: { status: result.status, reason: result.status === 'optimized' ? `${formatBytes(result.beforeBytes)} → ${formatBytes(result.afterBytes)}` : '压缩收益不明显，保留原图。', savedBytes: result.beforeBytes - result.afterBytes } }))
          setProducts((current) => current.map((product) => product.id !== job.productId ? product : { ...product, updatedAt: result.updatedAt, images: product.images.map((image) => image.id !== job.image.id ? image : { ...image, sourceFileId: result.sourceFileId, originalSourceFileId: result.originalSourceFileId, sizeBytes: result.afterBytes, status: result.status, reason: result.status === 'optimized' ? '已优化，原图已保留。' : '压缩收益不明显，保留原图。' }) }))
        } catch {
          interrupted = true; setNeedsRescan(true)
          setOutcomes((current) => ({ ...current, [job.image.id]: { status: 'unknown', reason: '未能确认处理结果，请重新扫描核对。' } }))
          setError('批量处理已停止。可能已有图片处理成功，请重新扫描核对最新状态，再继续操作。')
          break
        } finally {
          setProgress({ done: index + 1, total: queue.length })
        }
      }
    } catch {
      interrupted = true; setNeedsRescan(true); setError('批量处理已停止，请重新扫描核对最新状态。')
    } finally {
      busyRef.current = false; setPhase('idle'); setStopRequested(false)
      setMessage(`${interrupted ? '本轮已停止' : '本轮处理结束'}：优化 ${optimized} 张，${unchanged} 张保持不变；原图均已保留。`)
    }
  }

  function askStart() {
    if (busyRef.current || !scanned || needsRescan) return
    const queue = products.flatMap((product) => product.images.filter((image) => image.status === 'pending' && selected.has(image.id) && !outcomes[image.id]).map((image) => ({ productId: product.id, updatedAt: product.updatedAt, image })))
    if (!queue.length) return
    confirmation.ask('优化选中的旧图片', `将逐张处理 ${queue.length} 张图片，优先保留清晰度。原图会保留，只更新常用产品图片；已保存的报价单和导出文件不变。请保持此页面打开，可在当前图片处理完后停止。`, () => { void run(queue) })
  }

  return <div className="space-y-6">
    {confirmation.dialog}
    <section className="space-y-4 rounded-2xl border bg-white p-5 sm:p-6">
      <div className="space-y-2"><h2 className="font-semibold">先扫描，再选择需要优化的图片</h2><p className="text-sm leading-6 text-slate-600">扫描全部常用产品，包括已停用产品。小图、已经优化过的图片会跳过；只有体积明显减小才替换。原图长期保留，已保存报价单及其 PDF、Excel 保持不变。</p><p className="text-xs leading-5 text-slate-500">优化用于减小常用产品展示和后续新报价使用的图片体积。由于保留原图，总存储占用不会因此减少。</p></div>
      <div className="flex flex-wrap gap-3"><Button type="button" variant="outline" disabled={busy} onClick={() => { void scan() }}>{phase === 'scanning' ? '正在扫描…' : scanned || needsRescan ? '重新扫描' : '扫描图片'}</Button><Button type="button" disabled={busy || !scanned || needsRescan || !chosen.length} onClick={askStart}>开始优化 {chosen.length} 张图片</Button>{phase === 'running' && <Button type="button" variant="outline" disabled={stopRequested} onClick={() => { stopRef.current = true; setStopRequested(true) }}>{stopRequested ? '当前图片完成后停止…' : '完成当前图片后停止'}</Button>}</div>
      {phase === 'scanning' && <p role="status" className="text-sm text-teal-800">正在扫描，已读取 {products.length} 个产品、{images.length} 张图片…</p>}
      {phase === 'running' && <p role="status" className="text-sm text-teal-800">正在处理第 {Math.min(progress.done + 1, progress.total)} / {progress.total} 张图片，请保持页面打开。</p>}
      {message && <p role="status" className="text-sm text-teal-800">{message}</p>}
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {scanned && <div className="flex flex-wrap gap-x-6 gap-y-2 rounded-xl bg-slate-50 p-4 text-sm"><span>已扫描 {products.length} 个产品 / {images.length} 张图片</span><span>待优化 {eligible.length} 张</span><span>已选 {chosen.length} 张 / {formatBytes(chosen.reduce((sum, image) => sum + image.sizeBytes, 0))}</span>{savedBytes > 0 && <span className="font-medium text-teal-800">本次已减少图片体积 {formatBytes(savedBytes)}</span>}</div>}
      {scanned && eligible.length > 0 && <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm"><input type="checkbox" aria-label="全选待优化图片" checked={chosen.length === eligible.length} disabled={busy || needsRescan} onChange={(event) => setSelected(event.target.checked ? new Set(eligible.map((image) => image.id)) : new Set())} />全选待优化图片</label>}
    </section>
    {products.map((product) => <section key={product.id} className="min-w-0 space-y-3 rounded-2xl border bg-white p-5 sm:p-6"><h2 className="font-medium [overflow-wrap:anywhere]">{product.name}</h2><ul className="space-y-3">{product.images.map((image, index) => {
      const outcome = outcomes[image.id]
      const canSelect = scanned && image.status === 'pending' && !outcome
      const currentSource = image.sourceFileId
      const originalSource = image.originalSourceFileId
      const failed = outcome && ['failed', 'blocked', 'unknown'].includes(outcome.status)
      return <li key={image.id} data-optimization-image={image.id} className="min-w-0 space-y-2 rounded-xl border bg-slate-50 p-3"><div className="flex items-start gap-3"><input type="checkbox" aria-label={`选择${product.name}图片 ${index + 1}`} className="mt-1" checked={canSelect && selected.has(image.id)} disabled={!canSelect || busy || needsRescan} onChange={(event) => { const checked = event.target.checked; setSelected((current) => { const next = new Set(current); if (checked) next.add(image.id); else next.delete(image.id); return next }) }} /><div className="min-w-0 flex-1"><p className="text-sm font-medium [overflow-wrap:anywhere]">图片 {index + 1} · {image.name}</p><p className="mt-1 text-xs text-slate-500">当前 {formatBytes(image.sizeBytes)}</p><p role={failed ? 'alert' : undefined} className={`mt-1 text-sm [overflow-wrap:anywhere] ${failed ? 'text-red-700' : 'text-slate-600'}`}>{outcome?.reason ?? image.reason}</p></div></div><div className="flex flex-wrap gap-2 pl-7">{currentSource && <PrivateImagePreview imageId={currentSource} imageKind="source" imageName={`${product.name} 图片 ${index + 1}`} className="w-auto min-h-11 border bg-white px-3 py-2 text-xs"><span>查看当前图片</span></PrivateImagePreview>}{originalSource && originalSource !== currentSource && <><PrivateImagePreview imageId={originalSource} imageKind="source" imageName={`${product.name} 图片 ${index + 1} 原图`} className="w-auto min-h-11 border bg-white px-3 py-2 text-xs"><span>查看原图</span></PrivateImagePreview><a className="inline-flex min-h-11 items-center rounded-lg px-3 py-2 text-xs text-teal-800 underline focus-visible:outline-2 focus-visible:outline-teal-600" href={`/api/admin/quotation-images/${originalSource}?kind=source`} download>下载原图</a></>}</div></li>
    })}</ul></section>)}
  </div>
}
