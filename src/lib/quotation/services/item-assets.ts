import { prisma } from '@/lib/prisma'

import { QuotationError } from '../errors'
import { attachQuotationItemAssetInputSchema } from '../schemas'
import { writeQuotationAudit } from './audit'

const CUSTOMER_IMAGE_TYPES = new Set(['image/jpeg', 'image/png'])
const MAX_CUSTOMER_IMAGES_PER_ITEM = 8

export async function attachCleanSourceImageToQuotationItem(input: unknown, actorId: string) {
  const data = attachQuotationItemAssetInputSchema.parse(input)
  return prisma.$transaction(async (transaction) => {
    const item = await transaction.salesQuotationItem.findUnique({
      where: { id: data.itemId },
      select: {
        id: true,
        revisionId: true,
        revision: { select: { salesQuotationId: true, state: true, version: true } },
      },
    })
    if (!item) throw new QuotationError('NOT_FOUND', 'Quotation item not found')
    if (item.revision.state !== 'DRAFT' && item.revision.state !== 'READY') {
      throw new QuotationError('IMMUTABLE_REVISION', 'Images can only be attached to an editable revision')
    }
    if (item.revision.version !== data.expectedVersion) {
      throw new QuotationError('VERSION_CONFLICT', 'Quotation revision changed')
    }
    const source = await transaction.quotationSourceFile.findUnique({
      where: { id: data.sourceFileId },
      select: {
        id: true,
        salesQuotationId: true,
        displayName: true,
        objectKey: true,
        contentType: true,
        sizeBytes: true,
        sha256: true,
        securityStatus: true,
        deletedAt: true,
      },
    })
    if (!source || source.deletedAt) throw new QuotationError('NOT_FOUND', 'Private source image not found')
    if (source.securityStatus !== 'CLEAN') throw new QuotationError('FILE_NOT_CLEAN', 'Source image has not passed security checks')
    if (!CUSTOMER_IMAGE_TYPES.has(source.contentType)) {
      throw new QuotationError('VALIDATION_FAILED', 'Only JPEG or PNG images can be attached to formal artifacts')
    }
    if (source.salesQuotationId && source.salesQuotationId !== item.revision.salesQuotationId) {
      throw new QuotationError('FORBIDDEN', 'This private image belongs to another quotation')
    }
    const duplicate = await transaction.salesQuotationItemAsset.findFirst({
      where: { itemId: item.id, sha256: source.sha256 },
      select: { id: true },
    })
    if (duplicate) throw new QuotationError('DUPLICATE_FILE', 'This image is already attached to the quotation line')
    const imageCount = await transaction.salesQuotationItemAsset.count({
      where: { itemId: item.id, assetType: 'PRODUCT_IMAGE' },
    })
    if (imageCount >= MAX_CUSTOMER_IMAGES_PER_ITEM) {
      throw new QuotationError('VALIDATION_FAILED', 'A quotation line supports at most 8 customer images')
    }
    const asset = await transaction.salesQuotationItemAsset.create({
      data: {
        itemId: item.id,
        sourceFileId: source.id,
        assetType: 'PRODUCT_IMAGE',
        displayName: data.displayName || source.displayName,
        objectKey: source.objectKey,
        contentType: source.contentType,
        sizeBytes: source.sizeBytes,
        sha256: source.sha256,
        sortOrder: data.sortOrder,
      },
      select: { id: true, itemId: true, displayName: true, contentType: true, sizeBytes: true, sortOrder: true },
    })
    const updated = await transaction.salesQuotationRevision.updateMany({
      where: { id: item.revisionId, version: data.expectedVersion, state: { in: ['DRAFT', 'READY'] } },
      data: { version: { increment: 1 } },
    })
    if (updated.count !== 1) throw new QuotationError('VERSION_CONFLICT', 'Quotation revision changed')
    await writeQuotationAudit(transaction, {
      salesQuotationId: item.revision.salesQuotationId,
      entityType: 'SalesQuotationItemAsset',
      entityId: asset.id,
      action: 'CREATE',
      actorId,
      metadata: { itemId: item.id, sourceFileId: source.id },
    })
    return { quotationId: item.revision.salesQuotationId, revisionId: item.revisionId, version: data.expectedVersion + 1, asset }
  })
}
