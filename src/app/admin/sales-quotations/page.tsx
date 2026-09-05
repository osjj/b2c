import Link from 'next/link'
import { notFound } from 'next/navigation'
import { z } from 'zod'
import type { Prisma } from '@prisma/client'
import { requireAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { isQuotationWorkbenchEnabled } from '@/lib/quotation/feature'
import { revisionStatusLabel } from '@/lib/quotation/workbench-config'
import { WorkbenchHeader } from '@/components/admin/quotation/workbench-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Pagination } from '@/components/admin/pagination'

export default async function QuotationsPage({ searchParams }: { searchParams: Promise<{ page?: string; search?: string }> }) {
  if (!isQuotationWorkbenchEnabled()) notFound()
  await requireAdmin()
  const params = await searchParams
  const page = z.coerce.number().int().min(1).max(100000).catch(1).parse(params.page)
  const search = (params.search || '').trim().slice(0, 200)
  const where: Prisma.SalesQuotationWhereInput = search ? { OR: [{ quotationNumber: { contains: search, mode: 'insensitive' } }, { revisions: { some: { customerSnapshot: { path: ['companyName'], string_contains: search, mode: 'insensitive' } } } }] } : {}
  const [quotations, count] = await Promise.all([
    prisma.salesQuotation.findMany({ where, orderBy: { updatedAt: 'desc' }, skip: (page - 1) * 20, take: 20, include: { revisions: { orderBy: { revisionNumber: 'desc' }, take: 1, include: { _count: { select: { items: true } } } } } }),
    prisma.salesQuotation.count({ where }),
  ])
  return <div className="space-y-8"><WorkbenchHeader title="报价单" description="录入、预览、生成。从一份简单的报价开始。"><Button asChild className="bg-slate-900 text-white"><Link href="/admin/sales-quotations/new">＋ 新建报价</Link></Button></WorkbenchHeader><form className="flex max-w-xl gap-3"><Input name="search" aria-label="搜索报价" placeholder="搜索客户名称或报价编号" defaultValue={search} /><Button variant="secondary">搜索</Button></form><div className="overflow-x-auto rounded-2xl border bg-white">{quotations.length ? <table className="w-full text-sm"><thead className="border-b bg-slate-50 text-left text-slate-500"><tr><th className="p-5">客户 / 报价编号</th><th>日期</th><th>产品</th><th>状态</th><th className="p-5 text-right">报价金额</th></tr></thead><tbody>{quotations.map((quotation) => { const revision = quotation.revisions[0]; if (!revision) return null; const customer = z.object({ companyName: z.string() }).parse(revision.customerSnapshot); return <tr key={quotation.id} className="border-b last:border-0 hover:bg-slate-50"><td className="p-5"><Link className="font-semibold hover:underline" href={`/admin/sales-quotations/${quotation.id}`}>{customer.companyName}</Link><p className="mt-1 font-mono text-xs text-slate-500">{quotation.quotationNumber} · R{revision.revisionNumber}</p></td><td>{revision.quotationDate.toISOString().slice(0, 10)}</td><td>{revision._count.items} 项</td><td><span className="rounded-full bg-teal-50 px-3 py-1 text-xs text-teal-800">{revisionStatusLabel(revision.state)}</span></td><td className="p-5 text-right font-semibold tabular-nums">{revision.currency} {revision.total.toString()}</td></tr> })}</tbody></table> : <div className="p-16 text-center"><h2 className="text-lg font-semibold">{search ? '没有找到匹配的报价' : '开始你的第一份报价'}</h2><p className="mt-2 text-sm text-slate-500">填写客户名称和产品明细即可，不用先维护客户库或产品库。</p></div>}</div><Pagination page={page} total={count} totalPages={Math.ceil(count / 20)} /></div>
}
