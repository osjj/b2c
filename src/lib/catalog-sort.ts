export const catalogSortOptions = [
  { value: 'catalog', label: 'Catalog order', orderBy: 'sortOrder' },
  { value: 'newest', label: 'Newest', orderBy: 'createdAt' },
  { value: 'price-asc', label: 'Base Price: Low to High', orderBy: 'price' },
  { value: 'price-desc', label: 'Base Price: High to Low', orderBy: 'price' },
  { value: 'name', label: 'Name', orderBy: 'name' },
] as const

export type CatalogSortValue = (typeof catalogSortOptions)[number]['value']

export function getCatalogSort(value: unknown) {
  const sort = catalogSortOptions.find((option) => option.value === value) ?? catalogSortOptions[0]
  return {
    value: sort.value,
    orderBy: sort.orderBy,
    priceDirection: sort.value === 'price-desc' ? 'desc' : 'asc',
  } as const
}
