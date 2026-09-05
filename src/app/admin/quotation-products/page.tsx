import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { isQuotationWorkbenchEnabled } from '@/lib/quotation/feature'
import { WorkbenchHeader } from '@/components/admin/quotation/workbench-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default async function CommonProductsPage({ searchParams }: { searchParams: Promise<{ search?: string }> }) {
  if (!isQuotationWorkbenchEnabled()) notFound()
  await requireAdmin()
  const search = ((await searchParams).search || '').trim().slice(0, 200)
  const products = await prisma.quotationProduct.findMany({ where: search ? { OR: [{ nameEn: { contains: search, mode: 'insensitive' } }, { nameZh: { contains: search, mode: 'insensitive' } }] } : {}, orderBy: { updatedAt: 'desc' }, take: 100, select: { id: true, nameEn: true, nameZh: true, unit: true, status: true } })
  return <div className="space-y-8"><WorkbenchHeader title="常用产品" description="只保留经常复用的产品。临时报价无需先在这里添加。"><Button asChild><Link href="/admin/quotation-products/new">添加常用产品</Link></Button></WorkbenchHeader><form className="flex max-w-lg gap-3"><Input name="search" aria-label="搜索产品" placeholder="搜索产品名称" defaultValue={search} /><Button variant="secondary">搜索</Button></form><div className="divide-y rounded-2xl border bg-white">{products.length ? products.map((product) => <Link key={product.id} href={`/admin/quotation-products/${product.id}`} className="flex items-center justify-between gap-4 p-5 hover:bg-slate-50"><div><h2 className="font-medium">{product.nameEn || product.nameZh}</h2><p className="mt-1 text-sm text-slate-500">单位：{product.unit}</p></div><span className="text-xs text-slate-500">{product.status === 'INACTIVE' ? '已停用' : '可使用'} →</span></Link>) : <p className="p-12 text-center text-slate-500">暂无常用产品，可以直接从新建报价开始。</p>}</div><p className="text-xs text-slate-500">最多显示最近 100 项，可按名称搜索。</p></div>
}
