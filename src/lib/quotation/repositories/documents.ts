import { prisma } from '@/lib/prisma'

export async function findQuotationDocumentForDownload(id: string) {
  return prisma.salesQuotationDocument.findUnique({
    where: { id },
    select: {
      id: true,
      filename: true,
      contentType: true,
      sizeBytes: true,
      storageProvider: true,
      objectKey: true,
      sha256: true,
      revision: { select: { salesQuotationId: true } },
    },
  })
}
