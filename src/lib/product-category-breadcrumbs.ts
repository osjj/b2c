import type { Category } from '@prisma/client'

type CategoryBreadcrumbInput = Pick<Category, 'name' | 'slug' | 'isActive'>
type ProductCategoryBreadcrumbInput = CategoryBreadcrumbInput & {
  parent: CategoryBreadcrumbInput | null
}

type ProductCategoryBreadcrumb = {
  name: string
  href: string
}

export function buildProductCategoryBreadcrumbs(
  category: ProductCategoryBreadcrumbInput | null | undefined,
): ProductCategoryBreadcrumb[] {
  if (!category) return []

  const parent = category.parent
  if (!category.isActive) {
    return parent?.isActive
      ? [{ name: parent.name, href: `/categories/${parent.slug}` }]
      : []
  }

  if (parent?.isActive) {
    return [
      { name: parent.name, href: `/categories/${parent.slug}` },
      { name: category.name, href: `/categories/${parent.slug}/${category.slug}` },
    ]
  }

  return [{ name: category.name, href: `/categories/${category.slug}` }]
}
