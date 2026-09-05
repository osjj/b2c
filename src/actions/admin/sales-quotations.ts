'use server'

import type { Prisma, SalesQuotationOutcomeStatus, SalesQuotationRevisionState } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { requireAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { type QuotationActionResult, QuotationError, toQuotationActionError } from '@/lib/quotation/errors'
import { assertQuotationWorkbenchEnabled } from '@/lib/quotation/feature'
import { calculateQuotationMoney } from '@/lib/quotation/money'
import { allocateQuotationNumber } from '@/lib/quotation/numbering'
import { findSalesQuotation, searchSalesQuotations } from '@/lib/quotation/repositories/quotations'
import {
  createSalesQuotationInputSchema,
  paginationInputSchema,
  transitionRevisionInputSchema,
  updateSalesQuotationInputSchema,
} from '@/lib/quotation/schemas'
import { serializeQuotationData } from '@/lib/quotation/serialization'
import { writeQuotationAudit } from '@/lib/quotation/services/audit'
import { finalizeQuotationRevision } from '@/lib/quotation/services/finalize'
import { attachCleanSourceImageToQuotationItem } from '@/lib/quotation/services/item-assets'
import { reconcileExpiredFinalizationAttempts } from '@/lib/quotation/services/reconcile-finalization'
import {
  copyIssuedQuotationRevision,
  copyWorkbenchQuotation,
  copyQuotationToNewCustomer,
  setQuotationOutcome,
  voidAndCopyFinalizedQuotationRevision,
} from '@/lib/quotation/services/revision-operations'
import { assertEditableRevision, assertRevisionTransition } from '@/lib/quotation/state-machine'
import { readWorkbenchSettings, readBrandForSnapshot } from '@/lib/quotation/services/workbench-settings'
import { attachEditorImages } from '@/lib/quotation/services/editor-images'

async function authorize(): Promise<{ id: string }> {
  assertQuotationWorkbenchEnabled()
  return requireAdmin()
}

export async function copySimpleQuotation(input: unknown): Promise<QuotationActionResult> {
  try {
    const actor = await authorize()
    const data = z.object({ revisionId: z.string().cuid(), expectedVersion: z.number().int().positive(), newNumber: z.boolean() }).parse(input)
    const result = await copyWorkbenchQuotation(data, actor.id, data.newNumber)
    revalidatePath('/admin/sales-quotations')
    revalidatePath(`/admin/sales-quotations/${result.quotationId}`)
    return { success: true, reason: data.newNumber ? '已复制为新报价' : '已创建修订草稿，原文件保持不变', data: result }
  } catch (error) { return toQuotationActionError(error) }
}

function json(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue
}

function calculatedMoney(input: z.infer<typeof createSalesQuotationInputSchema>) {
  return calculateQuotationMoney({
    items: input.items,
    currency: input.currency,
    currencyMinorUnit: input.currencyMinorUnit,
    roundingMode: input.roundingMode,
    discountAmount: input.discountAmount,
    discountPercent: input.discountPercent,
    shippingFee: input.shippingFee,
    otherFee: input.otherFee,
    taxRate: input.taxRate,
    roundingAdjustment: input.roundingAdjustment,
  })
}

function itemCreateData(
  revisionId: string,
  items: ReturnType<typeof calculatedMoney>['items'],
): Prisma.SalesQuotationItemCreateManyInput[] {
  return items.map((item) => ({
    id: item.id,
    revisionId,
    quotationProductId: item.quotationProductId,
    productId: item.productId,
    sortOrder: item.sortOrder,
    nameZh: item.nameZh,
    nameEn: item.nameEn,
    model: item.model,
    sku: item.sku,
    specifications: json(item.specifications),
    unit: item.unit,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    discountAmount: item.discountAmount,
    discountPercent: item.discountPercent,
    lineTotal: item.lineTotal,
    unitCost: item.unitCost,
    costCurrency: item.costCurrency,
    exchangeRate: item.exchangeRate,
    lineCost: item.lineCost,
    internalNotes: item.internalNotes,
  }))
}

export async function listSalesQuotations(input: unknown): Promise<QuotationActionResult> {
  try {
    await authorize()
    const parsed = paginationInputSchema.extend({
      outcomeStatus: z.enum(['OPEN', 'ACCEPTED', 'REJECTED', 'CANCELLED']).optional(),
      revisionState: z.enum(['DRAFT', 'READY', 'FINALIZING', 'FINALIZED', 'ISSUED', 'SUPERSEDED', 'VOID']).optional(),
    }).parse(input)
    const result = await searchSalesQuotations({
      ...parsed,
      outcomeStatus: parsed.outcomeStatus as SalesQuotationOutcomeStatus | undefined,
      revisionState: parsed.revisionState as SalesQuotationRevisionState | undefined,
    })
    return { success: true, reason: 'Sales quotations loaded', data: serializeQuotationData(result) }
  } catch (error) {
    return toQuotationActionError(error)
  }
}

export async function getSalesQuotation(id: string): Promise<QuotationActionResult> {
  try {
    await authorize()
    const quotation = await findSalesQuotation(z.string().cuid().parse(id))
    if (!quotation) return { success: false, reason: 'Sales quotation not found', code: 'NOT_FOUND' }
    return { success: true, reason: 'Sales quotation loaded', data: serializeQuotationData(quotation) }
  } catch (error) {
    return toQuotationActionError(error)
  }
}

export async function createSalesQuotation(input: unknown): Promise<QuotationActionResult> {
  try {
    const actor = await authorize()
    const data = createSalesQuotationInputSchema.parse(input)
    const money = calculatedMoney(data)
    const settings = await readWorkbenchSettings()
    const brand = await readBrandForSnapshot(settings)
    const created = await prisma.$transaction(async (transaction) => {
      const customer = data.customerId ? await transaction.businessCustomer.findUnique({
        where: { id: data.customerId },
        include: { contacts: { orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }] } },
      }) : await transaction.businessCustomer.create({ data: { companyName: z.string().min(1).parse(data.customerName) }, include: { contacts: true } })
      if (!customer) throw new QuotationError('NOT_FOUND', 'Business customer not found')
      const quotationNumber = await allocateQuotationNumber(transaction)
      const quotation = await transaction.salesQuotation.create({
        data: {
          quotationNumber,
          customerId: customer.id,
          createdBy: actor.id,
        },
      })
      const revision = await transaction.salesQuotationRevision.create({
        data: {
          salesQuotationId: quotation.id,
          revisionNumber: 1,
          templateVersion: 'presentation-v2',
          documentLanguage: data.documentLanguage,
          quotationDate: data.quotationDate,
          validUntil: data.validUntil,
          currency: data.currency,
          currencyMinorUnit: data.currencyMinorUnit,
          roundingMode: data.roundingMode,
          customerSnapshot: json(data.customerName ? { companyName: data.customerName, contacts: [], quotationBrand: brand } : { ...customer, quotationBrand: brand }),
          publicTerms: json(data.publicTerms),
          internalNotes: data.internalNotes,
          subtotal: money.subtotal,
          discountAmount: money.discountAmount,
          discountPercent: data.discountPercent,
          shippingFee: money.shippingFee,
          otherFee: money.otherFee,
          taxRate: data.taxRate,
          taxAmount: money.taxAmount,
          roundingAdjustment: money.roundingAdjustment,
          total: money.total,
          totalCost: money.totalCost,
          profit: money.profit,
          createdBy: actor.id,
        },
      })
      await transaction.salesQuotationItem.createMany({ data: itemCreateData(revision.id, money.items) })
      if (data.items.some((item) => item.imageAssetIds?.length)) throw new QuotationError('VALIDATION_FAILED', 'Existing line images cannot be attached to a new quotation')
      await attachEditorImages(transaction, quotation.id, revision.id, data.items)
      await writeQuotationAudit(transaction, {
        salesQuotationId: quotation.id,
        entityType: 'SalesQuotation',
        entityId: quotation.id,
        action: 'CREATE',
        actorId: actor.id,
        metadata: json({ revisionId: revision.id }),
      })
      const items = await transaction.salesQuotationItem.findMany({ where: { revisionId: revision.id }, orderBy: { sortOrder: 'asc' }, select: { id: true, assets: { orderBy: { sortOrder: 'asc' }, select: { id: true, displayName: true } } } })
      return { quotationId: quotation.id, revisionId: revision.id, quotationNumber, version: 1, items }
    })
    revalidatePath('/admin/sales-quotations')
    return { success: true, reason: 'Sales quotation created', data: created }
  } catch (error) {
    return toQuotationActionError(error)
  }
}

