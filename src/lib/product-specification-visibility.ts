export type ProductSpecification = {
  name: string
  value: string
}

const HIDDEN_STOREFRONT_SPEC_KEYS = new Set([
  'source',
  'sourceurl',
  'sourcelink',
  'sourcepageurl',
  'originalsourceurl',
  'alibabasourceurl',
  '1688sourceurl',
  'sourceurl1688',
  'notionsource',
  'purchaseprice',
])

function normalizeSpecificationName(name: string): string {
  return name.toLowerCase().replace(/[\s_-]+/g, '')
}

function isProductSpecification(value: unknown): value is ProductSpecification {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Record<string, unknown>
  return typeof candidate.name === 'string' && typeof candidate.value === 'string'
}

export function getStorefrontVisibleProductSpecifications(
  specifications: unknown
): ProductSpecification[] {
  if (!Array.isArray(specifications)) {
    return []
  }

  return specifications
    .filter(isProductSpecification)
    .filter((specification) => {
      const normalizedName = normalizeSpecificationName(specification.name)
      return !HIDDEN_STOREFRONT_SPEC_KEYS.has(normalizedName)
    })
}
