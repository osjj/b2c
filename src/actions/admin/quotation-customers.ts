'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { assertQuotationWorkbenchEnabled } from '@/lib/quotation/feature'
import { QuotationError, toQuotationActionError } from '@/lib/quotation/errors'
import { customerDirectorySchema, customerProfileKey } from '@/lib/quotation/customer-directory'
import { writeQuotationAudit } from '@/lib/quotation/services/audit'

export async function saveQuotationCustomer(input: unknown) {
  try {
    assertQuotationWorkbenchEnabled()
    const actor = await requireAdmin()
    const data = customerDirectorySchema.parse(input)
    const id = await prisma.$transaction(async (tx) => {
      const fields = { companyName: data.name, countryCode: data.country || null, email: data.email || null, phone: data.phone || null, notes: data.notes || null, isActive: data.active }
      let id = data.id
      if (id) {
        if (!data.expectedUpdatedAt) throw new QuotationError('VERSION_CONFLICT', '请刷新客户资料后重试')
        const changed = await tx.businessCustomer.updateMany({ where: { id, updatedAt: new Date(data.expectedUpdatedAt) }, data: fields })
        if (changed.count !== 1) throw new QuotationError('VERSION_CONFLICT', '客户资料已更新，请刷新后保存')
      } else id = (await tx.businessCustomer.create({ data: fields })).id
      const key = customerProfileKey(id)
      const value = { company: data.company, gender: data.gender }
      await tx.setting.upsert({ where: { key }, create: { key, value }, update: { value } })
      await writeQuotationAudit(tx, { entityType: 'BusinessCustomer', entityId: id, action: data.id ? 'UPDATE' : 'CREATE', actorId: actor.id })
      return id
    })
    revalidatePath('/admin/business-customers'); revalidatePath(`/admin/business-customers/${id}`)
    return { success: true as const, reason: '客户资料已保存', data: { id } }
  } catch (error) { return toQuotationActionError(error) }
}
