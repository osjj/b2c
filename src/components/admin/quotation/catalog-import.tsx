'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { searchQuotationCatalog, importQuotationCatalogProduct } from '@/actions/admin/quotation-catalog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useQuotationConfirm } from './use-quotation-confirm'
import { catalogOptionsSchema, type CatalogProductOption } from '@/lib/quotation/catalog-product'

export function CatalogImport() {
  const [search, setSearch] = useState('')
  const [rows, setRows] = useState<CatalogProductOption[]>([])
  const [searched, setSearched] = useState(false)
  const [images, setImages] = useState(true)
  const [busy, startTransition] = useTransition()
  const [error, setError] = useState('')
  const router = useRouter(); const confirmation = useQuotationConfirm()
  return <section className="space-y-5 rounded-2xl border bg-slate-50 p-6">{confirmation.dialog}<div><h2 className="font-semibold text-slate-900">从商城商品导入</h2><p className="mt-1 text-sm text-slate-500">手动复制上架商品的名称、规格、描述、单价和成本价。商城以 USD 计价；不换算价格、不覆盖已导入资料。包装未知时留空。</p></div>
    <form className="flex gap-3" onSubmit={(event) => { event.preventDefault(); startTransition(async () => { setError(''); try { const result = await searchQuotationCatalog({ search }); if (!result.success) { setError(result.reason); return } setRows(catalogOptionsSchema.parse(result.data)); setSearched(true) } catch { setError('商品搜索失败，请刷新或检查登录状态') } }) }}><Input aria-label="搜索商城商品" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="商城产品名称或 SKU" /><Button disabled={busy} variant="secondary">搜索商城</Button></form>
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={images} disabled={busy} onChange={(e) => setImages(e.target.checked)} />同时复制商品主图（最多 8 张，进入报价私有存储）</label>
    <div className="divide-y">{rows.map((row) => <div key={row.id} className="flex items-center justify-between gap-4 py-4"><div><p className="font-medium">{row.name}</p><p className="mt-1 text-xs text-slate-500">USD {row.unitPrice} · 成本 {row.unitCost ?? '未填写'} · {row.imageIds.length} 张图片</p></div><Button disabled={busy} variant="outline" onClick={() => confirmation.ask('导入常用产品', `将复制“${row.name}”及${images ? '商品图片' : '文字资料（不含图片）'}。不会修改商城商品。`, () => startTransition(async () => { setError(''); try { const result = await importQuotationCatalogProduct({ productId: row.id, updatedAt: row.updatedAt, includeImages: images }); if (!result.success) { setError(result.reason); return } if (result.data && typeof result.data === 'object' && 'id' in result.data) { router.push(`/admin/quotation-products/${result.data.id}`); router.refresh() } } catch { setError('导入未完成，请刷新后重试') } }))}>导入</Button></div>)}</div>
    {searched && !rows.length && <p className="text-sm text-slate-500">没有匹配的上架商品。</p>}{busy && <p role="status" className="text-sm text-teal-800">正在处理，请勿重复提交…</p>}{error && <p role="alert" className="text-sm text-red-700">{error}</p>}</section>
}
