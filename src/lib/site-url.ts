const LOCALHOST_SITE_URL = 'http://localhost:3000'

export function buildSiteUrl(siteUrl?: string) {
  const normalized = siteUrl?.trim()

  if (!normalized) {
    return LOCALHOST_SITE_URL
  }

  if (/^https?:\/\//i.test(normalized)) {
    return normalized.replace(/\/+$/, '')
  }

  return `https://${normalized.replace(/\/+$/, '')}`
}

export function getSiteUrl() {
  return buildSiteUrl(process.env.NEXT_PUBLIC_SITE_URL)
}
