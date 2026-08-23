export const STORE_BLOG_PAGE_SIZE = 12

export function normalizeBlogPage(page: unknown) {
  if (typeof page !== 'string' || !/^\d+$/.test(page)) {
    return 1
  }

  const parsed = Number(page)

  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    return 1
  }

  return parsed
}

export function getStoreBlogPageConfig(page: number) {
  const normalizedPage = Number.isSafeInteger(page) && page > 0 ? page : 1

  return {
    page: normalizedPage,
    skip: (normalizedPage - 1) * STORE_BLOG_PAGE_SIZE,
    take: STORE_BLOG_PAGE_SIZE,
    showFeatured: normalizedPage === 1,
  }
}

export function getStoreBlogTotalPages(total: number) {
  if (!Number.isFinite(total) || total <= 0) {
    return 0
  }

  return Math.ceil(total / STORE_BLOG_PAGE_SIZE)
}

export function splitFeaturedBlogPost<T>(items: T[], page = 1) {
  if (page !== 1) {
    return {
      featuredPost: undefined,
      regularPosts: items,
    }
  }

  const [featuredPost, ...regularPosts] = items

  return {
    featuredPost,
    regularPosts,
  }
}

export function getStoreBlogPageRange(page: number, pageItemCount: number, total: number) {
  if (pageItemCount <= 0 || total <= 0) {
    return { start: 0, end: 0 }
  }

  const normalizedPage = Number.isSafeInteger(page) && page > 0 ? page : 1
  const start = (normalizedPage - 1) * STORE_BLOG_PAGE_SIZE + 1

  return {
    start,
    end: Math.min(start + pageItemCount - 1, total),
  }
}
