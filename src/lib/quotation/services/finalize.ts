import { randomUUID } from 'node:crypto'

import type { QuotationDocumentType } from '@prisma/client'

import { prisma } from '@/lib/prisma'

import { generateCustomerExcel, generateInternalValuationExcel } from '../artifacts/excel'
import { generateCustomerPdf } from '../artifacts/pdf'
import { buildCanonicalSnapshot, stableSnapshotJson } from '../artifacts/snapshot'
import { sha256, validateGeneratedArtifacts } from '../artifacts/validate'
import { QuotationError } from '../errors'
import { atFinalizationStage, finalizationError, type FinalizationStage } from '../finalization-error'
import { calculateQuotationMoney } from '../money'
import { quotationFinalAssetKey, quotationFinalKey, quotationStagingKey } from '../object-keys'
import { getQuotationPrivateStorage } from '../private-storage'
import { finalizeQuotationInputSchema, quotationItemInputSchema } from '../schemas'
import { writeQuotationAudit } from './audit'

type FinalizationResult = {
  quotationId: string
  revisionId: string
  version: number
  documentIds: string[]
  status: 'FINALIZING' | 'FINALIZED'
  attemptId: string
}

const LEASE_MILLISECONDS = 5 * 60 * 1000
const MAX_FINAL_IMAGE_BYTES = 5 * 1024 * 1024
const MAX_FINAL_IMAGE_TOTAL_BYTES = 20 * 1024 * 1024
const CUSTOMER_IMAGE_TYPES = new Set(['image/jpeg', 'image/png'])

