import type { Prisma } from '@prisma/client'

import { prisma } from '@/lib/prisma'

import { QuotationError } from '../errors'
import { allocateQuotationNumber } from '../numbering'
import {
  copyQuotationRevisionInputSchema,
  copyQuotationToCustomerInputSchema,
  setQuotationOutcomeInputSchema,
  voidAndCopyQuotationRevisionInputSchema,
} from '../schemas'
import { writeQuotationAudit } from './audit'

type Transaction = Prisma.TransactionClient

const revisionCopyInclude = {
  items: { orderBy: { sortOrder: 'asc' as const }, include: { assets: { orderBy: { sortOrder: 'asc' as const } } } },
  salesQuotation: { select: { id: true, customerId: true, outcomeStatus: true } },
} satisfies Prisma.SalesQuotationRevisionInclude

type RevisionToCopy = Prisma.SalesQuotationRevisionGetPayload<{ include: typeof revisionCopyInclude }>

function json(value: Prisma.JsonValue | null): Prisma.InputJsonValue | undefined {
  if (value === null) return undefined
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue
}

function revisionCreateData(source: RevisionToCopy, actorId: string, customerSnapshot?: Prisma.InputJsonValue) {
  return {
    documentLanguage: source.documentLanguage,
    templateVersion: source.templateVersion,
    quotationDate: source.quotationDate,
    validUntil: source.validUntil,
    currency: source.currency,
    currencyMinorUnit: source.currencyMinorUnit,
    roundingMode: source.roundingMode,
    customerSnapshot: customerSnapshot ?? (json(source.customerSnapshot) as Prisma.InputJsonValue),
    publicTerms: json(source.publicTerms),
    internalNotes: source.internalNotes,
    subtotal: source.subtotal,
    discountAmount: source.discountAmount,
    discountPercent: source.discountPercent,
    shippingFee: source.shippingFee,
    otherFee: source.otherFee,
    taxRate: source.taxRate,
    taxAmount: source.taxAmount,
    roundingAdjustment: source.roundingAdjustment,
    total: source.total,
    totalCost: source.totalCost,
    profit: source.profit,
    createdBy: actorId,
    items: {
      create: source.items.map((item) => ({
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
        assets: {
          create: item.assets.map((asset) => ({
            assetType: asset.assetType,
            sourceFileId: asset.sourceFileId,
            displayName: asset.displayName,
            objectKey: asset.objectKey,
            contentType: asset.contentType,
            sizeBytes: asset.sizeBytes,
            sha256: asset.sha256,
            sortOrder: asset.sortOrder,
          })),
        },
      })),
    },
  }
}

async function lockQuotation(transaction: Transaction, quotationId: string): Promise<void> {
  await transaction.$queryRaw`SELECT "id" FROM "sales_quotations" WHERE "id" = ${quotationId} FOR UPDATE`
}

async function loadRevision(transaction: Transaction, revisionId: string): Promise<RevisionToCopy> {
  const revision = await transaction.salesQuotationRevision.findUnique({
    where: { id: revisionId },
    include: revisionCopyInclude,
  })
  if (!revision) throw new QuotationError('NOT_FOUND', 'Quotation revision not found')
  return revision
}

async function nextRevisionNumber(transaction: Transaction, quotationId: string): Promise<number> {
  const aggregate = await transaction.salesQuotationRevision.aggregate({
    where: { salesQuotationId: quotationId },
    _max: { revisionNumber: true },
  })
  return (aggregate._max.revisionNumber ?? 0) + 1
}

export async function copyIssuedQuotationRevision(input: unknown, actorId: string) {
  const data = copyQuotationRevisionInputSchema.parse(input)
  return prisma.$transaction(async (transaction) => {
    const source = await loadRevision(transaction, data.revisionId)
    await lockQuotation(transaction, source.salesQuotationId)
    if (source.version !== data.expectedVersion) throw new QuotationError('VERSION_CONFLICT', 'Quotation revision changed')
    if (source.state !== 'ISSUED') {
      throw new QuotationError('INVALID_STATE_TRANSITION', 'Only an issued revision can be revised')
    }
    if (source.salesQuotation.outcomeStatus !== 'OPEN') {
      throw new QuotationError('INVALID_STATE_TRANSITION', 'Only an open quotation can be revised')
    }
    const existingWorking = await transaction.salesQuotationRevision.findFirst({
      where: { salesQuotationId: source.salesQuotationId, state: { in: ['DRAFT', 'READY', 'FINALIZING', 'FINALIZED'] } },
      select: { id: true },
    })
    if (existingWorking) throw new QuotationError('INVALID_STATE_TRANSITION', 'This quotation already has a working revision')
    const revision = await transaction.salesQuotationRevision.create({
      data: {
        ...revisionCreateData(source, actorId),
        salesQuotationId: source.salesQuotationId,
        revisionNumber: await nextRevisionNumber(transaction, source.salesQuotationId),
        state: 'DRAFT',
      },
      select: { id: true, revisionNumber: true, version: true },
    })
    await writeQuotationAudit(transaction, {
      salesQuotationId: source.salesQuotationId,
      entityType: 'SalesQuotationRevision',
      entityId: revision.id,
      action: 'CREATE',
      actorId,
      metadata: { operation: 'CREATE_REVISION', sourceRevisionId: source.id },
    })
    return { quotationId: source.salesQuotationId, ...revision }
  })
}

