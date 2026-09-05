import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { assertQuotationWorkbenchEnabled } from '@/lib/quotation/feature'
import { QuotationError, toQuotationActionError } from '@/lib/quotation/errors'
import { getQuotationPrivateStorage } from '@/lib/quotation/private-storage'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertQuotationWorkbenchEnabled()
    await requireAdmin()
    const kind = z.enum(['source', 'asset']).parse(new URL(request.url).searchParams.get('kind'))
    const id = (kind === 'source' ? z.string().uuid() : z.string().cuid()).parse((await params).id)
    const file = kind === 'source'
      ? await prisma.quotationSourceFile.findFirst({ where: { id, securityStatus: 'CLEAN', deletedAt: null } })
      : await prisma.salesQuotationItemAsset.findUnique({ where: { id } })
    if (!file || !['image/jpeg', 'image/png'].includes(file.contentType)) throw new QuotationError('NOT_FOUND', '图片不存在')
    const stored = await getQuotationPrivateStorage().get(file.objectKey, file.contentType)
    if (stored.sha256 !== file.sha256 || stored.sizeBytes !== file.sizeBytes) throw new QuotationError('DOCUMENT_VALIDATION_FAILED', '图片完整性校验失败')
    return new NextResponse(new Uint8Array(stored.bytes), { headers: { 'Content-Type': file.contentType, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } })
  } catch (error) { return NextResponse.json(toQuotationActionError(error), { status: 400, headers: { 'Cache-Control': 'private, no-store' } }) }
}
