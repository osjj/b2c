import { createHash } from 'node:crypto'

import type { CaseView } from './types'

type PublicCaseIdentity = Pick<CaseView, 'slug' | 'title'>

export type CaseInquiryContext = {
  slug: string
  title: string
  caseHref: string
  source: string
  initialMessage: string
}

/** Repeated query parameters are ambiguous; never use them for a public lookup. */
export function parseCaseInquirySlug(value: unknown): string | null {
  return typeof value === 'string' && value.length <= 160
    && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) ? value : null
}

export function caseInquiryHref(slug: string): string {
  const validSlug = parseCaseInquirySlug(slug)
  return validSlug ? `/quote?case=${validSlug}` : '/quote'
}

export function caseInquirySource(slug: string): string {
  const validSlug = parseCaseInquirySlug(slug)
  if (!validSlug) return 'procurement-cases'
  if (validSlug.length <= 75) return `case:${validSlug}`

  // Fit the quote API's 80-character source limit without merging shared prefixes.
  // The complete slug also remains in the inquiry URL and submitted entryPage.
  const digest = createHash('sha256').update(validSlug).digest('hex').slice(0, 16)
  return `case:${validSlug.slice(0, 58)}:${digest}`
}

/** Preserve the ordinary quote page's existing source-query fallback. */
export function quotePageSource(source: string | string[] | undefined): string {
  const value = Array.isArray(source) ? source[0] : source
  return value?.trim().slice(0, 80) || 'Quote page'
}

/** The caller must provide the existing eligible-public-case lookup, never admin data. */
export async function resolveCaseInquiryContext(
  query: unknown,
  findPublishedCase: (slug: string) => Promise<PublicCaseIdentity | null>,
): Promise<CaseInquiryContext | null> {
  const slug = parseCaseInquirySlug(query)
  if (!slug) return null
  const caseStudy = await findPublishedCase(slug)
  if (!caseStudy || caseStudy.slug !== slug) return null
  const title = caseStudy.title.trim()
  if (!title || title.length > 200) return null

  return {
    slug,
    title,
    caseHref: `/cases/${slug}`,
    source: caseInquirySource(slug),
    initialMessage: `I would like to discuss a similar PPE procurement project to "${title}".`,
  }
}
