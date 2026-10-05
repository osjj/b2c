import { z } from 'zod'
import { isCasePrivateImage } from './private-image-path'

export const CASE_STATUSES = ['DRAFT', 'PUBLISHED', 'ARCHIVED'] as const
export const caseStatusSchema = z.enum(CASE_STATUSES)
export type CaseStatus = z.infer<typeof caseStatusSchema>

export const CASE_BUILTIN_PLACEMENTS = ['buyer-context', 'procurement-scope', 'customization', 'project-timeline'] as const
export type CaseBuiltinPlacement = typeof CASE_BUILTIN_PLACEMENTS[number]

export function isCaseSectionKey(value: string): boolean {
  return value.length <= 80 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)
}

export function isCaseGalleryPlacement(value: string): boolean {
  return !value || CASE_BUILTIN_PLACEMENTS.some((placement) => placement === value)
    || (value.startsWith('section:') && isCaseSectionKey(value.slice('section:'.length)))
}

/** Calendar validation deliberately rejects dates that JS would normalize. */
export function isCaseDate(value: string): boolean {
  if (!value) return true
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

function isSafePath(value: string): boolean {
  return /^\/[A-Za-z0-9._/-]+$/.test(value)
    && !value.includes('//')
    && !value.split('/').some((segment) => segment === '..' || segment === '.')
}

/** Remote media is limited to the store's configured image origin. */
export function isAllowedCaseImage(value: string): boolean {
  if (!value) return true
  if (isCasePrivateImage(value)) return true
  if (value.startsWith('/')) return isSafePath(value) && !/^\/(api|admin)(\/|$)/.test(value)
  try {
    const image = new URL(value)
    const configured = new URL(process.env.R2_PUBLIC_URL || 'https://shop.laifappe.com')
    return image.href === value && image.protocol === 'https:' && !image.username && !image.password
      && image.origin === configured.origin && !image.search && !image.hash
      && isSafePath(image.pathname) && !/^\/(api|admin)(\/|$)/.test(image.pathname)
  } catch {
    return false
  }
}

export function isAllowedCaseRelatedLink(value: string): boolean {
  return isSafePath(value) && /^\/(products|categories|solutions|blog|cases|quote|contact)(\/|$)/.test(value)
}

const text = (max: number) => z.string().trim().max(max)
const dateSchema = text(10).refine(isCaseDate, 'Use a real calendar date in YYYY-MM-DD format')
const imageSchema = text(2048).refine(isAllowedCaseImage, 'Use a local image path or the configured HTTPS image host; no signed or query URLs')

export const caseProcurementSchema = z.object({
  name: text(160).min(1, 'Product name is required'),
  quantity: z.number().int().positive().max(1_000_000_000),
  unit: text(40).min(1, 'Unit is required'),
  note: text(1000),
})
export const caseSectionSchema = z.object({
  key: text(80).refine((value) => !value || isCaseSectionKey(value), 'Use a lowercase section key separated by single hyphens').optional(),
  title: text(160).min(1),
  body: text(12000).min(1),
})
export const caseTimelineSchema = z.object({ date: dateSchema, label: text(160).min(1), description: text(2000) })
export const caseGallerySchema = z.object({
  url: imageSchema.refine(Boolean, 'Image URL is required'),
  alt: text(300).min(1, 'Describe the image for accessibility'),
  caption: text(1000),
  placement: text(88).refine(isCaseGalleryPlacement, 'Choose a content block or a stable story section').optional(),
})
export const caseRelatedLinkSchema = z.object({
  label: text(160).min(1),
  href: text(500).refine(isAllowedCaseRelatedLink, 'Use a canonical internal product, category, solution, blog, case, quote or contact path'),
})

const caseFieldsSchema = z.object({
  title: text(200).min(1, 'Title is required'),
  slug: text(160).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase words separated by single hyphens'),
  summary: text(1500),
  country: text(100),
  industry: text(100),
  cooperationDate: dateSchema,
  buyerProfile: text(3000),
  coverImage: imageSchema,
  coverAlt: text(300),
  procurement: z.array(caseProcurementSchema).max(40),
  customization: text(6000),
  sections: z.array(caseSectionSchema).max(20),
  timeline: z.array(caseTimelineSchema).max(30),
  gallery: z.array(caseGallerySchema).max(30),
  relatedLinks: z.array(caseRelatedLinkSchema).max(12),
  featured: z.boolean(),
  sortOrder: z.number().int().min(-100000).max(100000),
  seoTitle: text(160),
  seoDescription: text(300),
})

export const caseInputSchema = caseFieldsSchema.extend({
  status: caseStatusSchema.default('DRAFT'),
  privateNotes: text(12000),
  publicationApproved: z.boolean().default(false),
}).superRefine((value, context) => {
  const sectionKeys = new Map<string, number>()
  value.sections.forEach((section, index) => {
    if (!section.key) return
    const previousIndex = sectionKeys.get(section.key)
    if (previousIndex !== undefined) {
      context.addIssue({ code: 'custom', path: ['sections', index, 'key'], message: 'Story section keys must be unique' })
      context.addIssue({ code: 'custom', path: ['sections', previousIndex, 'key'], message: 'Story section keys must be unique' })
    } else {
      sectionKeys.set(section.key, index)
    }
  })
  const populatedPlacements = new Set<string>()
  if (value.buyerProfile) populatedPlacements.add('buyer-context')
  if (value.procurement.length) populatedPlacements.add('procurement-scope')
  if (value.customization) populatedPlacements.add('customization')
  if (value.timeline.length) populatedPlacements.add('project-timeline')
  value.sections.forEach((section) => {
    if (section.key && section.title && section.body) populatedPlacements.add(`section:${section.key}`)
  })
  value.gallery.forEach((image, index) => {
    if (image.placement && !populatedPlacements.has(image.placement)) {
      context.addIssue({ code: 'custom', path: ['gallery', index, 'placement'], message: 'The selected block needs content or no longer exists. Add content or choose another image position.' })
    }
  })
  if (value.coverImage && !value.coverAlt) {
    context.addIssue({ code: 'custom', path: ['coverAlt'], message: 'Cover alt text is required when a cover image is supplied' })
  }
  if (value.status !== 'PUBLISHED') return
  if (isCasePrivateImage(value.coverImage)) {
    context.addIssue({ code: 'custom', path: ['coverImage'], message: 'Private draft originals cannot be published. Supply separately approved public images first.' })
  }
  value.gallery.forEach((image, index) => {
    if (isCasePrivateImage(image.url)) {
      context.addIssue({ code: 'custom', path: ['gallery', index, 'url'], message: 'Private draft originals cannot be published. Supply separately approved public images first.' })
    }
  })
  if (!value.publicationApproved) {
    context.addIssue({ code: 'custom', path: ['publicationApproved'], message: 'Confirm factual review and image/customer publication permission before publishing' })
  }
  for (const field of ['summary', 'country', 'industry'] as const) {
    if (!value[field]) context.addIssue({ code: 'custom', path: [field], message: 'Required for publication' })
  }
  if (!value.procurement.length) context.addIssue({ code: 'custom', path: ['procurement'], message: 'Add at least one procurement item before publishing' })
  if (!value.sections.length) context.addIssue({ code: 'custom', path: ['sections'], message: 'Add at least one narrative section before publishing' })
})
export type CaseInput = z.infer<typeof caseInputSchema>

export function hasCasePrivateImages(value: Pick<CaseInput, 'coverImage' | 'gallery'>): boolean {
  return isCasePrivateImage(value.coverImage) || value.gallery.some((image) => isCasePrivateImage(image.url))
}

export const caseViewSchema = caseFieldsSchema.extend({
  id: z.string().min(1),
  version: z.number().int().positive(),
  publishedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})
export type CaseView = z.infer<typeof caseViewSchema>
export const adminCaseViewSchema = caseViewSchema.extend({
  status: caseStatusSchema,
  publicationApproved: z.boolean(),
  privateNotes: text(12000),
})
export type AdminCaseView = z.infer<typeof adminCaseViewSchema>
export const caseSaveResultSchema = z.object({
  success: z.boolean(),
  reason: z.string(),
  id: z.string().optional(),
  version: z.number().int().positive().optional(),
  errors: z.record(z.string(), z.array(z.string())).optional(),
})
export type CaseSaveResult = z.infer<typeof caseSaveResultSchema>

export function emptyCaseInput(): CaseInput {
  return {
    title: '', slug: '', summary: '', country: '', industry: '', cooperationDate: '', buyerProfile: '',
    coverImage: '', coverAlt: '', procurement: [], customization: '', sections: [], timeline: [], gallery: [],
    relatedLinks: [], featured: false, sortOrder: 0, seoTitle: '', seoDescription: '', status: 'DRAFT',
    publicationApproved: false, privateNotes: '',
  }
}

type CaseRecord = Omit<CaseView, 'cooperationDate' | 'publishedAt' | 'createdAt' | 'updatedAt' | 'procurement' | 'sections' | 'timeline' | 'gallery' | 'relatedLinks'> & {
  cooperationDate: Date | null
  publishedAt: Date | null
  createdAt: Date
  updatedAt: Date
  procurement: unknown
  sections: unknown
  timeline: unknown
  gallery: unknown
  relatedLinks: unknown
}

/** Explicit whitelist: private fields never reach public HTML or client props. */
export function toCaseView(record: CaseRecord): CaseView {
  return caseViewSchema.parse({
    id: record.id, slug: record.slug, title: record.title, summary: record.summary,
    country: record.country, industry: record.industry,
    cooperationDate: record.cooperationDate?.toISOString().slice(0, 10) ?? '',
    buyerProfile: record.buyerProfile, coverImage: record.coverImage, coverAlt: record.coverAlt,
    procurement: record.procurement, customization: record.customization, sections: record.sections,
    timeline: record.timeline, gallery: record.gallery, relatedLinks: record.relatedLinks,
    featured: record.featured, sortOrder: record.sortOrder, seoTitle: record.seoTitle, seoDescription: record.seoDescription,
    version: record.version, publishedAt: record.publishedAt?.toISOString() ?? null,
    createdAt: record.createdAt.toISOString(), updatedAt: record.updatedAt.toISOString(),
  })
}

export function toAdminCaseView(record: CaseRecord & { status: CaseStatus; publicationApproved: boolean; privateNotes: string }): AdminCaseView {
  return adminCaseViewSchema.parse({
    ...toCaseView(record), status: record.status,
    publicationApproved: record.publicationApproved, privateNotes: record.privateNotes,
  })
}

/** Zod object projection strips administrative fields for protected preview. */
export function publicCaseView(record: AdminCaseView): CaseView {
  return caseViewSchema.parse(record)
}
