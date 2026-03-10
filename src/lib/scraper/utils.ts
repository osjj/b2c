/**
 * 从 1688 商品链接中提取 offerId
 * 支持格式：
 * - https://detail.1688.com/offer/123456.html
 * - https://m.1688.com/offer/123456.html
 * - https://detail.1688.com/offer/123456.html?spm=xxx
 */
export function extractOfferId(url: string): string | null {
  try {
    const parsed = new URL(url)
    if (!parsed.hostname.endsWith('1688.com')) return null
    const match = parsed.pathname.match(/offer\/(\d+)/)
    return match ? match[1] : null
  } catch {
    return null
  }
}

export function normalizeUrl(url: string): string | null {
  const offerId = extractOfferId(url)
  if (!offerId) return null
  return `https://detail.1688.com/offer/${offerId}.html`
}

export function normalizeImageUrl(url: string): string {
  if (!url) return url
  let cleaned = url.split('?')[0]
  if (cleaned.startsWith('//')) {
    cleaned = 'https:' + cleaned
  }
  return cleaned
}

export function deduplicateImages(urls: string[]): string[] {
  const seen = new Set<string>()
  return urls.filter((url) => {
    const normalized = normalizeImageUrl(url)
    if (seen.has(normalized)) return false
    seen.add(normalized)
    return true
  })
}

export function parsePrice(text: string): number | null {
  const cleaned = text.replace(/[¥￥,\s]/g, '')
  const rangeMatch = cleaned.match(/([\d.]+)/)
  if (rangeMatch) {
    const num = parseFloat(rangeMatch[1])
    return isNaN(num) ? null : num
  }
  return null
}
