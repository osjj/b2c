import { buildPageTitle } from './seo-title'

const CATEGORY_PAGE_SIZE = 12
const MAX_PRISMA_OFFSET = 2_147_483_647
// Prisma's skip argument is a signed 32-bit integer. A valid category page
// must keep (page - 1) * the fixed twelve-product page size within that range.
export const MAX_CATEGORY_PAGE = Math.floor(MAX_PRISMA_OFFSET / CATEGORY_PAGE_SIZE) + 1

function isCategoryPage(page: number): boolean {
  return Number.isSafeInteger(page) && page > 0 && page <= MAX_CATEGORY_PAGE
}

export function normalizeCategoryPage(value: unknown): number {
  if (typeof value !== 'string' || !/^\d+$/.test(value)) return 1
  const page = Number(value)
  return isCategoryPage(page) ? page : 1
}

export function buildCategoryPagePath(slug: string, parentSlug?: string | null, page = 1): string {
  const path = parentSlug ? `/categories/${parentSlug}/${slug}` : `/categories/${slug}`
  return isCategoryPage(page) && page > 1 ? `${path}?page=${page}` : path
}

export function buildCategoryPageTitle(title: string, page = 1): string {
  if (!isCategoryPage(page) || page < 2) return buildPageTitle(title)
  const suffix = ` - Page ${page}`
  // Reserve the suffix before title truncation, so long curated titles still
  // identify the requested page in search results.
  const pageTitle = `${buildPageTitle(title, { includeBrand: false, maxLength: 60 - suffix.length })}${suffix}`
  return buildPageTitle(pageTitle)
}
