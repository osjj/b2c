import { NextResponse } from 'next/server'
import { unstable_rethrow } from 'next/navigation'
import { z } from 'zod'

import { requireAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { QuotationError } from '@/lib/quotation/errors'
import { assertQuotationWorkbenchEnabled } from '@/lib/quotation/feature'
import { getQuotationPrivateStorage } from '@/lib/quotation/private-storage'
import { findQuotationDocumentForDownload } from '@/lib/quotation/repositories/documents'
import { writeQuotationAudit } from '@/lib/quotation/services/audit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function contentDisposition(filename: string): string {
  const fallback = filename.replace(/[^A-Za-z0-9._-]/g, '_') || 'quotation-file'
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(filename)}`
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    assertQuotationWorkbenchEnabled()
    const actor = await requireAdmin()
    const { id } = await context.params
    const documentId = z.string().uuid().parse(id)
    const document = await findQuotationDocumentForDownload(documentId)
    if (!document) {
      return NextResponse.json({ success: false, reason: 'Quotation document not found', code: 'NOT_FOUND' }, { status: 404 })
    }
    const storage = getQuotationPrivateStorage()
    if (storage.provider !== document.storageProvider) {
      throw new QuotationError('FEATURE_DISABLED', 'The private storage provider for this document is not configured')
    }
    const object = await storage.get(document.objectKey, document.contentType)
    if (object.sizeBytes !== document.sizeBytes || object.sha256 !== document.sha256) {
      return NextResponse.json(
        { success: false, reason: 'Quotation document integrity check failed', code: 'DOCUMENT_VALIDATION_FAILED' },
        { status: 409 },
      )
    }
    await prisma.$transaction(async (transaction) => {
      await writeQuotationAudit(transaction, {
        salesQuotationId: document.revision.salesQuotationId,
        entityType: 'SalesQuotationDocument',
        entityId: document.id,
        action: 'DOWNLOAD',
        actorId: actor.id,
      })
    })
    return new NextResponse(new Uint8Array(object.bytes), {
      headers: {
        'Cache-Control': 'private, no-store',
        'Content-Type': document.contentType,
        'Content-Length': String(object.sizeBytes),
        'Content-Disposition': contentDisposition(document.filename),
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (error) {
    unstable_rethrow(error)
    if (error instanceof QuotationError) {
      return NextResponse.json({ success: false, reason: error.message, code: error.code }, { status: 400 })
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, reason: 'Invalid document identifier', code: 'VALIDATION_FAILED' }, { status: 400 })
    }
    return NextResponse.json({ success: false, reason: 'Quotation download failed', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
