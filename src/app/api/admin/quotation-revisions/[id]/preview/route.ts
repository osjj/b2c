import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { assertQuotationWorkbenchEnabled } from '@/lib/quotation/feature'
import { QuotationError, toQuotationActionError } from '@/lib/quotation/errors'
import { buildCanonicalSnapshot, type SnapshotImage } from '@/lib/quotation/artifacts/snapshot'
import { generateCustomerPdf } from '@/lib/quotation/artifacts/pdf'
import { getQuotationPrivateStorage } from '@/lib/quotation/private-storage'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertQuotationWorkbenchEnabled()
    await requireAdmin()
    const id = z.string().cuid().parse((await params).id)
    const version = z.coerce.number().int().positive().parse(new URL(request.url).searchParams.get('version'))
    const revision = await prisma.salesQuotationRevision.findUnique({ where: { id }, include: { salesQuotation: { select: { quotationNumber: true } }, items: { orderBy: { sortOrder: 'asc' }, include: { assets: { orderBy: { sortOrder: 'asc' } } } } } })
    if (!revision) throw new QuotationError('NOT_FOUND', '报价不存在')
    if (revision.version !== version) throw new QuotationError('VERSION_CONFLICT', '报价已更新，请刷新后重新预览')
    if (!['DRAFT', 'READY'].includes(revision.state)) throw new QuotationError('INVALID_STATE_TRANSITION', '此版本已有正式文件或正在生成，请从文件区下载')
    const images: SnapshotImage[] = []
    let totalBytes = 0
    const assets = revision.items.flatMap((item) => item.assets.filter((asset) => asset.assetType === 'PRODUCT_IMAGE'))
    if (assets.length) {
      const storage = getQuotationPrivateStorage()
      for (const asset of assets) {
        totalBytes += asset.sizeBytes
        if (asset.sizeBytes > 5 * 1024 * 1024 || totalBytes > 20 * 1024 * 1024) throw new QuotationError('FILE_TOO_LARGE', '报价图片总量不能超过 20 MB，单张不能超过 5 MB')
        if (asset.contentType !== 'image/jpeg' && asset.contentType !== 'image/png') throw new QuotationError('VALIDATION_FAILED', '不支持的图片格式')
        const object = await storage.get(asset.objectKey, asset.contentType)
        if (object.sha256 !== asset.sha256 || object.sizeBytes !== asset.sizeBytes) throw new QuotationError('DOCUMENT_VALIDATION_FAILED', '图片完整性检查失败')
        images.push({ itemId: asset.itemId, contentType: asset.contentType, sha256: asset.sha256, bytes: object.bytes })
      }
    }
    const snapshot = buildCanonicalSnapshot(revision, images)
    const pdf = await generateCustomerPdf(snapshot, undefined, true)
    return new NextResponse(new Uint8Array(pdf), { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'inline; filename="quotation-preview.pdf"', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } })
  } catch (error) {
    const result = toQuotationActionError(error)
    return NextResponse.json(result, { status: result.success === false && result.code === 'NOT_FOUND' ? 404 : 400, headers: { 'Cache-Control': 'private, no-store' } })
  }
}
