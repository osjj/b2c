const DEFAULT_BRAND = 'Laifappe'
const DEFAULT_MAX_TITLE_LENGTH = 60

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function truncateTitle(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value
  }

  const candidate = value.slice(0, maxLength).trim()
  const lastCharacterIsPartial = value.length > maxLength && !/\s/.test(value[maxLength] || '')
  const wordBoundary = lastCharacterIsPartial ? candidate.lastIndexOf(' ') : candidate.length
  const safeCutoff = wordBoundary > 0 ? wordBoundary : candidate.length

  return candidate
    .slice(0, safeCutoff)
    .replace(/[|/:;,\-\u2013\u2014]+$/g, '')
    .replace(/\b(?:a|an|and|by|for|from|in|of|on|or|the|to|with)$/i, '')
    .trim()
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
