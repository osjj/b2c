import type { Industry, Solution } from '@prisma/client'
import type { OutputData } from '@editorjs/editorjs'

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

// Materials preset list
export const MATERIALS = [
  { key: 'abs-plastic', label: 'ABS Plastic' },
  { key: 'cowhide-leather', label: 'Cowhide Leather' },
  { key: 'rubber', label: 'Rubber' },
  { key: 'nylon', label: 'Nylon' },
  { key: 'polyester', label: 'Polyester' },
  { key: 'steel', label: 'Steel' },
  { key: 'kevlar', label: 'Kevlar' },
  { key: 'nitrile', label: 'Nitrile' },
] as const

// Industry labels for display
export const INDUSTRY_LABELS: Record<Industry, string> = {
  CONSTRUCTION: 'Construction',
  FACTORY: 'Factory',
  MINING: 'Mining',
  ELECTRICAL: 'Electrical',
  WAREHOUSE: 'Warehouse',
  CHEMICAL: 'Chemical',
  FOOD_PROCESSING: 'Food Processing',
  LOGISTICS: 'Logistics',
}

// PPE Category item stored in Solution.ppeCategories JSON
export interface PpeCategoryItem {
  categorySlug: string
  description: string
}

// Material item stored in Solution.materials JSON
export interface MaterialItem {
  material: string
  description: string
}

// Solution with typed JSON fields
export interface SolutionWithTypedFields extends Omit<Solution, 'hazardsContent' | 'standardsContent' | 'faqContent' | 'ppeCategories' | 'materials'> {
  hazardsContent: OutputData | null
  standardsContent: OutputData | null
  faqContent: OutputData | null
  ppeCategories: PpeCategoryItem[] | null
  materials: MaterialItem[] | null
}

// Form data for creating/updating Solution
export interface SolutionFormData {
  slug: string
  title: string
  subtitle?: string | null
  industry: Industry
  coverImage?: string | null
  isActive: boolean
  sortOrder: number
  hazardsContent?: OutputData | null
  standardsContent?: OutputData | null
  faqContent?: OutputData | null
  ppeCategories?: PpeCategoryItem[] | null
  materials?: MaterialItem[] | null
  metaTitle?: string | null
  metaDescription?: string | null
  metaKeywords?: string | null
}

// Solution list item for admin/store listings
export interface SolutionListItem {
  id: string
  slug: string
  title: string
  subtitle: string | null
  industry: Industry
  coverImage: string | null
  isActive: boolean
  sortOrder: number
  createdAt: Date
  updatedAt: Date
}

// Re-export Industry enum type
export type { Industry }
