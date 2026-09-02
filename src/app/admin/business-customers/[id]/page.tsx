import { notFound } from 'next/navigation'

import { CustomerForm } from '@/components/admin/quotation/customer-form'
import { requireAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { isQuotationWorkbenchEnabled } from '@/lib/quotation/feature'

export default async function BusinessCustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  if (!isQuotationWorkbenchEnabled()) notFound()
  await requireAdmin()
  const { id } = await params
  const customer = await prisma.businessCustomer.findUnique({ where: { id }, include: { contacts: { orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }] } } })
  if (!customer) notFound()
  return <div className="space-y-6"><header><p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Business customer</p><h1 className="mt-1 font-serif text-3xl">{customer.companyName}</h1></header><CustomerForm initialValue={{ id: customer.id, companyName: customer.companyName, countryCode: customer.countryCode, email: customer.email, phone: customer.phone, address: customer.address, notes: customer.notes, isActive: customer.isActive, contacts: customer.contacts.map((contact) => ({ id: contact.id, name: contact.name, title: contact.title, email: contact.email, phone: contact.phone, isPrimary: contact.isPrimary })) }} /></div>
}