// Simplified workbench: keep prior formal files intact, then edit a new draft.
export async function copyWorkbenchQuotation(input: unknown, actorId: string, newNumber: boolean) {
  const data = copyQuotationRevisionInputSchema.parse(input)
  return prisma.$transaction(async (transaction) => {
    const source = await loadRevision(transaction, data.revisionId)
    await lockQuotation(transaction, source.salesQuotationId)
    const current = await loadRevision(transaction, data.revisionId)
    if (current.version !== data.expectedVersion) throw new QuotationError('VERSION_CONFLICT', '报价已变更，请刷新后重试')
    if (current.state === 'FINALIZING') throw new QuotationError('INVALID_STATE_TRANSITION', '请等待文件生成结束')
    if (!newNumber) {
      if (current.salesQuotation.outcomeStatus !== 'OPEN') throw new QuotationError('INVALID_STATE_TRANSITION', '已关闭报价不能创建修订版，请复制为新报价')
      if (!['FINALIZED', 'ISSUED', 'SUPERSEDED'].includes(current.state)) throw new QuotationError('INVALID_STATE_TRANSITION', '仅正式报价可以创建修订版')
      const working = await transaction.salesQuotationRevision.findFirst({ where: { salesQuotationId: current.salesQuotationId, state: { in: ['DRAFT', 'READY', 'FINALIZING'] } }, select: { id: true } })
      if (working) throw new QuotationError('INVALID_STATE_TRANSITION', '已有草稿修订版，请先编辑该版本')
    }
    const quotation = newNumber ? await transaction.salesQuotation.create({ data: { quotationNumber: await allocateQuotationNumber(transaction), customerId: current.salesQuotation.customerId, createdBy: actorId } }) : { id: current.salesQuotationId }
    const copyData = revisionCreateData(current, actorId)
    const revision = await transaction.salesQuotationRevision.create({ data: {
      ...copyData, salesQuotationId: quotation.id, revisionNumber: newNumber ? 1 : await nextRevisionNumber(transaction, quotation.id), state: 'DRAFT',
      ...(newNumber ? { quotationDate: new Date(), validUntil: null, internalNotes: null } : {}),
    } })
    await writeQuotationAudit(transaction, { salesQuotationId: quotation.id, entityType: 'SalesQuotationRevision', entityId: revision.id, action: 'CREATE', actorId, metadata: { copiedFrom: current.id, newNumber } })
    await transaction.salesQuotation.update({ where: { id: quotation.id }, data: { updatedAt: new Date() } })
    return { quotationId: quotation.id, revisionId: revision.id, version: revision.version }
  })
}

export async function voidAndCopyFinalizedQuotationRevision(input: unknown, actorId: string) {
  const data = voidAndCopyQuotationRevisionInputSchema.parse(input)
  return prisma.$transaction(async (transaction) => {
    const source = await loadRevision(transaction, data.revisionId)
    await lockQuotation(transaction, source.salesQuotationId)
    if (source.version !== data.expectedVersion) throw new QuotationError('VERSION_CONFLICT', 'Quotation revision changed')
    if (source.state !== 'FINALIZED') {
      throw new QuotationError('INVALID_STATE_TRANSITION', 'Only an unissued finalized revision can be corrected')
    }
    if (source.salesQuotation.outcomeStatus !== 'OPEN') {
      throw new QuotationError('INVALID_STATE_TRANSITION', 'A completed quotation cannot be corrected in place')
    }
    const voided = await transaction.salesQuotationRevision.updateMany({
      where: { id: source.id, state: 'FINALIZED', version: data.expectedVersion },
      data: { state: 'VOID', version: { increment: 1 } },
    })
    if (voided.count !== 1) throw new QuotationError('VERSION_CONFLICT', 'Quotation revision changed')
    const revision = await transaction.salesQuotationRevision.create({
      data: {
        ...revisionCreateData(source, actorId),
        salesQuotationId: source.salesQuotationId,
        revisionNumber: await nextRevisionNumber(transaction, source.salesQuotationId),
        state: 'DRAFT',
      },
      select: { id: true, revisionNumber: true, version: true },
    })
    await writeQuotationAudit(transaction, {
      salesQuotationId: source.salesQuotationId,
      entityType: 'SalesQuotationRevision',
      entityId: source.id,
      action: 'VOID',
      actorId,
      metadata: { operation: 'VOID_AND_COPY', reason: data.reason, replacementRevisionId: revision.id },
    })
    await writeQuotationAudit(transaction, {
      salesQuotationId: source.salesQuotationId,
      entityType: 'SalesQuotationRevision',
      entityId: revision.id,
      action: 'CREATE',
      actorId,
      metadata: { operation: 'CORRECTION_COPY', sourceRevisionId: source.id },
    })
    return { quotationId: source.salesQuotationId, ...revision }
  })
}

