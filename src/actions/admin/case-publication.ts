'use server'

import { requireAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { caseLayoutWriteErrors } from '@/lib/cases/layout-write-guard'
import { parseCasePrivateImage } from '@/lib/cases/private-image-path'
import { publishCasePrivateImage } from '@/lib/cases/publication-images'
import {
  caseGallerySchema, caseImagePreparationResultSchema, casePublicationImageRequestSchema,
  type CaseImagePreparationResult,
} from '@/lib/cases/types'

/** A short, idempotent media step. The normal save action alone publishes the case. */
export async function prepareCasePublicationImage(
  input: unknown, sourceUrl: string, id: string, expectedVersion: number,
): Promise<CaseImagePreparationResult> {
  // Preserve framework auth redirects and do not read private data before auth.
  await requireAdmin()
  const parsed = casePublicationImageRequestSchema.safeParse({ input, sourceUrl, id, expectedVersion })
  if (!parsed.success) {
    const errors: Record<string, string[]> = {}
    for (const issue of parsed.error.issues) {
      const path = issue.path[0] === 'input' ? issue.path.slice(1) : issue.path
      const key = path.map(String).join('.') || '_form'
      errors[key] = [...(errors[key] ?? []), issue.message]
    }
    return { success: false, reason: 'Review the highlighted publication fields. No images were prepared.', errors }
  }
  const request = parsed.data
  try {
    const existing = await prisma.caseStudy.findUnique({
      where: { id: request.id },
      select: { version: true, coverImage: true, sections: true, gallery: true, procurement: true },
    })
    if (!existing) return { success: false, reason: 'Case not found. No images were prepared.' }
    if (existing.version !== request.expectedVersion) {
      return { success: false, reason: 'This case changed in another editor. Reload before publishing; your changes were not overwritten.' }
    }
    const layoutErrors = caseLayoutWriteErrors(existing, request.input)
    if (Object.keys(layoutErrors).length) {
      return {
        success: false,
        reason: 'This editor is missing saved case display or link information. Reload before publishing.',
        errors: layoutErrors,
      }
    }
    const savedGallery = caseGallerySchema.array().safeParse(existing.gallery)
    if (!savedGallery.success) return { success: false, reason: 'Saved images could not be checked. Reload before publishing.' }
    const savedUrls = new Set([existing.coverImage, ...savedGallery.data.map((image) => image.url)])
    const candidateUrls = new Set([request.input.coverImage, ...request.input.gallery.map((image) => image.url)])
    // Check the whole candidate before preparing even its first image.
    for (const url of candidateUrls) {
      const image = parseCasePrivateImage(url)
      if (image && (image.caseId !== request.id || !savedUrls.has(url))) {
        return { success: false, reason: 'Imported images must belong to this saved case. Save or reload the draft before publishing.' }
      }
    }
    if (!candidateUrls.has(request.sourceUrl) || !savedUrls.has(request.sourceUrl)) {
      return { success: false, reason: 'This image is no longer part of the saved case. Reload before publishing.' }
    }
    const url = await publishCasePrivateImage(request.id, request.sourceUrl)
    return caseImagePreparationResultSchema.parse({ success: true, reason: 'Image is ready for publication.', sourceUrl: request.sourceUrl, url })
  } catch {
    // Do not expose storage paths, credentials, raw SDK errors or customer evidence.
    return { success: false, reason: 'An image could not be prepared for publication. Your edits are kept and no publication changes were saved. Retry, or replace the affected image.' }
  }
}
