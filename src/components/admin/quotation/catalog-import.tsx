'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { z } from 'zod'
import { searchQuotationCatalog, importQuotationCatalogProduct } from '@/actions/admin/quotation-catalog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useQuotationConfirm } from './use-quotation-confirm'
import { catalogOptionsSchema, type CatalogProductOption } from '@/lib/quotation/catalog-product'

const importResultSchema = z.object({ id: z.string().cuid() })
const failureStatusSchema = z.object({ code: z.string(), reason: z.string().min(1), outcomeUnknown: z.boolean().optional() })
type Operation = { kind: 'search' } | { kind: 'import'; name: string; imageCount: number }

export function CatalogImport() {
  const [search, setSearch] = useState('')
  const [rows, setRows] = useState<CatalogProductOption[]>([])
  const [searched, setSearched] = useState(false)
  const [images, setImages] = useState(true)
  const [pending, startTransition] = useTransition()
  const [operation, setOperation] = useState<Operation | null>(null)
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [error, setError] = useState('')
  const [needsStateCheck, setNeedsStateCheck] = useState(false)
  const [savedId, setSavedId] = useState<string | null>(null)
  const saved = savedId !== null
  const inFlightRef = useRef(false)
  const slowNoticeRef = useRef(false)
  const router = useRouter()
  const confirmation = useQuotationConfirm()
  const busy = pending || operation !== null
  const locked = busy || needsStateCheck || saved

  useEffect(() => {
    if (startedAt === null) return
    const timer = window.setInterval(() => {
      const seconds = Math.floor((Date.now() - startedAt) / 1000)
      setElapsed(seconds)
      if (operation?.kind === 'import' && seconds >= 90 && !slowNoticeRef.current) {
        slowNoticeRef.current = true; setNeedsStateCheck(true)
        setError('等待服务器响应已超过 90 秒，尚未确认导入结果。请先查看常用产品列表，确认状态后再刷新页面；不要重复导入。')
      }
    }, 1000)
    return () => window.clearInterval(timer)
  }, [startedAt, operation])

  function searchCatalog() {
    if (inFlightRef.current || needsStateCheck || saved) return
    inFlightRef.current = true
    slowNoticeRef.current = false
    setError(''); setElapsed(0); setStartedAt(Date.now()); setOperation({ kind: 'search' })
    startTransition(async () => {
      try {
        const result = await searchQuotationCatalog({ search })
        if (!result.success) { setError(failureStatusSchema.parse(result).reason); return }
        setRows(catalogOptionsSchema.parse(result.data)); setSearched(true)
      } catch { setError('商品搜索失败，请检查网络或登录状态后重新搜索。') }
      finally { inFlightRef.current = false; setOperation(null); setStartedAt(null) }
    })
  }

  function importProduct(row: CatalogProductOption, includeImages: boolean) {
    if (inFlightRef.current || needsStateCheck || saved) return
    inFlightRef.current = true
    slowNoticeRef.current = false
    setError(''); setElapsed(0); setStartedAt(Date.now())
    setOperation({ kind: 'import', name: row.name, imageCount: includeImages ? row.imageIds.length : 0 })
    startTransition(async () => {
      let keepLocked = false
      try {
        const result = await importQuotationCatalogProduct({ productId: row.id, updatedAt: row.updatedAt, includeImages })
        if (!result.success) {
          const status = failureStatusSchema.parse(result)
          const uncertain = status.outcomeUnknown ?? (status.code === 'INTERNAL_ERROR')
          setNeedsStateCheck(uncertain)
          if (uncertain) keepLocked = true
          setError(uncertain ? `${status.reason} 请先查看常用产品列表，确认导入结果后再继续。` : status.reason)
          return
        }
        const data = importResultSchema.parse(result.data)
        keepLocked = true; setNeedsStateCheck(false); setError(''); setSavedId(data.id)
        try { router.push(`/admin/quotation-products/${data.id}`); router.refresh() }
        catch { setError('常用产品已确认，但自动打开页面失败。请点击“打开已导入产品”查看。') }
      } catch {
        keepLocked = true; setNeedsStateCheck(true)
        setError('未能确认导入结果，可能是连接中断或服务器响应异常。请先查看常用产品列表，确认是否已导入，避免重复操作。')
      } finally {
        if (!keepLocked) inFlightRef.current = false
        setOperation(null); setStartedAt(null)
      }
    })
  }

  return <section aria-busy={busy} className="min-w-0 space-y-5 rounded-2xl border bg-slate-50 p-6">
    {confirmation.dialog}
    <div><h2 className="font-semibold text-slate-900">从商城商品导入</h2><p className="mt-1 text-sm text-slate-500">手动复制上架商品的名称、规格、描述、单价、商品来源和成本价（多行文本，仅内部）。商城以 USD 计价；不换算价格、不覆盖已导入资料。包装未知时留空。</p></div>
    <form className="flex flex-wrap gap-3 sm:flex-nowrap" onSubmit={(event) => { event.preventDefault(); searchCatalog() }}>
      <Input aria-label="搜索商城商品" disabled={locked} className="min-w-0 flex-1" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="商城产品名称或 SKU" />
      <Button disabled={locked} variant="secondary">{operation?.kind === 'search' ? '搜索中…' : '搜索商城'}</Button>
    </form>
    <label className="flex items-start gap-2 text-sm"><input className="mt-1 shrink-0" type="checkbox" checked={images} disabled={locked} onChange={(event) => setImages(event.target.checked)} />同时复制商品主图（最多 8 张，进入报价私有存储）</label>
    <div className="divide-y">{rows.map((row) => <div key={row.id} className="flex min-w-0 flex-wrap items-center justify-between gap-4 py-4 sm:flex-nowrap">
      <div className="min-w-0 flex-1"><p className="break-words font-medium [overflow-wrap:anywhere]">{row.name}</p><p className="mt-1 text-xs text-slate-500">USD {row.unitPrice} · 成本 {row.unitCost ?? '未填写'} · {row.imageIds.length} 张图片</p></div>
      <Button type="button" disabled={locked} variant="outline" className="shrink-0" onClick={() => {
        if (inFlightRef.current || needsStateCheck || saved) return
        const includeImages = images
        confirmation.ask('导入常用产品', `将复制“${row.name}”及${includeImages ? '商品图片' : '文字资料（不含图片）'}。不会修改商城商品。`, () => importProduct(row, includeImages), 'break-words [overflow-wrap:anywhere]')
      }}>导入</Button>
    </div>)}</div>
    {searched && !rows.length && <p className="text-sm text-slate-500">没有匹配的上架商品。</p>}
    {operation && <p role="status" className="break-words text-sm text-teal-800 [overflow-wrap:anywhere]">{operation.kind === 'search'
      ? `正在搜索商城商品，已等待 ${elapsed} 秒…`
      : `正在导入“${operation.name}”${operation.imageCount ? `及 ${operation.imageCount} 张图片` : '的文字资料'}，已等待 ${elapsed} 秒，请勿重复提交…`}</p>}
    {savedId && <div className="space-y-2"><p role="status" className="text-sm text-teal-800">常用产品已确认，正在打开编辑页面…</p><Button asChild type="button" variant="outline"><Link href={`/admin/quotation-products/${savedId}`}>打开已导入产品</Link></Button></div>}
    {error && <p role="alert" className="break-words text-sm text-red-700 [overflow-wrap:anywhere]">{error}</p>}
    {needsStateCheck && <div className="flex flex-wrap gap-2"><Button asChild type="button" variant="outline"><Link href="/admin/quotation-products">查看常用产品列表</Link></Button><Button type="button" variant="outline" onClick={() => window.location.reload()}>刷新页面</Button></div>}
  </section>
}
