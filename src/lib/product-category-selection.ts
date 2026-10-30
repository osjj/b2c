import type { Category } from '@prisma/client'
import { buildProductCategoryNavigation } from './product-category-navigation'

type CategoryInput = Pick<Category, 'id' | 'name' | 'slug' | 'parentId' | 'isActive' | 'sortOrder'>
type CategoryOption = Pick<Category, 'id' | 'name'>

export type ProductCategorySelection = {
  value: string
  mainCategories: ReturnType<typeof buildProductCategoryNavigation>
  mainCategoryId: string
  subcategories: CategoryOption[]
  subcategoryId: string
  currentCategory: CategoryOption | null
  selectableCategoryIds: Set<string>
}

export function buildProductCategorySelection(
  categories: readonly CategoryInput[],
  categoryId: string | null,
): ProductCategorySelection {
  const value = categoryId || 'none'
  const categoriesById = new Map(categories.map((category) => [category.id, category]))
  const publicCategories = categories.filter((category) => {
    const seen = new Set<string>()
    let current: CategoryInput | undefined = category
    while (current) {
      if (!current.isActive || current.slug === 'uncategorized' || seen.has(current.id)) return false
      seen.add(current.id)
      if (current.parentId === null) return true
      current = categoriesById.get(current.parentId)
    }
    return false
  })
  const mainCategories = buildProductCategoryNavigation(publicCategories.map((category) => ({
    ...category,
    parent: category.parentId ? categoriesById.get(category.parentId) ?? null : null,
  })))
  const mainIds = new Set(mainCategories.map(({ id }) => id))
  const selectableCategoryIds = new Set(publicCategories.map(({ id }) => id))
  const currentCategory = value !== 'none' && !selectableCategoryIds.has(value)
    ? { id: value, name: categoriesById.get(value)?.name ?? 'Unknown category' }
    : null

  // The nearest overview entry owns a detail, including promoted child branches.
  let mainCategoryId = value
  if (!currentCategory) {
    let current = categoriesById.get(value)
    while (current && !mainIds.has(current.id)) {
      current = current.parentId ? categoriesById.get(current.parentId) : undefined
    }
    mainCategoryId = current?.id ?? 'none'
  }

  const childrenByParent = new Map<string, CategoryInput[]>()
  for (const category of publicCategories) {
    if (category.parentId === null) continue
    const children = childrenByParent.get(category.parentId) ?? []
    children.push(category)
    childrenByParent.set(category.parentId, children)
  }
  for (const children of childrenByParent.values()) {
    children.sort((left, right) => left.sortOrder - right.sortOrder)
  }
  const subcategories: CategoryOption[] = []
  function addSubcategories(parentId: string, prefix = '') {
    for (const child of childrenByParent.get(parentId) ?? []) {
      if (mainIds.has(child.id)) continue
      const name = prefix ? `${prefix} / ${child.name}` : child.name
      subcategories.push({ id: child.id, name })
      addSubcategories(child.id, name)
    }
  }
  if (!currentCategory && mainCategoryId !== 'none') addSubcategories(mainCategoryId)

  return {
    value,
    mainCategories,
    mainCategoryId,
    subcategories,
    subcategoryId: !currentCategory && value !== mainCategoryId ? value : 'none',
    currentCategory,
    selectableCategoryIds,
  }
}
