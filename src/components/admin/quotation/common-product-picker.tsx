'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ImageIcon, Loader2, Search } from 'lucide-react'
import { loadCommonQuotationProducts } from '@/actions/admin/common-quotation-products'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { commonProductOptionsSchema, type CommonProductOption } from '@/lib/quotation/simple-input'
import { CommonProductThumbnail, useCommonProductThumbnails } from './common-product-thumbnail'

type PickerTarget = { index: number; trigger: HTMLButtonElement }

export function CommonProductPicker({ target, disabled, onClose, onChoose }: {
  target: PickerTarget | null
  disabled: boolean
  onClose: () => void
  onChoose: (index: number, product: CommonProductOption) => void
}) {
  // This component stays mounted for the editor visit, shared by every line.
  const [products, setProducts] = useState<CommonProductOption[] | null>(null)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const started = useRef(false)
  const inFlight = useRef(false)
  const opener = useRef<HTMLButtonElement | null>(null)
  const pendingChoice = useRef<{ index: number; product: CommonProductOption } | null>(null)
  const searchInput = useRef<HTMLInputElement>(null)
  const scrollTop = useRef(0)
  const loadThumbnail = useCommonProductThumbnails()

  const load = useCallback(async () => {
    if (inFlight.current) return
    started.current = true
    inFlight.current = true
    setLoading(true)
    setError('')
    try {
      const result = await loadCommonQuotationProducts()
      if (!result.success) {
        setError(result.reason || '常用产品加载失败，请重试。')
        return
      }
      const parsed = commonProductOptionsSchema.safeParse(result.data)
      if (!parsed.success) {
        setError('常用产品资料无法读取，请重新加载。')
        return
      }
      setProducts(parsed.data)
    } catch {
      setError('常用产品加载失败，请检查网络后重新加载。')
    } finally {
      inFlight.current = false
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!target) return
    opener.current = target.trigger
    if (!started.current) void load()
  }, [target, load])

  const filtered = useMemo(() => {
    const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean)
    return (products ?? []).filter((product) => {
      const text = [product.name, product.nameEn, product.nameZh, product.internalNumber, product.model, product.sku, product.specifications, product.description, product.packaging].filter(Boolean).join('\n').toLocaleLowerCase()
      return terms.every((term) => text.includes(term))
    })
  }, [products, query])

  return <Sheet open={target !== null} onOpenChange={(open) => { if (!open) onClose() }}>
    <SheetContent
      side="right"
      className="w-full gap-0 sm:w-[min(90vw,48rem)] sm:max-w-3xl [&>button]:flex [&>button]:size-11 [&>button]:items-center [&>button]:justify-center"
      onOpenAutoFocus={(event) => { event.preventDefault(); searchInput.current?.focus() }}
      onCloseAutoFocus={(event) => {
        event.preventDefault()
        opener.current?.focus()
        // Wait until the sheet's focus scope closes before showing replacement confirmation.
        const choice = pendingChoice.current
        pendingChoice.current = null
        if (choice && !disabled) onChoose(choice.index, choice.product)
      }}
    >
      <SheetHeader className="border-b px-6 py-6 pr-16">
        <SheetTitle>选择常用产品</SheetTitle>
        <SheetDescription>选择产品填入第 {(target?.index ?? 0) + 1} 项明细，名称、规格、价格和图片会一起带入。</SheetDescription>
      </SheetHeader>
      <div className="space-y-3 border-b px-6 py-4">
        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-3.5 size-4 text-slate-400" />
            <Input ref={searchInput} type="search" aria-label="搜索常用产品" placeholder="搜索名称、编号、型号、SKU 或规格" className="h-11 pl-9" value={query} maxLength={200} onChange={(event) => { setQuery(event.target.value); scrollTop.current = 0 }} />
          </div>
          {query && <Button type="button" variant="ghost" className="h-11 shrink-0" onClick={() => { setQuery(''); scrollTop.current = 0; searchInput.current?.focus() }}>清空搜索</Button>}
        </div>
        {products !== null && <p role="status" className="text-xs text-slate-500">{query.trim() ? `找到 ${filtered.length} 个产品，共 ${products.length} 个可用产品` : `共 ${products.length} 个可用产品`}</p>}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6" ref={(element) => { if (element) element.scrollTop = scrollTop.current }} onScroll={(event) => { scrollTop.current = event.currentTarget.scrollTop }}>
        {loading && <p role="status" className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500"><Loader2 aria-hidden="true" className="size-4 animate-spin" />正在加载常用产品…</p>}
        {!loading && error && <div className="space-y-4 rounded-xl border border-red-100 bg-red-50 p-6"><p role="alert" className="text-sm text-red-700">{error}</p><Button type="button" variant="outline" onClick={() => void load()}>重新加载</Button></div>}
        {!loading && !error && products !== null && filtered.length === 0 && <div className="space-y-3 py-16 text-center text-sm text-slate-500"><p>{products.length === 0 ? '暂无可用的常用产品，请先在常用产品页面添加。' : '没有找到匹配的常用产品，请更换关键词。'}</p>{products.length > 0 && <Button type="button" variant="outline" onClick={() => { setQuery(''); searchInput.current?.focus() }}>显示全部产品</Button>}</div>}
        {!loading && !error && <div className="grid gap-3 sm:grid-cols-2">{filtered.map((product) => {
          const image = product.images[0]
          return <button key={product.id} type="button" aria-label={`选择 ${product.name}`} disabled={disabled} className="group flex min-w-0 flex-col overflow-hidden rounded-xl border bg-white text-left transition-colors hover:border-teal-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 disabled:opacity-50" onClick={() => {
            if (!target || disabled) return
            pendingChoice.current = { index: target.index, product }
            onClose()
          }}>
            <div className="relative flex h-36 w-full items-center justify-center border-b bg-slate-50 sm:h-40">
              {image ? <CommonProductThumbnail image={image} name={product.name} load={loadThumbnail} /> : <span className="flex items-center gap-2 text-xs text-slate-400"><ImageIcon aria-hidden="true" className="size-5" />暂无图片</span>}
            </div>
            <div className="flex w-full min-w-0 flex-1 flex-col gap-2 p-4">
              <p className="line-clamp-2 text-sm font-medium text-slate-900 [overflow-wrap:anywhere] group-hover:text-teal-800">{product.name}</p>
              {(product.model || product.sku || product.internalNumber) && <p className="line-clamp-1 text-xs text-slate-500 [overflow-wrap:anywhere]">{[product.internalNumber, product.model, product.sku].filter(Boolean).join(' · ')}</p>}
              <p className="mt-auto pt-1 text-sm font-semibold text-teal-800 [overflow-wrap:anywhere]">{product.currency} {product.unitPrice}<span className="ml-1 text-xs font-normal text-slate-500">/ {product.unit}</span></p>
            </div>
          </button>
        })}</div>}
      </div>
    </SheetContent>
  </Sheet>
}
