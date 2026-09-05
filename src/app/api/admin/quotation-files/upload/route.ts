import { randomUUID } from 'node:crypto'

import { NextResponse } from 'next/server'
import { unstable_rethrow } from 'next/navigation'
import { z } from 'zod'

import { requireAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { QuotationError } from '@/lib/quotation/errors'
import { assertQuotationWorkbenchEnabled } from '@/lib/quotation/feature'
import { canAcceptQuotationUpload } from '@/lib/quotation/file-security'
import { scanQuotationUpload } from '@/lib/quotation/scan-upload'
import { MAX_QUOTATION_IMAGE_BYTES, validateQuotationImage } from '@/lib/quotation/file-validation'
import { quotationQuarantineKey } from '@/lib/quotation/object-keys'
import { getQuotationPrivateStorage } from '@/lib/quotation/private-storage'
import { writeQuotationAudit } from '@/lib/quotation/services/audit'

export const runtime = 'nodejs'

export async function POST(request: Request): Promise<NextResponse> {
  try {
    assertQuotationWorkbenchEnabled()
    const actor = await requireAdmin()
    if (!canAcceptQuotationUpload()) {
      return NextResponse.json(
        { success: false, reason: '服务器尚未配置图片安全扫描器 QUOTATION_CLAMSCAN_PATH', code: 'FEATURE_DISABLED' },
        { status: 503 },
      )
    }
    const contentLength = Number(request.headers.get('content-length'))
    if (Number.isFinite(contentLength) && contentLength > MAX_QUOTATION_IMAGE_BYTES + 1024 * 1024) {
      return NextResponse.json(
        { success: false, reason: 'Quotation upload is too large', code: 'FILE_TOO_LARGE' },
        { status: 413 },
      )
    }
    const form = await request.formData()
    const file = form.get('file')
    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, reason: 'A file is required', code: 'VALIDATION_FAILED' },
        { status: 400 },
      )
    }
    if (file.size === 0 || file.size > MAX_QUOTATION_IMAGE_BYTES) {
      return NextResponse.json(
        { success: false, reason: 'Quotation upload is too large', code: 'FILE_TOO_LARGE' },
        { status: 413 },
      )
    }
    const salesQuotationIdValue = form.get('salesQuotationId')
    const salesQuotationId = salesQuotationIdValue
      ? z.string().cuid().parse(salesQuotationIdValue)
      : null
    const validated = await validateQuotationImage({
      filename: file.name,
      contentType: file.type,
      bytes: Buffer.from(await file.arrayBuffer()),
    })
    await scanQuotationUpload(validated.bytes)
    const duplicate = await prisma.quotationSourceFile.findFirst({
      where: { sha256: validated.sha256, deletedAt: null, salesQuotationId, securityStatus: 'CLEAN' },
      select: { id: true, displayName: true, contentType: true, sizeBytes: true, securityStatus: true },
    })
    if (duplicate) {
      return NextResponse.json(
        { success: true, reason: 'Existing private file reused', data: duplicate },
        { status: 200 },
      )
    }

    const storage = getQuotationPrivateStorage()
    const objectKey = quotationQuarantineKey(validated.filename)
    await storage.put(objectKey, validated.bytes, validated.contentType)
    try {
      const sourceId = randomUUID()
      const source = await prisma.$transaction(async (transaction) => {
        const created = await transaction.quotationSourceFile.create({
          data: {
            id: sourceId,
            salesQuotationId,
            displayName: validated.filename,
            originalFilename: validated.filename,
            contentType: validated.contentType,
            sizeBytes: validated.sizeBytes,
            storageProvider: storage.provider,
            objectKey,
            sha256: validated.sha256,
            securityStatus: 'CLEAN',
            uploadedBy: actor.id,
          },
          select: { id: true, displayName: true, contentType: true, sizeBytes: true, securityStatus: true },
        })
        await writeQuotationAudit(transaction, {
          salesQuotationId,
          entityType: 'QuotationSourceFile',
          entityId: sourceId,
          action: 'CREATE',
          actorId: actor.id,
        })
        return created
      })
      return NextResponse.json({ success: true, reason: 'Private quotation file uploaded', data: source }, { status: 201 })
    } catch (error) {
      await storage.delete(objectKey)
      throw error
    }
  } catch (error) {
    unstable_rethrow(error)
    if (error instanceof QuotationError) {
      return NextResponse.json({ success: false, reason: error.message, code: error.code }, { status: 400 })
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, reason: 'Validation failed', code: 'VALIDATION_FAILED' }, { status: 400 })
    }
    return NextResponse.json(
      { success: false, reason: 'Private quotation file upload failed', code: 'INTERNAL_ERROR' },
      { status: 500 },
    )
  }
}