export async function copyQuotationToNewCustomer(input: unknown, actorId: string) {
  const data = copyQuotationToCustomerInputSchema.parse(input)
  return prisma.$transaction(async (transaction) => {
    const source = await loadRevision(transaction, data.revisionId)
    if (source.version !== data.expectedVersion) throw new QuotationError('VERSION_CONFLICT', 'Quotation revision changed')
    if (source.state === 'FINALIZING') throw new QuotationError('INVALID_STATE_TRANSITION', 'A finalizing revision cannot be copied')
    if (source.salesQuotation.customerId === data.customerId) {
      throw new QuotationError('VALIDATION_FAILED', 'Choose a different customer for the new quotation')
    }
    const customer = await transaction.businessCustomer.findUnique({
      where: { id: data.customerId, isActive: true },
      include: { contacts: { orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }] } },
    })
    if (!customer) throw new QuotationError('NOT_FOUND', 'Business customer not found')
    const quotationNumber = await allocateQuotationNumber(transaction)
    const quotation = await transaction.salesQuotation.create({
      data: {
        quotationNumber,
        customerId: customer.id,
        outcomeStatus: 'OPEN',
        createdBy: actorId,
        revisions: {
          create: {
            ...revisionCreateData(source, actorId, JSON.parse(JSON.stringify(customer)) as Prisma.InputJsonValue),
            revisionNumber: 1,
            state: 'DRAFT',
          },
        },
      },
      include: { revisions: { select: { id: true, revisionNumber: true, version: true } } },
    })
    const revision = quotation.revisions[0]
    await writeQuotationAudit(transaction, {
      salesQuotationId: quotation.id,
      entityType: 'SalesQuotation',
      entityId: quotation.id,
      action: 'CREATE',
      actorId,
      metadata: { operation: 'COPY_TO_CUSTOMER', sourceRevisionId: source.id, sourceQuotationId: source.salesQuotationId },
    })
    return { quotationId: quotation.id, quotationNumber, ...revision }
  })
}

export async function setQuotationOutcome(input: unknown, actorId: string) {
  const data = setQuotationOutcomeInputSchema.parse(input)
  return prisma.$transaction(async (transaction) => {
    const revision = await transaction.salesQuotationRevision.findUnique({
      where: { id: data.revisionId },
      select: { id: true, version: true, state: true, salesQuotationId: true, salesQuotation: { select: { outcomeStatus: true } } },
    })
    if (!revision) throw new QuotationError('NOT_FOUND', 'Sales quotation revision not found')
    await lockQuotation(transaction, revision.salesQuotationId)
    if (revision.version !== data.expectedVersion) throw new QuotationError('VERSION_CONFLICT', 'Quotation revision changed')
    if (revision.salesQuotation.outcomeStatus !== 'OPEN') {
      throw new QuotationError('INVALID_STATE_TRANSITION', 'A completed quotation outcome cannot be overwritten')
    }
    if ((data.outcomeStatus === 'ACCEPTED' || data.outcomeStatus === 'REJECTED') && revision.state !== 'ISSUED') {
      throw new QuotationError('INVALID_STATE_TRANSITION', 'Accepted or rejected outcomes must reference an issued revision')
    }
    if (data.outcomeStatus === 'ACCEPTED' || data.outcomeStatus === 'REJECTED') {
      const latestIssued = await transaction.salesQuotationRevision.findFirst({
        where: { salesQuotationId: revision.salesQuotationId, state: 'ISSUED' },
        orderBy: { revisionNumber: 'desc' },
        select: { id: true },
      })
      if (latestIssued?.id !== revision.id) {
        throw new QuotationError('INVALID_STATE_TRANSITION', 'Outcome must reference the latest issued revision')
      }
    }
    const updated = await transaction.salesQuotation.updateMany({
      where: { id: revision.salesQuotationId, outcomeStatus: 'OPEN' },
      data: { outcomeStatus: data.outcomeStatus },
    })
    if (updated.count !== 1) throw new QuotationError('VERSION_CONFLICT', 'Sales quotation changed')
    await writeQuotationAudit(transaction, {
      salesQuotationId: revision.salesQuotationId,
      entityType: 'SalesQuotation',
      entityId: revision.salesQuotationId,
      action: 'STATE_CHANGE',
      actorId,
      metadata: { from: 'OPEN', to: data.outcomeStatus, targetIssuedRevisionId: revision.id, note: data.note },
    })
    return { quotationId: revision.salesQuotationId, outcomeStatus: data.outcomeStatus }
  })
}
