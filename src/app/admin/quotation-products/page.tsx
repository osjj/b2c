import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { requireAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { isQuotationWorkbenchEnabled } from '@/lib/quotation/feature'
import { commonProductDefaultsSchema } from '@/lib/quotation/simple-input'
import { WorkbenchHeader } from '@/components/admin/quotation/workbench-header'
import { CatalogImport } from '@/components/admin/quotation/catalog-import'
import { Pagination } from '@/components/admin/pagination'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default async function CommonProductsPage({ searchParams }: { searchParams: Promise<{ search?: string; page?: string }> }) {
  if (!isQuotationWorkbenchEnabled()) notFound()
  await requireAdmin()
  const params = await searchParams
  const search = (params.search || '').trim().slice(0, 200)
  const page = Math.min(100000, Math.max(1, Math.floor(Number(params.page) || 1)))
  const where = search ? { OR: [{ nameEn: { contains: search, mode: 'insensitive' as const } }, { nameZh: { contains: search, mode: 'insensitive' as const } }] } : {}
  const [products, total] = await Promise.all([
    prisma.quotationProduct.findMany({ where, orderBy: { updatedAt: 'desc' }, take: 24, skip: (page - 1) * 24, select: { id: true, nameEn: true, nameZh: true, unit: true, status: true, images: { where: { isCustomerVisible: true, sourceFile: { securityStatus: 'CLEAN', deletedAt: null, salesQuotationId: null } }, orderBy: { sortOrder: 'asc' }, take: 1, select: { sourceFileId: true } } } }),
    prisma.quotationProduct.count({ where }),
  ])
  const defaults = await prisma.setting.findMany({ where: { key: { in: products.map((product) => `quotation.product-defaults.${product.id}`) } } })
  return <div className="space-y-8"><WorkbenchHeader title="常用产品" description="产品图片、规格和价格集中维护；临时报价仍可直接填写。"><Button asChild><Link href="/admin/quotation-products/new">添加常用产品</Link></Button></WorkbenchHeader>
    <details className="rounded-2xl border bg-white"><summary className="cursor-pointer p-5 font-medium text-teal-800">从商城商品导入 →</summary><CatalogImport /></details>
    <form className="flex max-w-lg gap-3"><Input name="search" aria-label="搜索产品" placeholder="搜索常用产品名称" defaultValue={search} /><Button variant="secondary">搜索</Button></form>
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{products.map((product) => {
      const price = commonProductDefaultsSchema.parse(defaults.find((row) => row.key === `quotation.product-defaults.${product.id}`)?.value ?? {})
      const imageId = product.images[0]?.sourceFileId
      return <Link key={product.id} href={`/admin/quotation-products/${product.id}`} className="group overflow-hidden rounded-2xl border bg-white transition-shadow hover:shadow-md"><div className="relative flex h-52 items-center justify-center border-b bg-slate-50">{imageId ? <Image unoptimized src={`/api/admin/quotation-images/${imageId}?kind=source`} alt={product.nameEn || product.nameZh || '产品图片'} fill className="object-contain p-5" sizes="(max-width: 768px) 100vw, 33vw" /> : <span className="text-sm text-slate-400">暂无图片</span>}</div><div className="space-y-3 p-5"><h2 className="line-clamp-2 min-h-12 font-medium text-slate-900 group-hover:text-teal-800">{product.nameEn || product.nameZh}</h2><div className="flex items-baseline justify-between"><p className="font-semibold tabular-nums text-teal-800">{price.currency} {price.unitPrice}<span className="ml-1 text-xs font-normal text-slate-500">/ {product.unit}</span></p><span className="text-xs text-slate-500">{product.status === 'INACTIVE' ? '已停用' : '可使用'}</span></div><p className="text-xs text-slate-500">内部成本：{price.unitCost == null ? '未填写' : `${price.currency} ${price.unitCost}`}</p></div></Link>
    })}</div>{!products.length && <p className="rounded-2xl border bg-white p-12 text-center text-slate-500">暂无常用产品，可手动添加或从商城导入。</p>}<Pagination page={page} total={total} totalPages={Math.ceil(total / 24)} /></div>
}
