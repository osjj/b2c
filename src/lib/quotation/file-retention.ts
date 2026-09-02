import { prisma } from '@/lib/prisma'

import { getQuotationPrivateStorage } from './private-storage'

export async function removeUnreferencedQuotationSourceFile(id: string): Promise<boolean> {
  const source = await prisma.quotationSourceFile.findUnique({
    where: { id },
    select: {
      objectKey: true,
      productImages: { select: { id: true }, take: 1 },
      productSources: { select: { id: true }, take: 1 },
    },
  })
  if (!source || source.productImages.length > 0 || source.productSources.length > 0) return false

  const attachedItemAsset = await prisma.salesQuotationItemAsset.findFirst({
    where: { objectKey: source.objectKey },
    select: { id: true },
  })
  if (attachedItemAsset) return false

  await prisma.quotationSourceFile.delete({ where: { id } })
  await getQuotationPrivateStorage().delete(source.objectKey)
  return true
}
