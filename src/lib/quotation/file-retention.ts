import { prisma } from '@/lib/prisma'

import { getQuotationPrivateStorage } from './private-storage'

export async function removeUnreferencedQuotationSourceFile(id: string): Promise<boolean> {
  const objectKey = await prisma.$transaction(async (transaction) => {
    // Use the optimization transaction's source-row lock, then read references and pins afresh.
    // A cleanup started earlier must observe a newly committed original-retention pin before deleting.
    await transaction.$queryRaw<Array<{ id: string }>>`SELECT id FROM quotation_source_files WHERE id = ${id} FOR UPDATE`
    const source = await transaction.quotationSourceFile.findUnique({
      where: { id },
      select: {
        objectKey: true,
        productImages: { select: { id: true }, take: 1 },
        productSources: { select: { id: true }, take: 1 },
      },
    })
    if (!source || source.productImages.length > 0 || source.productSources.length > 0) return null

    const attachedItemAsset = await transaction.salesQuotationItemAsset.findFirst({
      where: { objectKey: source.objectKey },
      select: { id: true },
    })
    if (attachedItemAsset) return null

    // Presence is sufficient; malformed pin contents or a failed lookup never permit deletion.
    const originalPin = await transaction.setting.findUnique({
      where: { key: `quotation.image-original.${id}` }, select: { id: true },
    })
    if (originalPin) return null

    await transaction.quotationSourceFile.delete({ where: { id } })
    return source.objectKey
  })
  if (objectKey === null) return false
  await getQuotationPrivateStorage().delete(objectKey)
  return true
}
