import { NextResponse } from 'next/server'

import { requireAdmin } from '@/lib/auth-utils'
import { getAdminEmailAttachmentForDownload } from '@/lib/admin-email-store'
import { getObjectFromR2 } from '@/lib/r2'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireAdmin()

  const { id } = await params
  const attachment = await getAdminEmailAttachmentForDownload(id)

  if (!attachment) {
    return NextResponse.json({ error: 'Attachment not found.' }, { status: 404 })
  }

  const object = await getObjectFromR2(attachment.storageKey)
  const body = object.Body

  if (!body) {
    return NextResponse.json({ error: 'Attachment file is empty.' }, { status: 404 })
  }

  return new Response(body.transformToWebStream(), {
    headers: {
      'Content-Type': attachment.contentType,
      'Content-Length': String(attachment.sizeBytes),
      'Content-Disposition': `attachment; filename="${encodeAttachmentFilename(attachment.filename)}"`,
      'Cache-Control': 'private, no-store',
    },
  })
}

function encodeAttachmentFilename(filename: string) {
  return filename.replace(/["\r\n]/g, '_')
}