export async function updateSalesQuotation(input: unknown): Promise<QuotationActionResult> {
  try {
    const actor = await authorize()
    const data = updateSalesQuotationInputSchema.parse(input)
    const money = calculatedMoney(data)
    const settings = await readWorkbenchSettings()
    const currentBrand = await readBrandForSnapshot(settings)
    const result = await prisma.$transaction(async (transaction) => {
      const existing = await transaction.salesQuotationRevision.findUnique({
        where: { id: data.revisionId },
        select: {
          id: true,
          salesQuotationId: true,
          state: true,
          version: true,
          customerSnapshot: true,
          salesQuotation: { select: { customerId: true } },
        },
      })
      if (!existing) throw new QuotationError('NOT_FOUND', 'Quotation revision not found')
      assertEditableRevision(existing.state)
      if (existing.version !== data.expectedVersion) {
        throw new QuotationError('VERSION_CONFLICT', 'Quotation revision was changed by another editor')
      }
      if (data.customerId && existing.salesQuotation.customerId !== data.customerId) {
        throw new QuotationError(
          'INVALID_STATE_TRANSITION',
          'Changing the customer requires copying to a new quotation number',
        )
      }

      const customer = await transaction.businessCustomer.findUnique({
        where: { id: existing.salesQuotation.customerId }, include: { contacts: true },
      })
      if (!customer) throw new QuotationError('NOT_FOUND', 'Business customer not found')
      const existingItems = await transaction.salesQuotationItem.findMany({
        where: { revisionId: data.revisionId },
        include: { assets: true },
      })
      const existingItemIds = new Set(existingItems.map((item) => item.id))
      const submittedIds = data.items.flatMap((item) => item.id ? [item.id] : [])
      if (new Set(submittedIds).size !== submittedIds.length || submittedIds.some((id) => !existingItemIds.has(id))) {
        throw new QuotationError('VALIDATION_FAILED', 'Quotation item identifiers do not belong to this revision')
      }
      const preservedAssets = existingItems.flatMap((item) => {
        const submitted = data.items.find((entry) => entry.id === item.id)
        if (!submitted) return []
        if (submitted.imageAssetIds === undefined) return item.assets
        if (new Set(submitted.imageAssetIds).size !== submitted.imageAssetIds.length || submitted.imageAssetIds.some((id) => !item.assets.some((asset) => asset.id === id))) {
          throw new QuotationError('VALIDATION_FAILED', 'Image identifiers do not belong to this quotation line')
        }
        if (submitted.imageAssetIds.length + (submitted.imageSourceIds?.length ?? 0) > 8) throw new QuotationError('VALIDATION_FAILED', '每个产品最多 8 张图片')
        return item.assets.filter((asset) => submitted.imageAssetIds?.includes(asset.id))
      })
      if (data.items.some((item) => !item.id && item.imageAssetIds?.length)) throw new QuotationError('VALIDATION_FAILED', 'New lines cannot reuse another line image identifier')
      const updated = await transaction.salesQuotationRevision.updateMany({
        where: { id: data.revisionId, version: data.expectedVersion, state: { in: ['DRAFT', 'READY'] } },
        data: {
          version: { increment: 1 },
          templateVersion: 'presentation-v2',
          documentLanguage: data.documentLanguage,
          quotationDate: data.quotationDate,
          validUntil: data.validUntil,
          currency: data.currency,
          currencyMinorUnit: data.currencyMinorUnit,
          roundingMode: data.roundingMode,
          customerSnapshot: json(data.customerName ? { companyName: data.customerName, contacts: [], quotationBrand: currentBrand } : { ...customer, quotationBrand: currentBrand }),
          publicTerms: json(data.publicTerms),
          internalNotes: data.internalNotes,
          subtotal: money.subtotal,
          discountAmount: money.discountAmount,
          discountPercent: data.discountPercent,
          shippingFee: money.shippingFee,
          otherFee: money.otherFee,
          taxRate: data.taxRate,
          taxAmount: money.taxAmount,
          roundingAdjustment: money.roundingAdjustment,
          total: money.total,
          totalCost: money.totalCost,
          profit: money.profit,
        },
      })
      if (updated.count !== 1) throw new QuotationError('VERSION_CONFLICT', 'Quotation revision changed while saving')
      await transaction.salesQuotationItemAsset.deleteMany({
        where: { item: { revisionId: data.revisionId } },
      })
      await transaction.salesQuotationItem.deleteMany({ where: { revisionId: data.revisionId } })
      await transaction.salesQuotationItem.createMany({ data: itemCreateData(data.revisionId, money.items) })
      if (preservedAssets.length) {
        await transaction.salesQuotationItemAsset.createMany({
          data: preservedAssets.map((asset) => ({
            id: asset.id,
            itemId: asset.itemId,
            sourceFileId: asset.sourceFileId,
            assetType: asset.assetType,
            displayName: asset.displayName,
            objectKey: asset.objectKey,
            contentType: asset.contentType,
            sizeBytes: asset.sizeBytes,
            sha256: asset.sha256,
            sortOrder: asset.sortOrder,
          })),
        })
      }
      await writeQuotationAudit(transaction, {
        salesQuotationId: existing.salesQuotationId,
        entityType: 'SalesQuotationRevision',
        entityId: data.revisionId,
        action: 'UPDATE',
        actorId: actor.id,
        metadata: json({ fromVersion: data.expectedVersion, toVersion: data.expectedVersion + 1 }),
      })
      await attachEditorImages(transaction, existing.salesQuotationId, data.revisionId, data.items)
      await transaction.salesQuotation.update({ where: { id: existing.salesQuotationId }, data: { updatedAt: new Date() } })
      const items = await transaction.salesQuotationItem.findMany({ where: { revisionId: data.revisionId }, orderBy: { sortOrder: 'asc' }, select: { id: true, assets: { orderBy: { sortOrder: 'asc' }, select: { id: true, displayName: true } } } })
      return { quotationId: existing.salesQuotationId, revisionId: data.revisionId, version: data.expectedVersion + 1, items }
    })
    revalidatePath('/admin/sales-quotations')
    revalidatePath(`/admin/sales-quotations/${result.quotationId}`)
    return { success: true, reason: 'Sales quotation saved', data: result }
  } catch (error) {
    return toQuotationActionError(error)
  }
}

