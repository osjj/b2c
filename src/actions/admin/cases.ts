'use server'

import { Prisma } from '@prisma/client'
import { revalidatePath } from 'next/cache'

import { requireAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { caseInputSchema } from '@/lib/cases/types'
import type { CaseSaveResult } from '@/lib/cases/types'
import { parseCasePrivateImage } from '@/lib/cases/private-image-path'
import { caseLayoutWriteErrors } from '@/lib/cases/layout-write-guard'

type SavedCase = { id: string; version: number; oldSlug: string; slug: string }

function invalidateCase(saved: SavedCase): void {
  revalidatePath('/cases')
  revalidatePath(`/cases/${saved.slug}`)
  if (saved.oldSlug && saved.oldSlug !== saved.slug) revalidatePath(`/cases/${saved.oldSlug}`)
  revalidatePath('/admin/cases')
  revalidatePath(`/admin/cases/${saved.id}`)
  revalidatePath(`/admin/cases/${saved.id}/preview`)
  revalidatePath('/sitemap.xml')
}

export async function saveCaseStudy(input: unknown, id?: string, expectedVersion?: number): Promise<CaseSaveResult> {
  // Keep auth outside the catch: Next.js redirect errors must remain redirects.
  await requireAdmin()
  const parsed = caseInputSchema.safeParse(input)
  if (!parsed.success) {
    const errors: Record<string, string[]> = {}
    for (const issue of parsed.error.issues) {
      const key = issue.path.map(String).join('.') || '_form'
      errors[key] = [...(errors[key] ?? []), issue.message]
    }
    return { success: false, reason: 'Review the highlighted fields. Nothing was saved.', errors }
  }
  if (id && (!Number.isInteger(expectedVersion) || (expectedVersion ?? 0) < 1)) {
    return { success: false, reason: 'A valid editor version is required. Reload the case before saving.' }
  }
  if (id && id.length > 200) return { success: false, reason: 'Case not found.' }

  const value = parsed.data
  for (const url of [value.coverImage, ...value.gallery.map((image) => image.url)]) {
    const privateImage = parseCasePrivateImage(url)
    if (privateImage && (!id || privateImage.caseId !== id)) {
      return { success: false, reason: 'Private images may only be saved to their existing case. Nothing was saved.' }
    }
  }
  const data = {
    ...value,
    cooperationDate: value.cooperationDate ? new Date(`${value.cooperationDate}T00:00:00.000Z`) : null,
  }
  try {
    const result = await prisma.$transaction(async (tx): Promise<CaseSaveResult | SavedCase> => {
      if (!id) {
        // Creation is deliberately draft-only. Publishing requires a second explicit edit.
        const created = await tx.caseStudy.create({
          data: { ...data, status: 'DRAFT', publicationApproved: false, publishedAt: null },
          select: { id: true, version: true, slug: true },
        })
        return { ...created, oldSlug: '' }
      }

      const existing = await tx.caseStudy.findUnique({
        where: { id }, select: { id: true, slug: true, version: true, status: true, publishedAt: true, sections: true, gallery: true, procurement: true },
      })
      if (!existing) return { success: false, reason: 'Case not found. Nothing was saved.' }
      if (existing.version !== expectedVersion) {
        return { success: false, reason: 'This case changed in another editor. Reload before saving; your changes were not overwritten.' }
      }
      const layoutErrors = caseLayoutWriteErrors(existing, value)
      if (Object.keys(layoutErrors).length) {
        return {
          success: false,
          reason: 'This editor is missing saved case display or link information. Reload the case before saving. Nothing was saved.',
          errors: layoutErrors,
        }
      }
      const publishedAt = value.status === 'PUBLISHED'
        ? (existing.status === 'PUBLISHED' ? existing.publishedAt ?? new Date() : new Date())
        : null
      const updated = await tx.caseStudy.updateMany({
        where: { id, version: expectedVersion },
        data: { ...data, publishedAt, version: { increment: 1 } },
      })
      if (updated.count !== 1) {
        return { success: false, reason: 'This case changed in another editor. Reload before saving; your changes were not overwritten.' }
      }
      return { id, version: existing.version + 1, oldSlug: existing.slug, slug: value.slug }
    })

    if ('success' in result) return result
    // A cache invalidation failure cannot undo a committed write. Keep the
    // successful version in the response so the editor does not retry blindly.
    try {
      invalidateCase(result)
    } catch {
      console.error({ operation: 'case_study_revalidate', code: 'CACHE_INVALIDATION_FAILED' })
    }
    return {
      success: true,
      reason: id ? 'Case saved.' : 'Case created as an unpublished draft.',
      id: result.id, version: result.version,
    }
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return { success: false, reason: 'A case already uses this URL slug.', errors: { slug: ['Choose a unique slug'] } }
    }
    // Deliberately exclude payload, URLs, DB connection strings and customer evidence.
    console.error({ operation: 'case_study_save', code: error instanceof Prisma.PrismaClientKnownRequestError ? error.code : 'UNEXPECTED' })
    return { success: false, reason: 'The case could not be saved. Please retry; no success has been confirmed.' }
  }
}
