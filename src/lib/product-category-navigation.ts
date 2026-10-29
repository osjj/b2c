import type { CategoryListItem } from '@/actions/categories'

const categoryOrder = [
  'fall-protection',
  'respiratory-protection',
  'other-supplies',
  'body-protection',
  'hand-protection',
  'hearing-protection',
  'head-protection',
  'firefighting-equipment',
  'eye-protection',
  'rainwear',
  'foot-protection',
] as const

const categoryRanks = new Map<string, number>(
  categoryOrder.map((slug, index) => [slug, index]),
)

function getCategoryRank(slug: string) {
  if (slug === 'uncategorized') return Number.MAX_SAFE_INTEGER
  return categoryRanks.get(slug) ?? categoryOrder.length
}

export function buildProductCategoryNavigation(categories: readonly CategoryListItem[]) {
  return categories
    .filter((category) => {
      if (!category.isActive) return false
      if (category.parentId === null) return true

      // These protection types get their own catalog entry while retaining
      // their existing category hierarchy and canonical URLs.
      return (
        (category.slug === 'hearing-protection' || category.slug === 'rainwear') &&
        category.parent?.isActive === true
      )
    })
    .sort((left, right) => getCategoryRank(left.slug) - getCategoryRank(right.slug))
    .map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      href: category.parent
        ? `/categories/${category.parent.slug}/${category.slug}`
        : `/categories/${category.slug}`,
    }))
}
