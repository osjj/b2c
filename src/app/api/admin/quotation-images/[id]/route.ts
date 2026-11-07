import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { assertQuotationWorkbenchEnabled } from '@/lib/quotation/feature'
import { QuotationError, toQuotationActionError } from '@/lib/quotation/errors'
import { getQuotationPrivateStorage } from '@/lib/quotation/private-storage'
import { sanitizeQuotationFilename } from '@/lib/quotation/object-keys'
import { quotationThumbnailEtag, readQuotationThumbnail, thumbnailEtagMatches } from '@/lib/quotation/private-thumbnails'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertQuotationWorkbenchEnabled()
    await requireAdmin()
    const query = new URL(request.url).searchParams
    const kind = z.enum(['source', 'asset']).parse(query.get('kind'))
    const variant = z.literal('thumbnail').nullable().parse(query.get('variant'))
    const id = (kind === 'source' ? z.union([z.string().uuid(), z.string().cuid()]) : z.string().cuid()).parse((await params).id)
    const file = kind === 'source'
      ? await prisma.quotationSourceFile.findFirst({ where: { id, securityStatus: 'CLEAN', deletedAt: null } })
      : await prisma.salesQuotationItemAsset.findUnique({ where: { id } })
    if (!file || !['image/jpeg', 'image/png'].includes(file.contentType)) throw new QuotationError('NOT_FOUND', '图片不存在')
    const storage = getQuotationPrivateStorage()
    if (variant === 'thumbnail') {
      // Revalidate authorization and live source metadata even when the browser has the image.
      const etag = quotationThumbnailEtag(file, storage)
      const headers = {
        'Content-Type': 'image/webp',
        'Content-Disposition': 'inline; filename="thumbnail.webp"',
        'Cache-Control': 'private, no-cache, must-revalidate',
        Vary: 'Cookie',
        ETag: etag,
        'X-Content-Type-Options': 'nosniff',
      }
      if (thumbnailEtagMatches(request.headers.get('if-none-match'), etag)) {
        return new NextResponse(null, { status: 304, headers })
      }
      const bytes = await readQuotationThumbnail(file, storage)
      return new NextResponse(new Uint8Array(bytes), { headers: { ...headers, 'Content-Length': String(bytes.length) } })
    }
    const stored = await storage.get(file.objectKey, file.contentType)
    if (stored.sha256 !== file.sha256 || stored.sizeBytes !== file.sizeBytes) throw new QuotationError('DOCUMENT_VALIDATION_FAILED', '图片完整性校验失败')
    const filename = sanitizeQuotationFilename(file.displayName || `image.${file.contentType === 'image/png' ? 'png' : 'jpg'}`)
    return new NextResponse(new Uint8Array(stored.bytes), { headers: { 'Content-Type': file.contentType, 'Content-Disposition': `inline; filename="${filename}"`, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } })
  } catch (error) { return NextResponse.json(toQuotationActionError(error), { status: 400, headers: { 'Cache-Control': 'private, no-store' } }) }
}
