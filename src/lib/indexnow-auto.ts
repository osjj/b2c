import { after } from 'next/server'

import { LAIFAPPE_CANONICAL_ORIGIN, submitIndexNow } from './indexnow'
import { buildSiteUrl } from './site-url'

export type PublicUrlState = {
  slug: string
  isPublic: boolean
}

export type CategoryUrlState = {
  slug: string
  isActive: boolean
  parent: {
    slug: string
    isActive: boolean
  } | null
}

type IndexNowAutoEnvironment = {
  NODE_ENV?: string
  NEXT_PUBLIC_SITE_URL?: string
  VERCEL_ENV?: string
}

type IndexNowAutoDependencies = {
  environment?: IndexNowAutoEnvironment
  schedule?: (callback: () => Promise<void>) => void
  submit?: typeof submitIndexNow
  logError?: (message: string, context: IndexNowAutoLogContext) => void
}

type IndexNowAutoLogContext = {
  error: unknown
  urlCount: number
}

const INDEXNOW_AUTO_MAX_ERROR_LENGTH = 500

function canonicalUrl(path: string): string {
  return new URL(path, LAIFAPPE_CANONICAL_ORIGIN).href
}

function collectPublicTransition(
  before: PublicUrlState | null,
  afterState: PublicUrlState | null,
  buildPath: (slug: string) => string,
  includeStablePublicUpdate: boolean
): string[] {
  if (
    !includeStablePublicUpdate &&
    before?.isPublic &&
    afterState?.isPublic &&
    before.slug === afterState.slug
  ) {
    return []
  }

  const urls: string[] = []

  if (before?.isPublic) {
    urls.push(canonicalUrl(buildPath(before.slug)))
  }

  if (afterState?.isPublic) {
    urls.push(canonicalUrl(buildPath(afterState.slug)))
  }

  return Array.from(new Set(urls))
}

export function collectProductIndexNowUrls(
  before: PublicUrlState | null,
  afterState: PublicUrlState | null
): string[] {
  return collectPublicTransition(
    before,
    afterState,
    (slug) => `/products/${slug}`,
    true
  )
}

export function collectBlogIndexNowUrls(
  before: PublicUrlState | null,
  afterState: PublicUrlState | null
): string[] {
  return collectPublicTransition(
    before,
    afterState,
    (slug) => `/blog/${slug}`,
    true
  )
}

export function collectSolutionIndexNowUrls(
  before: PublicUrlState | null,
  afterState: PublicUrlState | null
): string[] {
  return collectPublicTransition(
    before,
    afterState,
    (slug) => `/solutions/${slug}`,
    false
  )
}

export function isCategoryPublic(category: CategoryUrlState): boolean {
  return category.isActive && (category.parent === null || category.parent.isActive)
}

export function getCategoryCanonicalUrl(category: CategoryUrlState): string {
  const path = category.parent
    ? `/categories/${category.parent.slug}/${category.slug}`
    : `/categories/${category.slug}`

  return canonicalUrl(path)
}

export function collectCategoryIndexNowUrls(
  before: CategoryUrlState | null,
  afterState: CategoryUrlState | null
): string[] {
  const beforeUrl = before && isCategoryPublic(before)
    ? getCategoryCanonicalUrl(before)
    : null
  const afterUrl = afterState && isCategoryPublic(afterState)
    ? getCategoryCanonicalUrl(afterState)
    : null

  if (beforeUrl === afterUrl) {
    return []
  }

  return Array.from(new Set([beforeUrl, afterUrl].filter((url): url is string => Boolean(url))))
}

export function isIndexNowAutoEnabled(
  environment: IndexNowAutoEnvironment = process.env
): boolean {
  if (environment.NODE_ENV !== 'production') {
    return false
  }

  if (environment.VERCEL_ENV && environment.VERCEL_ENV !== 'production') {
    return false
  }

  const configuredSiteUrl = environment.NEXT_PUBLIC_SITE_URL?.trim()
  if (!configuredSiteUrl) {
    return false
  }

  return buildSiteUrl(configuredSiteUrl) === LAIFAPPE_CANONICAL_ORIGIN
}

function defaultLogError(
  message: string,
  context: IndexNowAutoLogContext
): void {
  const errorMessage = context.error instanceof Error
    ? context.error.message
    : String(context.error)
  const normalizedErrorMessage = errorMessage
    .replace(/[\u0000-\u001F\u007F]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  const boundedErrorMessage = normalizedErrorMessage.length > INDEXNOW_AUTO_MAX_ERROR_LENGTH
    ? `${normalizedErrorMessage.slice(0, INDEXNOW_AUTO_MAX_ERROR_LENGTH)}...`
    : normalizedErrorMessage

  process.stderr.write(`${JSON.stringify({
    level: 'error',
    event: message,
    error: boundedErrorMessage,
    urlCount: context.urlCount,
  })}\n`)
}

export function scheduleIndexNowUrls(
  candidates: ReadonlyArray<string>,
  dependencies: IndexNowAutoDependencies = {}
): boolean {
  const environment = dependencies.environment ?? process.env
  if (!isIndexNowAutoEnabled(environment)) {
    return false
  }

  const urls = Array.from(new Set(candidates))
  if (urls.length === 0) {
    return false
  }

  const schedule = dependencies.schedule ?? after
  const submit = dependencies.submit ?? submitIndexNow
  const logError = dependencies.logError ?? defaultLogError

  try {
    schedule(async () => {
      try {
        await submit(urls)
      } catch (error) {
        try {
          logError('indexnow_auto_submission_failed', {
            error,
            urlCount: urls.length,
          })
        } catch {
          // Logging must not turn a best-effort notification into a failed task.
        }
      }
    })
  } catch (error) {
    try {
      logError('indexnow_auto_scheduling_failed', {
        error,
        urlCount: urls.length,
      })
    } catch {
      // Scheduling and logging failures must never affect the content mutation.
    }
    return false
  }

  return true
}
