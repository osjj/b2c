import { buildPageTitle } from './seo-title'

const DEFAULT_MAX_DESCRIPTION_LENGTH = 160
const IN_STOCK_URL = 'https://schema.org/InStock'
const OUT_OF_STOCK_URL = 'https://schema.org/OutOfStock'

type ProductMetadataInput = {
  name: string
  description?: string | null
  metaTitle?: string | null
  metaDescription?: string | null
}

type ProductStockInput = {
  stock: number
  variants: ReadonlyArray<{ stock: number }>
}

export type ProductAvailability = typeof IN_STOCK_URL | typeof OUT_OF_STOCK_URL

function normalizeWhitespace(value: string | null | undefined): string {
  return (value || '').replace(/\s+/g, ' ').trim()
}

export function buildMetaDescription(
  value: string,
  maxLength = DEFAULT_MAX_DESCRIPTION_LENGTH
): string {
  const normalized = normalizeWhitespace(value)

  if (normalized.length <= maxLength) {
    return normalized
  }

  const candidate = normalized.slice(0, maxLength)
  const sentenceMatches = [...candidate.matchAll(/[.!?](?=\s|$)/g)]
  const lastSentenceEnd = sentenceMatches.at(-1)?.index

  if (lastSentenceEnd !== undefined) {
    return candidate.slice(0, lastSentenceEnd + 1).trim()
  }

  const wordBoundary = candidate.lastIndexOf(' ')
  return candidate.slice(0, wordBoundary > 0 ? wordBoundary : maxLength).trim()
}

export function buildProductMetaTitle({
  name,
  metaTitle,
}: Pick<ProductMetadataInput, 'name' | 'metaTitle'>): string {
  const curatedTitle = normalizeWhitespace(metaTitle)
  return curatedTitle || buildPageTitle(name)
}

export function buildProductMetaDescription({
  name,
  description,
  metaDescription,
}: ProductMetadataInput): string {
  const curatedDescription = normalizeWhitespace(metaDescription)
  const productDescription = normalizeWhitespace(description)
  const fallback = `Shop ${normalizeWhitespace(name)} at Laifappe. High-quality protective equipment.`

  return buildMetaDescription(curatedDescription || productDescription || fallback)
}

export function getProductAvailability({
  stock,
  variants,
}: ProductStockInput): ProductAvailability {
  const isInStock = variants.length > 0
    ? variants.some((variant) => variant.stock > 0)
    : stock > 0

  return isInStock ? IN_STOCK_URL : OUT_OF_STOCK_URL
}
