import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { isQuotationWorkbenchEnabled } from '@/lib/quotation/feature'
import { customerProfileKey, directoryCustomer } from '@/lib/quotation/customer-directory'
import { WorkbenchHeader } from '@/components/admin/quotation/workbench-header'
import { Pagination } from '@/components/admin/pagination'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default async function BusinessCustomersPage({ searchParams }: { searchParams: Promise<{ page?: string; search?: string }> }) {
  if (!isQuotationWorkbenchEnabled()) notFound()
  await requireAdmin()
  const params = await searchParams
  const search = (params.search || '').trim().slice(0, 200)
  const page = Math.min(100000, Math.max(1, Math.floor(Number(params.page) || 1)))
  const where = search ? { OR: [{ companyName: { contains: search, mode: 'insensitive' as const } }, { email: { contains: search, mode: 'insensitive' as const } }, { phone: { contains: search } }, { countryCode: { contains: search, mode: 'insensitive' as const } }] } : {}
  const [rows, total] = await Promise.all([prisma.businessCustomer.findMany({ where, orderBy: { updatedAt: 'desc' }, take: 20, skip: (page - 1) * 20 }), prisma.businessCustomer.count({ where })])
  const profiles = await prisma.setting.findMany({ where: { key: { in: rows.map((row) => customerProfileKey(row.id)) } } })
  const customers = rows.map((row) => directoryCustomer(row, profiles.find((entry) => entry.key === customerProfileKey(row.id))?.value))
  return <div className="space-y-6"><WorkbenchHeader title="客户列表" description="姓名必填，其余按需填写。与商城用户账号独立维护。"><Button asChild><Link href="/admin/business-customers/new">添加客户</Link></Button></WorkbenchHeader>
    <form className="flex max-w-xl gap-3"><Input aria-label="搜索客户" name="search" defaultValue={search} placeholder="搜索名字、国家、邮箱或电话" /><Button variant="secondary">搜索</Button></form>
    <div className="overflow-x-auto rounded-2xl border bg-white"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-slate-500"><tr>{['客户名字', '国家', '邮箱', '电话 / WhatsApp', '性别', '公司', '备注', '状态'].map((label) => <th key={label} className="whitespace-nowrap px-4 py-4 font-medium">{label}</th>)}</tr></thead><tbody>{customers.map((customer) => <tr key={customer.id} className="border-t"><td className="px-4 py-5 font-medium"><Link className="text-teal-800 hover:underline" href={`/admin/business-customers/${customer.id}`}>{customer.name}</Link></td>{[customer.country, customer.email, customer.phone, ({ '': '', MALE: '男', FEMALE: '女', OTHER: '其他' })[customer.gender], customer.company, customer.notes, customer.active ? '启用' : '停用'].map((value, index) => <td key={index} className="max-w-64 px-4 py-5"><p className="line-clamp-2 break-words" title={value}>{value || '—'}</p></td>)}</tr>)}</tbody></table>{!customers.length && <p className="p-12 text-center text-slate-500">暂无客户，添加名字即可保存。</p>}</div>
    <Pagination page={page} total={total} totalPages={Math.ceil(total / 20)} /></div>
}
