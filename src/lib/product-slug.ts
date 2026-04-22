export const PRODUCT_SLUG_MAX_LENGTH = 58

const PRODUCT_SLUG_STOP_WORDS = new Set([
  'best',
  'cheap',
  'custom',
  'factory',
  'hot',
  'logo',
  'sale',
  'seller',
  'sellers',
  'stock',
  'wholesale',
])

const PRODUCT_SLUG_TRAILING_CONNECTORS = new Set([
  'anti',
  'and',
  'for',
  'in',
  'of',
  'the',
  'to',
  'with',
])

function slugifyText(input: string): string {
  return input
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function getSlugTokens(input: string): string[] {
  return slugifyText(input)
    .split('-')
    .filter(Boolean)
}

function dedupeSequentialTokens(tokens: string[]): string[] {
  const deduped: string[] = []

  for (const token of tokens) {
    if (deduped[deduped.length - 1] !== token) {
      deduped.push(token)
    }
  }

  return deduped
}

function stripNoiseTokens(tokens: string[]): string[] {
  const deduped = dedupeSequentialTokens(tokens)
  const filtered = deduped.filter(
    (token) => !PRODUCT_SLUG_STOP_WORDS.has(token),
  )

  return filtered.length >= 2 ? filtered : deduped
}

function trimTokensToLength(tokens: string[], maxLength: number): string {
  if (tokens.length === 0) {
    return ''
  }

  const selected: string[] = []

  for (const token of tokens) {
    const candidate = [...selected, token].join('-')

    if (candidate.length > maxLength) {
      break
    }

    selected.push(token)
  }

  if (selected.length > 0) {
    while (
      selected.length > 2 &&
      PRODUCT_SLUG_TRAILING_CONNECTORS.has(selected[selected.length - 1])
    ) {
      selected.pop()
    }

    return selected.join('-')
  }

  return tokens[0].slice(0, maxLength).replace(/-+$/g, '')
}

function buildCandidateSources(name: string, preferredSlug?: string | null) {
  const sources = [preferredSlug?.trim(), name.trim()].filter(
    (value): value is string => Boolean(value),
  )

  return [...new Set(sources)]
}

export function buildProductSlugBase(
  name: string,
  preferredSlug?: string | null,
): string {
  for (const source of buildCandidateSources(name, preferredSlug)) {
    const tokens = stripNoiseTokens(getSlugTokens(source))
    const trimmed = trimTokensToLength(tokens, PRODUCT_SLUG_MAX_LENGTH)

    if (trimmed) {
      return trimmed
    }
  }

  return 'product-item'
}

function trimBaseForSuffix(baseSlug: string, suffix: string): string {
  const maxBaseLength = Math.max(1, PRODUCT_SLUG_MAX_LENGTH - suffix.length)
  const trimmed = baseSlug.slice(0, maxBaseLength).replace(/-+$/g, '')

  return trimmed || 'product'
}

export function appendNumericSuffix(baseSlug: string, sequence: number): string {
  const suffix = `-${sequence}`
  return `${trimBaseForSuffix(baseSlug, suffix)}${suffix}`
}

export function createUniqueProductSlug(
  baseSlug: string,
  takenSlugs: Set<string>,
): string {
  if (!takenSlugs.has(baseSlug)) {
    return baseSlug
  }

  let sequence = 2

  while (sequence < 10_000) {
    const candidate = appendNumericSuffix(baseSlug, sequence)

    if (!takenSlugs.has(candidate)) {
      return candidate
    }

    sequence += 1
  }

  return appendNumericSuffix(baseSlug, Date.now())
}

export function isProductSlugLikelyNoisy(slug: string): boolean {
  return (
    slug.length > PRODUCT_SLUG_MAX_LENGTH ||
    /-[a-z]*\d[a-z0-9]{3,7}$/.test(slug) ||
    slug.includes('--')
  )
}
