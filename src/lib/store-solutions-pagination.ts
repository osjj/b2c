export const STORE_SOLUTIONS_REGULAR_PAGE_SIZE = 8
export const STORE_SOLUTIONS_FIRST_PAGE_SIZE = STORE_SOLUTIONS_REGULAR_PAGE_SIZE + 1

export function normalizeSolutionsPage(page?: string) {
  const parsed = Number(page)

  if (!Number.isInteger(parsed) || parsed < 1) {
    return 1
  }

  return parsed
}

export function getStoreSolutionsPageConfig(page: number) {
  const normalizedPage = Number.isInteger(page) && page > 0 ? page : 1

  if (normalizedPage === 1) {
    return {
      page: 1,
      skip: 0,
      take: STORE_SOLUTIONS_FIRST_PAGE_SIZE,
      showFeatured: true,
      regularStartIndex: 2,
    }
  }

  const skip =
    STORE_SOLUTIONS_FIRST_PAGE_SIZE +
    (normalizedPage - 2) * STORE_SOLUTIONS_REGULAR_PAGE_SIZE

  return {
    page: normalizedPage,
    skip,
    take: STORE_SOLUTIONS_REGULAR_PAGE_SIZE,
    showFeatured: false,
    regularStartIndex: skip + 1,
  }
}

export function getStoreSolutionsTotalPages(total: number) {
  if (total <= 0) {
    return 0
  }

  if (total <= STORE_SOLUTIONS_FIRST_PAGE_SIZE) {
    return 1
  }

  return (
    1 +
    Math.ceil(
      (total - STORE_SOLUTIONS_FIRST_PAGE_SIZE) /
        STORE_SOLUTIONS_REGULAR_PAGE_SIZE
    )
  )
}

export function splitFeaturedSolution<T>(items: T[], page = 1) {
  if (page !== 1) {
    return {
      featuredSolution: undefined,
      regularSolutions: items,
    }
  }

  const [featuredSolution, ...regularSolutions] = items

  return {
    featuredSolution,
    regularSolutions,
  }
}