export async function transitionSalesQuotationRevision(input: unknown): Promise<QuotationActionResult> {
  try {
    const actor = await authorize()
    const data = transitionRevisionInputSchema.parse(input)
    const result = await prisma.$transaction(async (transaction) => {
      const revision = await transaction.salesQuotationRevision.findUnique({
        where: { id: data.revisionId },
        select: { id: true, salesQuotationId: true, revisionNumber: true, state: true, version: true },
      })
      if (!revision) throw new QuotationError('NOT_FOUND', 'Quotation revision not found')
      if (revision.version !== data.expectedVersion) throw new QuotationError('VERSION_CONFLICT', 'Quotation revision changed')
      assertRevisionTransition(revision.state, data.targetState)
      if (data.targetState === 'FINALIZING' || data.targetState === 'FINALIZED' || data.targetState === 'SUPERSEDED') {
        throw new QuotationError('INVALID_STATE_TRANSITION', 'Use finalization to create formal documents')
      }
      if (data.targetState === 'ISSUED') {
        await transaction.$queryRaw`SELECT "id" FROM "sales_quotations" WHERE "id" = ${revision.salesQuotationId} FOR UPDATE`
        const [quotation, documentCount] = await Promise.all([
          transaction.salesQuotation.findUnique({
            where: { id: revision.salesQuotationId },
            select: { outcomeStatus: true },
          }),
          transaction.salesQuotationDocument.count({
            where: { revisionId: revision.id, documentType: { in: ['CUSTOMER_PDF', 'CUSTOMER_EXCEL'] } },
          }),
        ])
        if (quotation?.outcomeStatus !== 'OPEN') {
          throw new QuotationError('INVALID_STATE_TRANSITION', 'Only an open quotation can be issued')
        }
        if (documentCount !== 2) {
          throw new QuotationError('DOCUMENT_VALIDATION_FAILED', 'Validated customer PDF and Excel are required before issue')
        }
        const newestRevision = await transaction.salesQuotationRevision.findFirst({
          where: { salesQuotationId: revision.salesQuotationId },
          orderBy: { revisionNumber: 'desc' },
          select: { id: true },
        })
        if (newestRevision?.id !== revision.id) {
          throw new QuotationError('INVALID_STATE_TRANSITION', 'Only the latest quotation revision can be issued')
        }
      }
      const updated = await transaction.salesQuotationRevision.updateMany({
        where: { id: data.revisionId, version: data.expectedVersion, state: revision.state },
        data: {
          state: data.targetState,
          version: { increment: 1 },
          issuedAt: data.targetState === 'ISSUED' ? new Date() : undefined,
        },
      })
      if (updated.count !== 1) throw new QuotationError('VERSION_CONFLICT', 'Quotation revision changed')
      if (data.targetState === 'ISSUED') {
        const superseded = await transaction.salesQuotationRevision.findMany({
          where: { salesQuotationId: revision.salesQuotationId, id: { not: revision.id }, state: 'ISSUED' },
          select: { id: true },
        })
        if (superseded.length) {
          await transaction.salesQuotationRevision.updateMany({
            where: { id: { in: superseded.map((entry) => entry.id) }, state: 'ISSUED' },
            data: { state: 'SUPERSEDED', version: { increment: 1 } },
          })
        }
      }
      await writeQuotationAudit(transaction, {
        salesQuotationId: revision.salesQuotationId,
        entityType: 'SalesQuotationRevision', entityId: revision.id,
        action: data.targetState === 'ISSUED' ? 'ISSUE' : data.targetState === 'VOID' ? 'VOID' : 'STATE_CHANGE',
        actorId: actor.id,
        metadata: json({ from: revision.state, to: data.targetState }),
      })
      return { quotationId: revision.salesQuotationId, version: data.expectedVersion + 1, state: data.targetState }
    })
    revalidatePath('/admin/sales-quotations')
    revalidatePath(`/admin/sales-quotations/${result.quotationId}`)
    return { success: true, reason: 'Quotation state updated', data: result }
  } catch (error) {
    return toQuotationActionError(error)
  }
}

