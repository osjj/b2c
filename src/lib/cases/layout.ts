import { isCaseSectionKey, type CaseInput } from './types'

type CaseSection = CaseInput['sections'][number]
type CaseGalleryImage = CaseInput['gallery'][number]
type CaseLayout = Pick<CaseInput, 'buyerProfile' | 'procurement' | 'customization' | 'sections' | 'timeline' | 'gallery'>

export type IndexedCaseImage = { image: CaseGalleryImage; index: number }

/** Stable keyed placements double as safe HTML IDs; legacy IDs cannot receive assignments. */
export function caseSectionPlacement(section: Pick<CaseSection, 'key'>, index: number): string {
  return section.key && isCaseSectionKey(section.key) ? `section:${section.key}` : `legacy-section-${index + 1}`
}

function populatedPlacements(value: CaseLayout): Set<string> {
  const placements = new Set<string>()
  if (value.buyerProfile.trim()) placements.add('buyer-context')
  if (value.procurement.length) placements.add('procurement-scope')
  if (value.customization.trim()) placements.add('customization')
  if (value.timeline.length) placements.add('project-timeline')
  const keyCounts = new Map<string, number>()
  value.sections.forEach(({ key }) => {
    if (key) keyCounts.set(key, (keyCounts.get(key) ?? 0) + 1)
  })
  value.sections.forEach((section) => {
    if (section.key && isCaseSectionKey(section.key) && keyCounts.get(section.key) === 1 && section.title.trim() && section.body.trim()) {
      placements.add(`section:${section.key}`)
    }
  })
  return placements
}

/** Original gallery indexes preserve sequence, captions and the source evidence identity. */
export function caseImagesAt(value: CaseLayout, placement: string): IndexedCaseImage[] {
  if (!populatedPlacements(value).has(placement)) return []
  return value.gallery.flatMap((image, index) => image.placement === placement ? [{ image, index }] : [])
}

/** Keep all unassigned or invalid legacy evidence available, rather than dropping an image. */
export function caseUnplacedImages(value: CaseLayout): IndexedCaseImage[] {
  const placements = populatedPlacements(value)
  return value.gallery.flatMap((image, index) => !image.placement || !placements.has(image.placement) ? [{ image, index }] : [])
}

/** Called once when loading the editor; subsequent heading edits and moves retain keys. */
export function initializeCaseSectionKeys(sections: CaseSection[]): CaseSection[] {
  const occupied = new Set(sections.flatMap(({ key }) => key ? [key] : []))
  return sections.map((section, index) => {
    if (section.key) return { ...section }
    const titleSlug = section.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    const stem = `story-${titleSlug || index + 1}`.slice(0, 72).replace(/-$/, '')
    let key = stem
    let suffix = 2
    while (occupied.has(key)) key = `${stem}-${suffix++}`
    occupied.add(key)
    return { ...section, key }
  })
}

/** Removing a section releases only its image assignments, never the documentary images. */
export function clearCaseSectionPlacement(gallery: CaseGalleryImage[], key: string | undefined): CaseGalleryImage[] {
  if (!key) return gallery.map((image) => ({ ...image }))
  return gallery.map((image) => image.placement === `section:${key}` ? { ...image, placement: '' } : { ...image })
}
