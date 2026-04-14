const DEFAULT_BRAND = 'Laifappe'
const DEFAULT_MAX_TITLE_LENGTH = 60

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function truncateTitle(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value
  }

  const truncated = value.slice(0, maxLength - 3).trim()
  const separatorIndex = Math.max(
    truncated.lastIndexOf(' '),
    truncated.lastIndexOf('|'),
    truncated.lastIndexOf('-'),
    truncated.lastIndexOf('/')
  )

  const safeCutoff = separatorIndex > Math.floor(maxLength / 2) ? separatorIndex : truncated.length
  return `${truncated.slice(0, safeCutoff).trim()}...`
}

type BuildPageTitleOptions = {
  brand?: string
  includeBrand?: boolean
  maxLength?: number
}

export function buildPageTitle(
  value: string,
  {
    brand = DEFAULT_BRAND,
    includeBrand = true,
    maxLength = DEFAULT_MAX_TITLE_LENGTH,
  }: BuildPageTitleOptions = {}
): string {
  const title = normalizeWhitespace(value)

  if (!title) {
    return brand
  }

  if (!includeBrand || title.toLowerCase().includes(brand.toLowerCase())) {
    return truncateTitle(title, maxLength)
  }

  const withBrand = `${title} | ${brand}`
  if (withBrand.length <= maxLength) {
    return withBrand
  }

  return truncateTitle(title, maxLength)
}
