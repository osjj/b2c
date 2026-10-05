import { caseGallerySchema, caseSectionSchema } from './types'
import type { CaseInput } from './types'

const missingMetadataMessage = 'Saved image layout information is missing. Reload the case before saving.'

/**
 * Refuse an outdated editor payload that would silently erase existing layout.
 * Explicit blank values are intentional edits; omitted records are deletions.
 * Matching uses content identity, never array order or guessed image meaning.
 */
export function caseLayoutWriteErrors(
  existing: { sections: unknown; gallery: unknown },
  incoming: Pick<CaseInput, 'sections' | 'gallery'>,
): Record<string, string[]> {
  const sections = caseSectionSchema.array().safeParse(existing.sections)
  const gallery = caseGallerySchema.array().safeParse(existing.gallery)
  if (!sections.success || !gallery.success) {
    return { _form: ['Existing image layout could not be checked. Reload the case before saving.'] }
  }

  const errors: Record<string, string[]> = {}
  const keyedSections = sections.data.filter((section) => Boolean(section.key))
  incoming.sections.forEach((section, index) => {
    if (section.key !== undefined) return
    const retainedSection = keyedSections.some((previous) => previous.title === section.title || previous.body === section.body)
    if (retainedSection) errors[`sections.${index}.key`] = [missingMetadataMessage]
  })

  const assignedUrls = new Set(gallery.data.filter((image) => Boolean(image.placement)).map((image) => image.url))
  incoming.gallery.forEach((image, index) => {
    if (image.placement === undefined && assignedUrls.has(image.url)) {
      errors[`gallery.${index}.placement`] = [missingMetadataMessage]
    }
  })
  return errors
}
