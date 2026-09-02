'use server'

import type { Prisma } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { requireAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { QuotationError, type QuotationActionResult, toQuotationActionError } from '@/lib/quotation/errors'
import { assertQuotationWorkbenchEnabled } from '@/lib/quotation/feature'
import { allocateQuotationProductNumber } from '@/lib/quotation/numbering'
import { findQuotationProduct, searchQuotationProducts } from '@/lib/quotation/repositories/products'
import {
  createQuotationProductInputSchema,
  paginationInputSchema,
  quotationProductCostInputSchema,
  quotationProductStatusSchema,
  updateQuotationProductInputSchema,
} from '@/lib/quotation/schemas'
import { serializeQuotationData } from '@/lib/quotation/serialization'
import { writeQuotationAudit } from '@/lib/quotation/services/audit'

async function authorize(): Promise<{ id: string }> {
  assertQuotationWorkbenchEnabled()
  return requireAdmin()
}

function jsonArray(values: string[]): Prisma.InputJsonValue {
  return values
}

export async function listQuotationProducts(input: unknown): Promise<QuotationActionResult> {
  try {
    await authorize()
    const parsed = paginationInputSchema.extend({ status: quotationProductStatusSchema.optional() }).parse(input)
    const result = await searchQuotationProducts(parsed)
    return { success: true, reason: 'Quotation products loaded', data: serializeQuotationData(result) }
  } catch (error) {
    return toQuotationActionError(error)
  }
}

export async function getQuotationProduct(id: string): Promise<QuotationActionResult> {
  try {
    await authorize()
    const product = await findQuotationProduct(z.string().cuid().parse(id))
    if (!product) return { success: false, reason: 'Quotation product not found', code: 'NOT_FOUND' }
    return { success: true, reason: 'Quotation product loaded', data: serializeQuotationData(product) }
  } catch (error) {
    return toQuotationActionError(error)
  }
}

export async function createQuotationProduct(input: unknown): Promise<QuotationActionResult> {
  try {
    const actor = await authorize()
    const data = createQuotationProductInputSchema.parse(input)
    const product = await prisma.$transaction(async (transaction) => {
      const internalNumber = await allocateQuotationProductNumber(transaction)
      const created = await transaction.quotationProduct.create({
        data: {
          internalNumber,
          productId: data.productId,
          nameZh: data.nameZh,
          nameEn: data.nameEn,
          sku: data.sku,
          model: data.model,
          unit: data.unit,
          moq: data.moq,
          specifications: jsonArray(data.specifications),
          standards: jsonArray(data.standards),
          certificates: jsonArray(data.certificates),
          internalNotes: data.internalNotes,
          status: data.status,
        },
      })
      await writeQuotationAudit(transaction, {
        entityType: 'QuotationProduct', entityId: created.id, action: 'CREATE', actorId: actor.id,
      })
      return created
    })
    revalidatePath('/admin/quotation-products')
    return { success: true, reason: 'Quotation product created', data: serializeQuotationData(product) }
  } catch (error) {
    return toQuotationActionError(error)
  }
}

export async function updateQuotationProduct(input: unknown): Promise<QuotationActionResult> {
  try {
    const actor = await authorize()
    const data = updateQuotationProductInputSchema.parse(input)
    const product = await prisma.$transaction(async (transaction) => {
      const existing = await transaction.quotationProduct.findUnique({
        where: { id: data.id },
        select: { id: true },
      })
      if (!existing) return null
      const updated = await transaction.quotationProduct.update({
        where: { id: data.id },
        data: {
          productId: data.productId,
          nameZh: data.nameZh,
          nameEn: data.nameEn,
          sku: data.sku,
          model: data.model,
          unit: data.unit,
          moq: data.moq,
          specifications: jsonArray(data.specifications),
          standards: jsonArray(data.standards),
          certificates: jsonArray(data.certificates),
          internalNotes: data.internalNotes,
          status: data.status,
        },
      })
      await writeQuotationAudit(transaction, {
        entityType: 'QuotationProduct', entityId: updated.id, action: 'UPDATE', actorId: actor.id,
      })
      return updated
    })
    if (!product) return { success: false, reason: 'Quotation product not found', code: 'NOT_FOUND' }
    revalidatePath('/admin/quotation-products')
    revalidatePath(`/admin/quotation-products/${data.id}`)
    return { success: true, reason: 'Quotation product updated', data: serializeQuotationData(product) }
  } catch (error) {
    return toQuotationActionError(error)
  }
}

export async function archiveQuotationProduct(id: string): Promise<QuotationActionResult> {
  try {
    const actor = await authorize()
    const productId = z.string().cuid().parse(id)
    const changed = await prisma.$transaction(async (transaction) => {
      const result = await transaction.quotationProduct.updateMany({
        where: { id: productId, status: { not: 'INACTIVE' } },
        data: { status: 'INACTIVE' },
      })
      if (result.count === 0) return false
      await writeQuotationAudit(transaction, {
        entityType: 'QuotationProduct', entityId: productId, action: 'ARCHIVE', actorId: actor.id,
      })
      return true
    })
    if (!changed) return { success: false, reason: 'Quotation product not found or already inactive', code: 'NOT_FOUND' }
    revalidatePath('/admin/quotation-products')
    return { success: true, reason: 'Quotation product archived' }
  } catch (error) {
    return toQuotationActionError(error)
  }
}

export async function deleteUnusedQuotationProduct(id: string): Promise<QuotationActionResult> {
  try {
    const actor = await authorize()
    const productId = z.string().cuid().parse(id)
    const deleted = await prisma.$transaction(async (transaction) => {
      const product = await transaction.quotationProduct.findUnique({
        where: { id: productId }, select: { id: true, status: true },
      })
      if (!product || product.status !== 'DRAFT') return false
      const references = await transaction.salesQuotationItem.count({
        where: { quotationProductId: productId },
      })
      if (references > 0) return false
      await writeQuotationAudit(transaction, {
        entityType: 'QuotationProduct', entityId: productId, action: 'ARCHIVE', actorId: actor.id,
      })
      await transaction.quotationProduct.delete({ where: { id: productId } })
      return true
    })
    if (!deleted) return { success: false, reason: 'Only unused draft products can be deleted', code: 'REFERENCED_RECORD' }
    revalidatePath('/admin/quotation-products')
    return { success: true, reason: 'Unused quotation product deleted' }
  } catch (error) {
    return toQuotationActionError(error)
  }
}

export async function addQuotationProductCost(input: unknown): Promise<QuotationActionResult> {
  try {
    const actor = await authorize()
    const data = quotationProductCostInputSchema.parse(input)
    const cost = await prisma.$transaction(async (transaction) => {
      const product = await transaction.quotationProduct.findUnique({ where: { id: data.quotationProductId }, select: { id: true } })
      if (!product) throw new QuotationError('NOT_FOUND', 'Quotation product not found')
      const created = await transaction.quotationProductCostRecord.create({
        data: {
          quotationProductId: data.quotationProductId,
          amount: data.amount,
          currency: data.currency,
          exchangeRate: data.exchangeRate,
          effectiveAt: data.effectiveAt,
          notes: data.notes,
        },
      })
      await writeQuotationAudit(transaction, {
        entityType: 'QuotationProductCostRecord', entityId: created.id, action: 'CREATE', actorId: actor.id,
        metadata: { quotationProductId: data.quotationProductId },
      })
      return created
    })
    revalidatePath(`/admin/quotation-products/${data.quotationProductId}`)
    return { success: true, reason: 'Cost record added', data: serializeQuotationData(cost) }
  } catch (error) {
    return toQuotationActionError(error)
  }
}

export async function attachQuotationProductImage(input: unknown): Promise<QuotationActionResult> {
  try {
    const actor = await authorize()
    const data = z.object({ quotationProductId: z.string().cuid(), sourceFileId: z.string().uuid() }).parse(input)
    const image = await prisma.$transaction(async (transaction) => {
      const [product, source] = await Promise.all([
        transaction.quotationProduct.findUnique({ where: { id: data.quotationProductId }, select: { id: true } }),
        transaction.quotationSourceFile.findUnique({ where: { id: data.sourceFileId } }),
      ])
      if (!product) throw new QuotationError('NOT_FOUND', 'Quotation product not found')
      if (!source || source.deletedAt || source.securityStatus !== 'CLEAN' || !source.contentType.startsWith('image/')) {
        throw new QuotationError('FILE_NOT_CLEAN', 'A clean private image source is required')
      }
      const existing = await transaction.quotationProductImage.findFirst({
        where: { quotationProductId: data.quotationProductId, sha256: source.sha256 }, select: { id: true },
      })
      if (existing) return existing
      const created = await transaction.quotationProductImage.create({
        data: {
          quotationProductId: data.quotationProductId,
          sourceFileId: source.id,
          displayName: source.displayName,
          objectKey: source.objectKey,
          contentType: source.contentType,
          sizeBytes: source.sizeBytes,
          sha256: source.sha256,
          isCustomerVisible: true,
        },
      })
      await writeQuotationAudit(transaction, {
        entityType: 'QuotationProductImage', entityId: created.id, action: 'CREATE', actorId: actor.id,
        metadata: { quotationProductId: data.quotationProductId },
      })
      return created
    })
    revalidatePath(`/admin/quotation-products/${data.quotationProductId}`)
    return { success: true, reason: 'Product image attached', data: serializeQuotationData(image) }
  } catch (error) {
    return toQuotationActionError(error)
  }
}

export async function addQuotationProductSource(input: unknown): Promise<QuotationActionResult> {
  try {
    const actor = await authorize()
    const data = z.object({
      quotationProductId: z.string().cuid(),
      sourceType: z.string().trim().min(1).max(80),
      supplierName: z.string().trim().max(240).nullish(),
      sourceUrl: z.string().trim().url().max(2000).nullish(),
      notes: z.string().trim().max(4000).nullish(),
    }).parse(input)
    const source = await prisma.$transaction(async (transaction) => {
      const product = await transaction.quotationProduct.findUnique({ where: { id: data.quotationProductId }, select: { id: true } })
      if (!product) throw new QuotationError('NOT_FOUND', 'Quotation product not found')
      const created = await transaction.quotationProductSource.create({ data })
      await writeQuotationAudit(transaction, {
        entityType: 'QuotationProductSource', entityId: created.id, action: 'CREATE', actorId: actor.id,
        metadata: { quotationProductId: data.quotationProductId },
      })
      return created
    })
    revalidatePath(`/admin/quotation-products/${data.quotationProductId}`)
    return { success: true, reason: 'Product source added', data: serializeQuotationData(source) }
  } catch (error) {
    return toQuotationActionError(error)
  }
}
