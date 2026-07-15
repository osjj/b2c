const XML_UNSAFE_URL_CHARACTER = '&'

function isAdminPreviewPath(pathname: string) {
  const pathSegments = pathname.toLowerCase().split('/').filter(Boolean)

  return (
    pathSegments[0] === 'admin'
    || (pathSegments[0] === 'api' && pathSegments[1] === 'admin')
    || pathSegments.includes('admin-preview')
  )
}

function parseSitemapImageUrl(baseUrl: string, candidate: string) {
  const isSiteRelative = candidate.startsWith('/') && !candidate.startsWith('//')

  try {
    if (!isSiteRelative) return new URL(candidate)

    const parsedBaseUrl = new URL(baseUrl)
    const parsedCandidate = new URL(candidate, parsedBaseUrl)

    return parsedCandidate.origin === parsedBaseUrl.origin ? parsedCandidate : null
  } catch {
    return null
  }
}

export function normalizeSitemapImageUrls(
  baseUrl: string,
  candidates: ReadonlyArray<string | null | undefined>
): string[] {
  const normalizedUrls: string[] = []
  const seenUrls = new Set<string>()

  for (const candidate of candidates) {
    const trimmedCandidate = candidate?.trim()
    if (!trimmedCandidate) continue

    const parsedUrl = parseSitemapImageUrl(baseUrl, trimmedCandidate)
    if (
      !parsedUrl
      || parsedUrl.protocol !== 'https:'
      || parsedUrl.username
      || parsedUrl.password
      || isAdminPreviewPath(parsedUrl.pathname)
    ) {
      continue
    }

    const serializedUrl = parsedUrl.href

    // Next's local sitemap serializer emits image URLs verbatim, so an ampersand
    // would produce malformed XML instead of an escaped query string.
    if (
      serializedUrl.includes(XML_UNSAFE_URL_CHARACTER)
      || seenUrls.has(serializedUrl)
    ) {
      continue
    }

    seenUrls.add(serializedUrl)
    normalizedUrls.push(serializedUrl)
  }

  return normalizedUrls
}
