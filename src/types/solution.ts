import type { Solution, SolutionSection } from '@prisma/client'
import { USAGE_SCENES, formatUsageSceneLabel, type UsageScene } from '@/lib/usage-scenes'

// Re-export usage scene utilities for convenience
export { USAGE_SCENES, formatUsageSceneLabel, type UsageScene }

// PPE Categories preset list
export const PPE_CATEGORIES = [
  { slug: 'head-protection', label: 'Head Protection', icon: 'HardHat' },
  { slug: 'hand-protection', label: 'Hand Protection', icon: 'Hand' },
  { slug: 'foot-protection', label: 'Foot Protection', icon: 'Footprints' },
  { slug: 'eye-protection', label: 'Eye Protection', icon: 'Eye' },
  { slug: 'fall-protection', label: 'Fall Protection', icon: 'Shield' },
  { slug: 'respiratory', label: 'Respiratory Protection', icon: 'Wind' },
  { slug: 'body-protection', label: 'Body Protection', icon: 'Shirt' },
] as const

export type SolutionSectionType =
  | 'hero'
  | 'paragraphs'
  | 'list'
  | 'table'
  | 'group'
  | 'taskCards'
  | 'callout'
  | 'cta'
  | 'faq'

export type RecommendationMode = 'rule' | 'manual'

export interface SectionHeroData {
  intro: string
  bullets?: string[]
}

export interface SectionParagraphsData {
  paragraphs: string[]
  mode?: RecommendationMode
}

export interface SectionListData {
  items: { title?: string; text?: string }[]
}

export interface SectionTableData {
  headers: string[]
  rows: string[][]
}

export interface SectionGroupData {
  groups: { title: string; items: string[] }[]
}

export interface SectionTaskCardsData {
  cards: {
    scene: UsageScene
    checked: boolean
    title: string
    description: string
    items: string[]
  }[]
}

export interface SectionCalloutData {
  text: string
}

export interface SectionCtaData {
  title: string
  text: string
  primaryLabel: string
  primaryHref: string
  secondaryLabel?: string
  secondaryHref?: string
}

export interface SectionFaqData {
  items: { q: string; a: string }[]
}

export type SolutionSectionData =
  | SectionHeroData
  | SectionParagraphsData
  | SectionListData
  | SectionTableData
  | SectionGroupData
  | SectionTaskCardsData
  | SectionCalloutData
  | SectionCtaData
  | SectionFaqData

export interface SolutionSectionItem extends Omit<SolutionSection, 'data'> {
  data: SolutionSectionData
}

export interface SolutionSectionInput {
  key: string
  type: SolutionSectionType
  title?: string | null
  enabled: boolean
  sort?: number
  data: SolutionSectionData
}

// Legacy types used by existing admin components (kept for compatibility)
export interface PpeCategoryItem {
  categorySlug: string
  description: string
}

export interface MaterialItem {
  material: string
  description: string
}

// Solution with typed sections
export interface SolutionWithTypedFields extends Omit<Solution, 'sections'> {
  sections: SolutionSectionItem[]
}

// Form data for creating/updating Solution
export interface SolutionFormData {
  slug: string
  title: string
  excerpt?: string | null
  usageScenes: string[]
  coverImage?: string | null
  isActive: boolean
  sortOrder: number
  seoTitle?: string | null
  seoDescription?: string | null
  seoKeywords?: string | null
  sections?: SolutionSectionInput[] | null
}

// Solution list item for admin/store listings
export interface SolutionListItem {
  id: string
  slug: string
  title: string
  excerpt: string | null
  usageScenes: string[]
  coverImage: string | null
  isActive: boolean
  sortOrder: number
  createdAt: Date
  updatedAt: Date
}
