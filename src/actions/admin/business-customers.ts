'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { requireAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { assertQuotationWorkbenchEnabled } from '@/lib/quotation/feature'
import { toQuotationActionError, type QuotationActionResult } from '@/lib/quotation/errors'
import { findBusinessCustomer, searchBusinessCustomers } from '@/lib/quotation/repositories/customers'
import {
  createBusinessCustomerInputSchema,
  paginationInputSchema,
  updateBusinessCustomerInputSchema,
} from '@/lib/quotation/schemas'
import { serializeQuotationData } from '@/lib/quotation/serialization'
import { writeQuotationAudit } from '@/lib/quotation/services/audit'

async function authorize(): Promise<{ id: string }> {
  assertQuotationWorkbenchEnabled()
  return requireAdmin()
}

export async function listBusinessCustomers(input: unknown): Promise<QuotationActionResult> {
  try {
    await authorize()
    const parsed = paginationInputSchema.extend({ isActive: z.boolean().optional() }).parse(input)
    const result = await searchBusinessCustomers(parsed)
    return { success: true, reason: 'Business customers loaded', data: serializeQuotationData(result) }
  } catch (error) {
    return toQuotationActionError(error)
  }
}

export async function getBusinessCustomer(id: string): Promise<QuotationActionResult> {
  try {
    await authorize()
    const customer = await findBusinessCustomer(z.string().cuid().parse(id))
    if (!customer) return { success: false, reason: 'Business customer not found', code: 'NOT_FOUND' }
    return { success: true, reason: 'Business customer loaded', data: serializeQuotationData(customer) }
  } catch (error) {
    return toQuotationActionError(error)
  }
}

export async function createBusinessCustomer(input: unknown): Promise<QuotationActionResult> {
  try {
    const actor = await authorize()
    const data = createBusinessCustomerInputSchema.parse(input)
    const possibleDuplicate = await prisma.businessCustomer.findFirst({
      where: {
        OR: [
          { companyName: { equals: data.companyName, mode: 'insensitive' as const } },
          ...(data.email ? [{ email: { equals: data.email, mode: 'insensitive' as const } }] : []),
        ],
      },
      select: { companyName: true },
    })
    const customer = await prisma.$transaction(async (transaction) => {
      const created = await transaction.businessCustomer.create({
        data: {
          companyName: data.companyName,
          countryCode: data.countryCode,
          email: data.email,
          phone: data.phone,
          address: data.address,
          notes: data.notes,
          isActive: data.isActive,
          contacts: { create: data.contacts },
        },
        include: { contacts: true },
      })
      await writeQuotationAudit(transaction, {
        entityType: 'BusinessCustomer', entityId: created.id, action: 'CREATE', actorId: actor.id,
      })
      return created
    })
    revalidatePath('/admin/business-customers')
    return { success: true, reason: possibleDuplicate ? `Business customer created; review possible duplicate: ${possibleDuplicate.companyName}` : 'Business customer created', data: serializeQuotationData(customer) }
  } catch (error) {
    return toQuotationActionError(error)
  }
}

export async function updateBusinessCustomer(input: unknown): Promise<QuotationActionResult> {
  try {
    const actor = await authorize()
    const data = updateBusinessCustomerInputSchema.parse(input)
    const exists = await prisma.businessCustomer.findUnique({ where: { id: data.id }, select: { id: true } })
    if (!exists) return { success: false, reason: 'Business customer not found', code: 'NOT_FOUND' }
    const customer = await prisma.$transaction(async (transaction) => {
      await transaction.businessCustomerContact.deleteMany({ where: { customerId: data.id } })
      const updated = await transaction.businessCustomer.update({
        where: { id: data.id },
        data: {
          companyName: data.companyName,
          countryCode: data.countryCode,
          email: data.email,
          phone: data.phone,
          address: data.address,
          notes: data.notes,
          isActive: data.isActive,
          contacts: {
            create: data.contacts.map((contact) => ({
              name: contact.name,
              title: contact.title,
              email: contact.email,
              phone: contact.phone,
              isPrimary: contact.isPrimary,
            })),
          },
        },
        include: { contacts: true },
      })
      await writeQuotationAudit(transaction, {
        entityType: 'BusinessCustomer', entityId: updated.id, action: 'UPDATE', actorId: actor.id,
      })
      return updated
    })
    revalidatePath('/admin/business-customers')
    revalidatePath(`/admin/business-customers/${data.id}`)
    return { success: true, reason: 'Business customer updated', data: serializeQuotationData(customer) }
  } catch (error) {
    return toQuotationActionError(error)
  }
}

export async function archiveBusinessCustomer(id: string): Promise<QuotationActionResult> {
  try {
    const actor = await authorize()
    const customerId = z.string().cuid().parse(id)
    const result = await prisma.$transaction(async (transaction) => {
      const updated = await transaction.businessCustomer.updateMany({
        where: { id: customerId, isActive: true }, data: { isActive: false },
      })
      if (updated.count === 0) return false
      await writeQuotationAudit(transaction, {
        entityType: 'BusinessCustomer', entityId: customerId, action: 'ARCHIVE', actorId: actor.id,
      })
      return true
    })
    if (!result) return { success: false, reason: 'Business customer not found or already archived', code: 'NOT_FOUND' }
    revalidatePath('/admin/business-customers')
    return { success: true, reason: 'Business customer archived' }
  } catch (error) {
    return toQuotationActionError(error)
  }
}
