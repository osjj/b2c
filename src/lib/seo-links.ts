const INTERNAL_URL_BASE = 'https://internal.laifappe'
const MAX_ATTRIBUTION_SOURCE_LENGTH = 80
const ATTRIBUTION_MAX_AGE_MS = 30 * 60 * 1000

export const ATTRIBUTION_STORAGE_KEY = 'laifappe:last-internal-attribution'

export type InternalAttributionLink = {
  href: string
  source?: string
}

type StoredAttribution = {
  source: string
  capturedAt: number
}

export function normalizeAttributionSource(source?: string | null): string | undefined {
  if (!source) return undefined

  const normalized = source
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9._:-]/g, '')
    .slice(0, MAX_ATTRIBUTION_SOURCE_LENGTH)

  return normalized || undefined
}

export function normalizeInternalAttributionLink(
  href: string,
  fallbackSource?: string,
): InternalAttributionLink {
  const trimmedHref = href.trim()
  if (!trimmedHref.startsWith('/') || trimmedHref.startsWith('//')) {
    return { href }
  }

  try {
    const parsed = new URL(trimmedHref.replace(/&amp;/gi, '&'), INTERNAL_URL_BASE)
    if (parsed.origin !== INTERNAL_URL_BASE) {
      return { href }
    }

    const querySource = normalizeAttributionSource(parsed.searchParams.get('source'))
    const source = querySource ?? normalizeAttributionSource(fallbackSource)

    parsed.searchParams.delete('source')

    const search = parsed.searchParams.toString()
    return {
      href: `${parsed.pathname}${search ? `?${search}` : ''}${parsed.hash}`,
      ...(source ? { source } : {}),
    }
  } catch {
    return { href }
  }
}

export function rewriteInternalAttributionLinksInHtml(html: string): string {
  return html.replace(/<a\b[^>]*>/gi, (anchorTag) => {
    const hrefMatch = /\bhref\s*=\s*(["'])(.*?)\1/i.exec(anchorTag)
    if (!hrefMatch) return anchorTag

    const quote = hrefMatch[1]
    const href = hrefMatch[2]
    if (!quote || href === undefined) return anchorTag

    const normalized = normalizeInternalAttributionLink(href)
    if (!normalized.source) return anchorTag

    const cleanHrefAttribute = `href=${quote}${escapeHtmlAttribute(normalized.href)}${quote}`
    let rewritten = anchorTag.replace(hrefMatch[0], cleanHrefAttribute)
    const dataSourcePattern = /\sdata-source\s*=\s*(["']).*?\1/i
    const dataSourceAttribute = ` data-source=${quote}${escapeHtmlAttribute(normalized.source)}${quote}`

    rewritten = dataSourcePattern.test(rewritten)
      ? rewritten.replace(dataSourcePattern, dataSourceAttribute)
      : rewritten.replace(/>$/, `${dataSourceAttribute}>`)

    return rewritten
  })
}

export function parseStoredAttributionSource(
  value: string | null,
  now = Date.now(),
): string | undefined {
  if (!value) return undefined

  try {
    const parsed: unknown = JSON.parse(value)
    if (!isStoredAttribution(parsed)) return undefined

    const source = normalizeAttributionSource(parsed.source)
    const age = now - parsed.capturedAt
    if (!source || age < 0 || age > ATTRIBUTION_MAX_AGE_MS) return undefined

    return source
  } catch {
    return undefined
  }
}

export function storeRecentAttributionSource(source: string): void {
  if (typeof window === 'undefined') return

  const normalized = normalizeAttributionSource(source)
  if (!normalized) return

  const value: StoredAttribution = {
    source: normalized,
    capturedAt: Date.now(),
  }

  try {
    window.sessionStorage.setItem(ATTRIBUTION_STORAGE_KEY, JSON.stringify(value))
  } catch {
    // Attribution must never block navigation when storage is unavailable.
  }
}

export function readRecentAttributionSource(): string | undefined {
  if (typeof window === 'undefined') return undefined

  try {
    return parseStoredAttributionSource(
      window.sessionStorage.getItem(ATTRIBUTION_STORAGE_KEY),
    )
  } catch {
    return undefined
  }
}

export function clearRecentAttributionSource(): void {
  if (typeof window === 'undefined') return

  try {
    window.sessionStorage.removeItem(ATTRIBUTION_STORAGE_KEY)
  } catch {
    // Attribution cleanup must not affect a successful form submission.
  }
}

function isStoredAttribution(value: unknown): value is StoredAttribution {
  if (!value || typeof value !== 'object') return false

  const candidate = value as Record<string, unknown>
  return typeof candidate.source === 'string' && typeof candidate.capturedAt === 'number'
}

function escapeHtmlAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}
