import Link from 'next/link'
import Image from 'next/image'
import { notFound, redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { isQuotationWorkbenchEnabled } from '@/lib/quotation/feature'
import { commonProductDefaultsSchema } from '@/lib/quotation/simple-input'
import { WorkbenchHeader } from '@/components/admin/quotation/workbench-header'
import { CatalogImport } from '@/components/admin/quotation/catalog-import'
import { CommonProductDelete } from '@/components/admin/quotation/common-product-delete'
import { PrivateImagePreview } from '@/components/admin/quotation/private-image-preview'
import { Pagination } from '@/components/admin/pagination'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'
import type { Prisma } from '@prisma/client'
import { readCommonProductCategory } from '@/lib/quotation/common-product-category'

export default async function CommonProductsPage({ searchParams }: { searchParams: Promise<{ search?: string; category?: string; page?: string }> }) {
  if (!isQuotationWorkbenchEnabled()) notFound()
  await requireAdmin()
  const params = await searchParams
  const search = (params.search || '').trim().slice(0, 200)
  const category = (params.category || '').trim().slice(0, 80)
  const page = Math.min(100000, Math.max(1, Math.floor(Number(params.page) || 1)))
  const categoryPrefix = 'quotation.product-category.'
  const categorySettings = await prisma.setting.findMany({ where: { key: { startsWith: categoryPrefix } }, select: { key: true, value: true } })
  const categorizedProducts = categorySettings.map((entry) => ({ id: entry.key.slice(categoryPrefix.length), category: readCommonProductCategory(entry.value) })).filter((entry) => entry.category)
  const categories = [...new Set([...categorizedProducts.map((entry) => entry.category), ...(category && category !== '__uncategorized__' ? [category] : [])])].sort((a, b) => a.localeCompare(b, 'zh-CN'))
  const categoryById = new Map(categorizedProducts.map((entry) => [entry.id, entry.category]))
  const where: Prisma.QuotationProductWhereInput = {
    ...(search ? { OR: [{ nameEn: { contains: search, mode: 'insensitive' as const } }, { nameZh: { contains: search, mode: 'insensitive' as const } }, { internalNumber: { contains: search, mode: 'insensitive' as const } }, { model: { contains: search, mode: 'insensitive' as const } }, { sku: { contains: search, mode: 'insensitive' as const } }] } : {}),
    ...(category ? { id: category === '__uncategorized__' ? { notIn: categorizedProducts.map((entry) => entry.id) } : { in: categorizedProducts.filter((entry) => entry.category === category).map((entry) => entry.id) } } : {}),
  }
  const [products, total] = await Promise.all([
    prisma.quotationProduct.findMany({ where, orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }], take: 24, skip: (page - 1) * 24, select: { id: true, nameEn: true, nameZh: true, unit: true, status: true, updatedAt: true, images: { where: { isCustomerVisible: true, sourceFile: { securityStatus: 'CLEAN', deletedAt: null, salesQuotationId: null } }, orderBy: { sortOrder: 'asc' }, take: 1, select: { sourceFileId: true } } } }),
    prisma.quotationProduct.count({ where }),
  ])
  const totalPages = Math.max(1, Math.ceil(total / 24))
  if (page > totalPages) {
    const query = new URLSearchParams({ page: String(totalPages) })
    if (search) query.set('search', search)
    if (category) query.set('category', category)
    redirect(`/admin/quotation-products?${query}`)
  }
  const defaults = await prisma.setting.findMany({ where: { key: { in: products.map((product) => `quotation.product-defaults.${product.id}`) } } })
  return <div className="space-y-8"><WorkbenchHeader title="常用产品" description="产品图片、规格和价格集中维护；临时报价仍可直接填写。"><Button asChild><Link href="/admin/quotation-products/new">添加常用产品</Link></Button></WorkbenchHeader>
    <details className="rounded-2xl border bg-white"><summary className="cursor-pointer p-5 font-medium text-teal-800">从商城商品导入 →</summary><CatalogImport /></details>
    <section className="space-y-3 rounded-2xl border bg-white p-5"><form action="/admin/quotation-products" method="get" className="flex flex-wrap items-end gap-3"><label className="w-full space-y-2 text-sm font-medium sm:w-48">产品分类<select key={category} name="category" aria-label="筛选产品分类" defaultValue={category} className="h-11 w-full rounded-md border bg-white px-3 text-sm"><option value="">全部分类</option><option value="__uncategorized__">未分类</option>{categories.map((name) => <option key={name} value={name}>{name}</option>)}</select></label><label className="min-w-0 flex-1 space-y-2 text-sm font-medium">搜索常用产品<div className="relative"><Search aria-hidden="true" className="pointer-events-none absolute left-3 top-3.5 size-4 text-slate-400" /><Input key={search} type="search" name="search" aria-label="搜索常用产品" placeholder="输入产品名称、编号、型号或 SKU" defaultValue={search} maxLength={200} className="h-11 pl-9" /></div></label><Button type="submit" variant="secondary" className="h-11">搜索</Button>{search && <Button asChild variant="ghost" className="h-11"><Link href={category ? `/admin/quotation-products?${new URLSearchParams({ category })}` : '/admin/quotation-products'}>清空搜索</Link></Button>}{category && <Button asChild variant="ghost" className="h-11"><Link href="/admin/quotation-products">清空筛选</Link></Button>}</form><p className="text-xs text-slate-500">{search || category ? `找到 ${total} 个匹配的常用产品` : `共 ${total} 个常用产品`}</p></section>
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{products.map((product) => {
      const price = commonProductDefaultsSchema.parse(defaults.find((row) => row.key === `quotation.product-defaults.${product.id}`)?.value ?? {})
      const imageId = product.images[0]?.sourceFileId
      return <article key={product.id} className="overflow-hidden rounded-2xl border bg-white transition-shadow hover:shadow-md"><div className="relative flex h-52 items-center justify-center border-b bg-slate-50">{imageId ? <PrivateImagePreview imageId={imageId} imageKind="source" imageName={product.nameEn || product.nameZh || '产品图片'} className="h-full rounded-none focus-visible:ring-inset"><Image unoptimized src={`/api/admin/quotation-images/${imageId}?kind=source`} alt={product.nameEn || product.nameZh || '产品图片'} fill className="object-contain p-5" sizes="(max-width: 768px) 100vw, 33vw" /></PrivateImagePreview> : <Link href={`/admin/quotation-products/${product.id}`} className="flex h-full w-full items-center justify-center text-sm text-slate-400">暂无图片</Link>}</div><Link href={`/admin/quotation-products/${product.id}`} className="group block space-y-3 p-5"><h2 className="line-clamp-2 min-h-12 [overflow-wrap:anywhere] font-medium text-slate-900 group-hover:text-teal-800">{product.nameEn || product.nameZh || '未命名产品'}</h2><p className="text-xs text-teal-800 [overflow-wrap:anywhere]">{categoryById.get(product.id) || '未分类'}</p><div className="flex items-baseline justify-between"><p className="font-semibold tabular-nums text-teal-800">{price.currency} {price.unitPrice}<span className="ml-1 text-xs font-normal text-slate-500">/ {product.unit}</span></p><span className="text-xs text-slate-500">{product.status === 'INACTIVE' ? '已停用' : '可使用'}</span></div><p className="text-xs text-slate-500">内部成本：{price.unitCost == null ? '未填写' : `${price.currency} ${price.unitCost}`}</p></Link><div className="border-t px-5 py-3"><CommonProductDelete productId={product.id} productName={product.nameEn || product.nameZh || '未命名产品'} expectedUpdatedAt={product.updatedAt.toISOString()} /></div></article>
    })}</div>{!products.length && <p className="rounded-2xl border bg-white p-12 text-center text-slate-500">{search || category ? '没有找到匹配的常用产品，请更换分类、关键词或清空筛选。' : '暂无常用产品，可手动添加或从商城导入。'}</p>}<Pagination page={page} total={total} totalPages={totalPages} /></div>
}
