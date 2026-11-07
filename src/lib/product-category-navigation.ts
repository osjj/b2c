import type { CategoryListItem } from '@/actions/categories'

type CategoryNavigationInput = Pick<CategoryListItem, 'id' | 'name' | 'slug' | 'parentId' | 'isActive' | 'sortOrder'> & {
  parent: Pick<NonNullable<CategoryListItem['parent']>, 'slug' | 'isActive'> | null
}

const categoryTieBreakOrder = [
  'fall-protection',
  'respiratory-protection',
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
  categoryTieBreakOrder.map((slug, index) => [slug, index]),
)

function getCategoryRank(slug: string) {
  if (slug === 'other-supplies') return Number.MAX_SAFE_INTEGER
  return categoryRanks.get(slug) ?? categoryTieBreakOrder.length
}

export function buildProductCategoryNavigation(categories: readonly CategoryNavigationInput[]) {
  return categories
    .filter((category) => {
      if (!category.isActive || category.slug === 'uncategorized') return false
      if (category.parentId === null) return true

      // These protection types get their own catalog entry while retaining
      // their existing category hierarchy and canonical URLs.
      return (
        (category.slug === 'hearing-protection' || category.slug === 'rainwear') &&
        category.parent?.isActive === true
      )
    })
    .sort((left, right) => {
      const order = left.sortOrder - right.sortOrder || getCategoryRank(left.slug) - getCategoryRank(right.slug)
      if (order !== 0 || left.slug === right.slug) return order
      return left.slug < right.slug ? -1 : 1
    })
    .map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      href: category.parent
        ? `/categories/${category.parent.slug}/${category.slug}`
        : `/categories/${category.slug}`,
    }))
}
