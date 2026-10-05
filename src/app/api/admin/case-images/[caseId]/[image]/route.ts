import { NextResponse } from 'next/server'

import { getCurrentUser } from '@/lib/auth-utils'
import { parseCasePrivateImage } from '@/lib/cases/private-image-path'
import { getCasePrivateImage } from '@/lib/cases/private-media'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const privateHeaders = {
  'Cache-Control': 'private, no-store',
  'X-Content-Type-Options': 'nosniff',
  'X-Robots-Tag': 'noindex, nofollow',
}

function errorResponse(status: number, reason: string): NextResponse {
  return NextResponse.json({ success: false, reason }, { status, headers: privateHeaders })
}

export async function GET(request: Request, { params }: { params: Promise<{ caseId: string; image: string }> }): Promise<NextResponse> {
  try {
    // Authorization precedes every DB/storage read, including malformed paths.
    const user = await getCurrentUser()
    if (!user) return errorResponse(401, 'Authentication required.')
    if (user.role !== 'ADMIN') return errorResponse(403, 'Administrator access required.')
    const { caseId, image } = await params
    const imageUrl = `/api/admin/case-images/${caseId}/${image}`
    if (!parseCasePrivateImage(imageUrl) || new URL(request.url).search) return errorResponse(404, 'Image not found.')

    const record = await prisma.caseStudy.findUnique({ where: { id: caseId }, select: { coverImage: true, gallery: true } })
    const isGalleryReference = Array.isArray(record?.gallery) && record.gallery.some((entry) => {
      return typeof entry === 'object' && entry !== null && !Array.isArray(entry) && 'url' in entry && entry.url === imageUrl
    })
    if (!record || (record.coverImage !== imageUrl && !isGalleryReference)) return errorResponse(404, 'Image not found.')
    const stored = await getCasePrivateImage(caseId, image)
    return new NextResponse(new Uint8Array(stored.bytes), {
      headers: {
        ...privateHeaders,
        'Content-Type': stored.contentType,
        'Content-Length': String(stored.bytes.length),
        'Content-Disposition': `inline; filename="${image}"`,
      },
    })
  } catch {
    // SDK/DB errors can contain endpoints, object keys or credentials. Never
    // include those raw values in responses or logs.
    console.error({ operation: 'case_private_image_get', code: 'PRIVATE_MEDIA_UNAVAILABLE' })
    return errorResponse(503, 'The private image is temporarily unavailable.')
  }
}