export async function finalizeSalesQuotation(input: unknown): Promise<QuotationActionResult> {
  try {
    const actor = await authorize()
    const result = await finalizeQuotationRevision(input, actor.id)
    revalidatePath('/admin/sales-quotations')
    revalidatePath(`/admin/sales-quotations/${result.quotationId}`)
    return {
      success: true,
      reason: result.status === 'FINALIZED' ? 'Quotation finalized' : 'Quotation finalization is already in progress',
      data: result,
    }
  } catch (error) {
    return toQuotationActionError(error)
  }
}

export async function copySalesQuotationRevision(input: unknown): Promise<QuotationActionResult> {
  try {
    const actor = await authorize()
    const result = await copyIssuedQuotationRevision(input, actor.id)
    revalidatePath('/admin/sales-quotations')
    revalidatePath(`/admin/sales-quotations/${result.quotationId}`)
    return { success: true, reason: 'Quotation revision created', data: result }
  } catch (error) {
    return toQuotationActionError(error)
  }
}

export async function copySalesQuotationToCustomer(input: unknown): Promise<QuotationActionResult> {
  try {
    const actor = await authorize()
    const result = await copyQuotationToNewCustomer(input, actor.id)
    revalidatePath('/admin/sales-quotations')
    return { success: true, reason: 'Quotation copied to a new customer', data: result }
  } catch (error) {
    return toQuotationActionError(error)
  }
}

