import type { Prisma } from '@prisma/client'
import { QuotationError } from '../errors'
import type { QuotationItemInput } from '../schemas'

export async function attachEditorImages(tx: Prisma.TransactionClient, quotationId: string, revisionId: string, inputs: QuotationItemInput[]) {
  const items = await tx.salesQuotationItem.findMany({ where: { revisionId }, select: { id: true, sortOrder: true, assets: true } })
  const allIds = [...new Set(inputs.flatMap((input) => input.imageSourceIds ?? []))]
  if (!allIds.length) return
  const allSources = await tx.quotationSourceFile.findMany({ where: { id: { in: allIds }, deletedAt: null, securityStatus: 'CLEAN', OR: [{ salesQuotationId: null }, { salesQuotationId: quotationId }] } })
  const additions: Prisma.SalesQuotationItemAssetCreateManyInput[] = []
  for (const input of inputs) {
    if (!input.imageSourceIds?.length) continue
    const item = items.find((entry) => entry.sortOrder === input.sortOrder)
    if (!item) throw new QuotationError('VALIDATION_FAILED', 'Quotation image target not found')
    const ids = input.imageSourceIds
    if (new Set(ids).size !== ids.length || item.assets.length + ids.length > 8) throw new QuotationError('VALIDATION_FAILED', '每个产品最多 8 张不重复的图片')
    const sources = allSources.filter((source) => ids.includes(source.id))
    if (sources.length !== ids.length) throw new QuotationError('FILE_NOT_CLEAN', '图片不可用、未通过安全检查或属于其他报价')
    const hashes = new Set(item.assets.map((asset) => asset.sha256))
    for (const [index, id] of ids.entries()) {
      const source = sources.find((entry) => entry.id === id)
      if (!source || !['image/png', 'image/jpeg'].includes(source.contentType) || source.sizeBytes > 5 * 1024 * 1024) throw new QuotationError('VALIDATION_FAILED', '请选择不超过 5 MB 的 PNG / JPEG 图片')
      if (hashes.has(source.sha256)) throw new QuotationError('DUPLICATE_FILE', '产品图片重复')
      hashes.add(source.sha256)
      additions.push({ itemId: item.id, sourceFileId: source.id, displayName: source.displayName, objectKey: source.objectKey, contentType: source.contentType, sizeBytes: source.sizeBytes, sha256: source.sha256, sortOrder: item.assets.length + index })
    }
  }
  if (additions.length) await tx.salesQuotationItemAsset.createMany({ data: additions })
}