export async function finalizeQuotationRevision(input: unknown, actorId: string): Promise<FinalizationResult> {
  const data = finalizeQuotationInputSchema.parse(input)
  // Resolve storage before claiming READY so configuration failures cannot strand FINALIZING.
  const storage = getQuotationPrivateStorage()
  const existingAttempt = await prisma.quotationFinalizationAttempt.findUnique({
    where: { idempotencyKey: data.idempotencyKey },
    include: { documents: { select: { id: true } }, revision: { select: { salesQuotationId: true, version: true } } },
  })
  if (existingAttempt?.status === 'SUCCEEDED') {
    if (existingAttempt.revisionId !== data.revisionId) {
      throw new QuotationError('VALIDATION_FAILED', 'Idempotency key belongs to another quotation revision')
    }
    return {
      quotationId: existingAttempt.revision.salesQuotationId,
      revisionId: existingAttempt.revisionId,
      version: existingAttempt.revision.version,
      documentIds: existingAttempt.documents.map((document) => document.id),
      status: 'FINALIZED',
      attemptId: existingAttempt.id,
    }
  }
  if (existingAttempt) {
    if (existingAttempt.revisionId !== data.revisionId) {
      throw new QuotationError('VALIDATION_FAILED', 'Idempotency key belongs to another quotation revision')
    }
    if (existingAttempt.status === 'RUNNING' && existingAttempt.leaseExpiresAt && existingAttempt.leaseExpiresAt > new Date()) {
      return {
        quotationId: existingAttempt.revision.salesQuotationId,
        revisionId: existingAttempt.revisionId,
        version: existingAttempt.revision.version,
        documentIds: [],
        status: 'FINALIZING',
        attemptId: existingAttempt.id,
      }
    }
    throw new QuotationError('INVALID_STATE_TRANSITION', 'This finalization request failed or expired; reconcile it and retry with a new idempotency key')
  }

  const attemptId = randomUUID()
  const leaseOwner = randomUUID()
  const claimed = await prisma.$transaction(async (transaction) => {
    const revision = await transaction.salesQuotationRevision.findUnique({
      where: { id: data.revisionId },
      select: { id: true, salesQuotationId: true, state: true, version: true },
    })
    if (!revision) throw new QuotationError('NOT_FOUND', 'Quotation revision not found')
    if (revision.state !== 'READY') throw new QuotationError('INVALID_STATE_TRANSITION', 'Only READY revisions can be finalized')
    if (revision.version !== data.expectedVersion) throw new QuotationError('VERSION_CONFLICT', 'Quotation revision changed')
    const updated = await transaction.salesQuotationRevision.updateMany({
      where: { id: revision.id, version: data.expectedVersion, state: 'READY' },
      data: { state: 'FINALIZING', version: { increment: 1 } },
    })
    if (updated.count !== 1) throw new QuotationError('VERSION_CONFLICT', 'Quotation revision changed while finalizing')
    await transaction.quotationFinalizationAttempt.create({
      data: {
        id: attemptId,
        revisionId: revision.id,
        idempotencyKey: data.idempotencyKey,
        status: 'RUNNING',
        leaseOwner,
        leaseExpiresAt: new Date(Date.now() + LEASE_MILLISECONDS),
        heartbeatAt: new Date(),
      },
    })
    return { quotationId: revision.salesQuotationId, revisionId: revision.id, workingVersion: data.expectedVersion + 1 }
  })

  const storedKeys = new Set<string>()
  let stage: FinalizationStage = 'prepare'
  const heartbeat = async (): Promise<void> => {
    const updated = await prisma.quotationFinalizationAttempt.updateMany({
      where: { id: attemptId, status: 'RUNNING', leaseOwner },
      data: { heartbeatAt: new Date(), leaseExpiresAt: new Date(Date.now() + LEASE_MILLISECONDS) },
    })
    if (updated.count !== 1) {
      throw new QuotationError('INVALID_STATE_TRANSITION', 'Finalization lease is no longer owned by this request')
    }
  }
  try {
    await heartbeat()
    const revisionBeforeRecalculation = await prisma.salesQuotationRevision.findUnique({
      where: { id: claimed.revisionId },
      include: {
        salesQuotation: { select: { quotationNumber: true } },
        items: { orderBy: { sortOrder: 'asc' }, include: { assets: { orderBy: { sortOrder: 'asc' } } } },
      },
    })
    if (!revisionBeforeRecalculation || revisionBeforeRecalculation.state !== 'FINALIZING') {
      throw new QuotationError('INVALID_STATE_TRANSITION', 'Finalizing revision is no longer available')
    }
    const itemInputs = revisionBeforeRecalculation.items.map((item) => quotationItemInputSchema.parse({
      id: item.id,
      quotationProductId: item.quotationProductId,
      productId: item.productId,
      sortOrder: item.sortOrder,
      nameZh: item.nameZh,
      nameEn: item.nameEn,
      model: item.model,
      sku: item.sku,
      specifications: item.specifications,
      unit: item.unit,
      quantity: item.quantity.toString(),
      unitPrice: item.unitPrice.toString(),
      discountAmount: item.discountAmount.toString(),
      discountPercent: item.discountPercent?.toString() ?? null,
      unitCost: item.unitCost?.toString() ?? null,
      costCurrency: item.costCurrency,
      exchangeRate: item.exchangeRate?.toString() ?? null,
      internalNotes: item.internalNotes,
    }))
    const recalculated = calculateQuotationMoney({
      items: itemInputs,
      currency: revisionBeforeRecalculation.currency,
      currencyMinorUnit: revisionBeforeRecalculation.currencyMinorUnit,
      roundingMode: revisionBeforeRecalculation.roundingMode,
      discountAmount: revisionBeforeRecalculation.discountAmount.toString(),
      discountPercent: revisionBeforeRecalculation.discountPercent?.toString() ?? null,
      shippingFee: revisionBeforeRecalculation.shippingFee.toString(),
      otherFee: revisionBeforeRecalculation.otherFee.toString(),
      taxRate: revisionBeforeRecalculation.taxRate.toString(),
      roundingAdjustment: revisionBeforeRecalculation.roundingAdjustment.toString(),
    })
    const recalculatedWithIds = recalculated.items.map((item) => {
      if (!item.id) throw new QuotationError('DOCUMENT_VALIDATION_FAILED', 'Quotation line identifier is missing')
      return { ...item, id: item.id }
    })
    await prisma.$transaction(async (transaction) => {
      await transaction.salesQuotationRevision.update({
        where: { id: claimed.revisionId },
        data: {
          subtotal: recalculated.subtotal,
          discountAmount: recalculated.discountAmount,
          shippingFee: recalculated.shippingFee,
          otherFee: recalculated.otherFee,
          taxAmount: recalculated.taxAmount,
          roundingAdjustment: recalculated.roundingAdjustment,
          total: recalculated.total,
          totalCost: recalculated.totalCost,
          profit: recalculated.profit,
        },
      })
      await Promise.all(recalculatedWithIds.map((item) => transaction.salesQuotationItem.update({
        where: { id: item.id },
        data: { lineTotal: item.lineTotal, lineCost: item.lineCost },
      })))
    })
    const revision = await prisma.salesQuotationRevision.findUnique({
      where: { id: claimed.revisionId },
      include: {
        salesQuotation: { select: { quotationNumber: true } },
        items: { orderBy: { sortOrder: 'asc' }, include: { assets: { orderBy: { sortOrder: 'asc' } } } },
      },
    })
    if (!revision || revision.state !== 'FINALIZING') {
      throw new QuotationError('INVALID_STATE_TRANSITION', 'Finalizing revision changed during recalculation')
    }
    stage = 'images'
    const immutableAssets: Array<{
      id: string
      itemId: string
      objectKey: string
      contentType: 'image/jpeg' | 'image/png'
      sizeBytes: number
      sha256: string
      bytes: Buffer
    }> = []
    let totalImageBytes = 0
    for (const item of revision.items) {
      for (const asset of item.assets) {
        if (asset.assetType !== 'PRODUCT_IMAGE') continue
        if (!CUSTOMER_IMAGE_TYPES.has(asset.contentType)) {
          throw new QuotationError('DOCUMENT_VALIDATION_FAILED', 'A selected customer image has an unsupported content type')
        }
        if (asset.sizeBytes > MAX_FINAL_IMAGE_BYTES) {
          throw new QuotationError('FILE_TOO_LARGE', 'A selected customer image exceeds the finalization size limit')
        }
        const source = await storage.get(asset.objectKey, asset.contentType)
        if (source.sha256 !== asset.sha256 || source.sizeBytes !== asset.sizeBytes || source.contentType !== asset.contentType) {
          throw new QuotationError('DOCUMENT_VALIDATION_FAILED', 'A selected customer image no longer matches its approved source')
        }
        totalImageBytes += source.sizeBytes
        if (totalImageBytes > MAX_FINAL_IMAGE_TOTAL_BYTES) {
          throw new QuotationError('FILE_TOO_LARGE', 'Selected customer images exceed the finalization size limit')
        }
        const filename = asset.displayName || `item-${item.sortOrder + 1}.${asset.contentType.split('/')[1]}`
        const stagingKey = quotationStagingKey(claimed.quotationId, claimed.revisionId, attemptId, `asset-${asset.id}-${filename}`)
        const finalKey = quotationFinalAssetKey(claimed.quotationId, claimed.revisionId, asset.id, filename)
        storedKeys.add(stagingKey)
        await storage.put(stagingKey, source.bytes, asset.contentType)
        // Track destination before move: R2 copy may succeed even when source deletion fails.
        storedKeys.add(finalKey)
        await storage.move(stagingKey, finalKey, asset.contentType)
        storedKeys.delete(stagingKey)
        immutableAssets.push({
          id: asset.id,
          itemId: item.id,
          objectKey: finalKey,
          contentType: asset.contentType as 'image/jpeg' | 'image/png',
          sizeBytes: source.sizeBytes,
          sha256: source.sha256,
          bytes: source.bytes,
        })
      }
    }
    await heartbeat()
    stage = 'snapshot'
    const snapshot = buildCanonicalSnapshot(revision, immutableAssets)
    const snapshotJson = stableSnapshotJson(snapshot)
    const internalExcelPromise = atFinalizationStage('excel', () => generateInternalValuationExcel({
      quotationNumber: revision.salesQuotation.quotationNumber,
      revisionNumber: revision.revisionNumber,
      currency: revision.currency,
      total: revision.total.toString(),
      totalCost: revision.totalCost?.toString() ?? null,
      profit: revision.profit?.toString() ?? null,
      items: revision.items.map((item, index) => ({
        position: index + 1,
        name: item.nameEn || item.nameZh || '',
        quantity: item.quantity.toString(),
        unitPrice: item.unitPrice.toString(),
        lineTotal: item.lineTotal.toString(),
        unitCost: item.unitCost?.toString() ?? null,
        costCurrency: item.costCurrency,
        exchangeRate: item.exchangeRate?.toString() ?? null,
        lineCost: item.lineCost?.toString() ?? null,
        internalNotes: item.internalNotes,
      })),
    }))
    const [pdf, excel, internalExcel] = await Promise.all([
      atFinalizationStage('pdf', () => generateCustomerPdf(snapshot)),
      atFinalizationStage('excel', () => generateCustomerExcel(snapshot)),
      internalExcelPromise,
    ])
    stage = 'validation'
    await validateGeneratedArtifacts({ snapshot, snapshotJson, pdf, excel, internalExcel })
    await heartbeat()

    const artifacts: Array<{
      id: string
      type: QuotationDocumentType
      filename: string
      contentType: string
      bytes: Buffer
    }> = [
      { id: randomUUID(), type: 'SNAPSHOT_JSON', filename: `${snapshot.quotation.number}-R${snapshot.quotation.revision}.json`, contentType: 'application/json', bytes: snapshotJson },
      { id: randomUUID(), type: 'CUSTOMER_PDF', filename: `${snapshot.quotation.number}-R${snapshot.quotation.revision}.pdf`, contentType: 'application/pdf', bytes: pdf },
      { id: randomUUID(), type: 'CUSTOMER_EXCEL', filename: `${snapshot.quotation.number}-R${snapshot.quotation.revision}.xlsx`, contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', bytes: excel },
      { id: randomUUID(), type: 'INTERNAL_EXCEL', filename: `INTERNAL-${snapshot.quotation.number}-R${snapshot.quotation.revision}.xlsx`, contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', bytes: internalExcel },
    ]

    stage = 'storage'
    const storeResults = await Promise.allSettled(artifacts.map(async (artifact) => {
      const stagingKey = quotationStagingKey(claimed.quotationId, claimed.revisionId, attemptId, artifact.filename)
      storedKeys.add(stagingKey)
      await storage.put(stagingKey, artifact.bytes, artifact.contentType)
      const finalKey = quotationFinalKey(claimed.quotationId, claimed.revisionId, artifact.id, artifact.filename)
      storedKeys.add(finalKey)
      await storage.move(stagingKey, finalKey, artifact.contentType)
      storedKeys.delete(stagingKey)
      return { ...artifact, objectKey: finalKey, sizeBytes: artifact.bytes.length, hash: sha256(artifact.bytes) }
    }))
    const failedStore = storeResults.find((result) => result.status === 'rejected')
    if (failedStore?.status === 'rejected') throw failedStore.reason
    const stored = storeResults.flatMap((result) => result.status === 'fulfilled' ? [result.value] : [])

    stage = 'database'
    const result = await prisma.$transaction(async (transaction) => {
      const updated = await transaction.salesQuotationRevision.updateMany({
        where: { id: claimed.revisionId, version: claimed.workingVersion, state: 'FINALIZING' },
        data: { state: 'FINALIZED', version: { increment: 1 }, finalizedAt: new Date() },
      })
      if (updated.count !== 1) throw new QuotationError('VERSION_CONFLICT', 'Quotation revision changed during finalization')
      await transaction.salesQuotationDocument.createMany({
        data: stored.map((artifact) => ({
          id: artifact.id,
          revisionId: claimed.revisionId,
          attemptId,
          documentType: artifact.type,
          language: revision.documentLanguage,
          templateVersion: revision.templateVersion,
          filename: artifact.filename,
          contentType: artifact.contentType,
          sizeBytes: artifact.sizeBytes,
          storageProvider: storage.provider,
          objectKey: artifact.objectKey,
          sha256: artifact.hash,
        })),
      })
      await Promise.all(immutableAssets.map((asset) => transaction.salesQuotationItemAsset.update({
        where: { id: asset.id },
        data: {
          objectKey: asset.objectKey,
          contentType: asset.contentType,
          sizeBytes: asset.sizeBytes,
          sha256: asset.sha256,
        },
      })))
      await transaction.quotationFinalizationAttempt.update({
        where: { id: attemptId },
        data: { status: 'SUCCEEDED', leaseOwner: null, leaseExpiresAt: null, heartbeatAt: new Date() },
      })
      await writeQuotationAudit(transaction, {
        salesQuotationId: claimed.quotationId,
        entityType: 'SalesQuotationRevision', entityId: claimed.revisionId,
        action: 'FINALIZE', actorId,
        metadata: { attemptId, documentIds: stored.map((artifact) => artifact.id) },
      })
      return {
        quotationId: claimed.quotationId,
        revisionId: claimed.revisionId,
        version: claimed.workingVersion + 1,
        documentIds: stored.map((artifact) => artifact.id),
        status: 'FINALIZED' as const,
        attemptId,
      }
    })
    return result
  } catch (error) {
    const failure = finalizationError(error, stage)
    await Promise.allSettled([...storedKeys].map((key) => storage.delete(key)))
    await prisma.$transaction(async (transaction) => {
      await transaction.salesQuotationRevision.updateMany({
        where: { id: claimed.revisionId, state: 'FINALIZING' },
        data: { state: 'READY', version: { increment: 1 } },
      })
      await transaction.quotationFinalizationAttempt.updateMany({
        where: { id: attemptId, status: 'RUNNING' },
        data: {
          status: 'FAILED',
          leaseOwner: null,
          leaseExpiresAt: null,
          failureCode: failure.code,
          failureSummary: failure.message,
        },
      })
    })
    throw new QuotationError(failure.code, `${failure.message} Reference: ${attemptId}`)
  }
}