export async function voidAndCopySalesQuotationRevision(input: unknown): Promise<QuotationActionResult> {
  try {
    const actor = await authorize()
    const result = await voidAndCopyFinalizedQuotationRevision(input, actor.id)
    revalidatePath('/admin/sales-quotations')
    revalidatePath(`/admin/sales-quotations/${result.quotationId}`)
    return { success: true, reason: 'Finalized revision voided and copied for correction', data: result }
  } catch (error) {
    return toQuotationActionError(error)
  }
}

export async function setSalesQuotationOutcome(input: unknown): Promise<QuotationActionResult> {
  try {
    const actor = await authorize()
    const result = await setQuotationOutcome(input, actor.id)
    revalidatePath('/admin/sales-quotations')
    revalidatePath(`/admin/sales-quotations/${result.quotationId}`)
    return { success: true, reason: 'Quotation outcome updated', data: result }
  } catch (error) {
    return toQuotationActionError(error)
  }
}

export async function attachSalesQuotationItemAsset(input: unknown): Promise<QuotationActionResult> {
  try {
    const actor = await authorize()
    const result = await attachCleanSourceImageToQuotationItem(input, actor.id)
    revalidatePath(`/admin/sales-quotations/${result.quotationId}`)
    return { success: true, reason: 'Customer image attached to quotation item', data: result }
  } catch (error) {
    return toQuotationActionError(error)
  }
}

export async function reconcileFinalizingQuotations(input: unknown): Promise<QuotationActionResult> {
  try {
    const actor = await authorize()
    const result = await reconcileExpiredFinalizationAttempts(input, actor.id)
    revalidatePath('/admin/sales-quotations')
    return { success: true, reason: 'Expired finalization attempts reconciled', data: result }
  } catch (error) {
    return toQuotationActionError(error)
  }
}
