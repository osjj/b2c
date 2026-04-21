const LOCALHOST_SITE_URL = 'http://localhost:3000'
const PRIMARY_PRODUCTION_ORIGIN = 'https://www.laifappe.com'

function normalizePrimaryHost(hostname: string) {
  if (hostname === 'laifappe.com' || hostname === 'www.laifappe.com') {
    return 'www.laifappe.com'
  }

  return hostname
}

export function buildSiteUrl(siteUrl?: string) {
  const normalized = siteUrl?.trim()

  if (!normalized) {
    return LOCALHOST_SITE_URL
  }

  const withProtocol = /^https?:\/\//i.test(normalized)
    ? normalized
    : `https://${normalized.replace(/\/+$/, '')}`

  try {
    const parsed = new URL(withProtocol)
    const hostname = normalizePrimaryHost(parsed.hostname)

    if (hostname === 'www.laifappe.com') {
      return PRIMARY_PRODUCTION_ORIGIN
    }

    return `${parsed.protocol}//${hostname}${parsed.port ? `:${parsed.port}` : ''}`
  } catch {
    return withProtocol.replace(/\/+$/, '')
  }
}

export function getSiteUrl() {
  return buildSiteUrl(process.env.NEXT_PUBLIC_SITE_URL)
}
