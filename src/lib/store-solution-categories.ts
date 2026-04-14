type StoreSolutionCategoryInput = {
  slug: string
  name: string
  isActive: boolean
}

type StoreSolutionCategoryOutput = {
  slug: string
  label: string
  icon: 'HardHat' | 'Hand' | 'Footprints' | 'Eye' | 'Shield' | 'Wind' | 'Shirt'
}

const STORE_SOLUTION_CATEGORY_META: Array<{
  slug: string
  icon: StoreSolutionCategoryOutput['icon']
  label?: string
}> = [
  { slug: 'head-protection', icon: 'HardHat' },
  { slug: 'hand-protection', icon: 'Hand' },
  { slug: 'foot-protection', icon: 'Footprints' },
  { slug: 'eye-protection', icon: 'Eye' },
  { slug: 'fall-protection', icon: 'Shield' },
  { slug: 'respiratory-protection', icon: 'Wind' },
  { slug: 'body-protection', icon: 'Shirt' },
]

export function buildStoreSolutionCategories(
  categories: StoreSolutionCategoryInput[]
): StoreSolutionCategoryOutput[] {
  const categoryMap = new Map(
    categories
      .filter((category) => category.isActive)
      .map((category) => [category.slug, category] as const)
  )

  return STORE_SOLUTION_CATEGORY_META.flatMap((meta) => {
    const category = categoryMap.get(meta.slug)
    if (!category) {
      return []
    }

    return [
      {
        slug: category.slug,
        label: meta.label || category.name,
        icon: meta.icon,
      },
    ]
  })
}

export function normalizePublicCtaHref(href: string) {
  return href === '/quote' ? '/contact' : href
}
