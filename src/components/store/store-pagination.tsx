'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface StorePaginationProps {
  currentPage: number
  totalPages: number
  total: number
}

type PaginationItem = number | '...'

function getPaginationItems(currentPage: number, totalPages: number, compact = false) {
  const pages: PaginationItem[] = []
  const visiblePageLimit = compact ? 4 : 7

  if (totalPages <= visiblePageLimit) {
    for (let page = 1; page <= totalPages; page++) {
      pages.push(page)
    }
  } else if (compact) {
    if (currentPage <= 2) {
      pages.push(1, 2, '...', totalPages)
    } else if (currentPage >= totalPages - 1) {
      pages.push(1, '...', totalPages - 1, totalPages)
    } else {
      pages.push(1, '...', currentPage, '...', totalPages)
    }
  } else if (currentPage <= 3) {
    pages.push(1, 2, 3, 4, '...', totalPages)
  } else if (currentPage >= totalPages - 2) {
    pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages)
  } else {
    pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages)
  }

  return pages
}

export function StorePagination({ currentPage, totalPages, total }: StorePaginationProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  if (totalPages <= 1) return null

  const createPageUrl = (page: number) => {
    const params = new URLSearchParams(searchParams.toString())
    if (page <= 1) {
      params.delete('page')
    } else {
      params.set('page', page.toString())
    }

    const query = params.toString()
    return query ? `${pathname}?${query}` : pathname
  }

  const desktopPages = getPaginationItems(currentPage, totalPages)
  const compactPages = getPaginationItems(currentPage, totalPages, true)

  const renderPageItems = (pages: PaginationItem[], keyPrefix: string) =>
    pages.map((page, index) =>
      typeof page === 'number' ? (
        <Button
          key={`${keyPrefix}-page-${page}`}
          variant={page === currentPage ? 'default' : 'outline'}
          size="icon"
          className="h-11 w-11"
          asChild
        >
          <Link
            href={createPageUrl(page)}
            aria-current={page === currentPage ? 'page' : undefined}
            aria-label={page === currentPage ? `Page ${page}, current page` : `Go to page ${page}`}
          >
            {page}
          </Link>
        </Button>
      ) : (
        <span
          key={`${keyPrefix}-ellipsis-${index}`}
          className="px-1 text-muted-foreground"
          aria-hidden="true"
        >
          {page}
        </span>
      ),
    )

  return (
    <nav
      aria-label={`Pagination, ${total} total items`}
      className="flex items-center justify-center gap-1 [-webkit-tap-highlight-color:transparent] sm:gap-2"
    >
      {currentPage > 1 ? (
        <Button variant="outline" size="icon" className="h-11 w-11" asChild>
          <Link
            href={createPageUrl(currentPage - 1)}
            aria-label={`Go to previous page, page ${currentPage - 1}`}
            rel="prev"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>
      ) : (
        <Button
          variant="outline"
          size="icon"
          className="h-11 w-11"
          disabled
          aria-label="Previous page unavailable"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </Button>
      )}

      <span className="flex items-center gap-1 sm:hidden">
        {renderPageItems(compactPages, 'compact')}
      </span>
      <span className="hidden items-center gap-2 sm:flex">
        {renderPageItems(desktopPages, 'desktop')}
      </span>

      {currentPage < totalPages ? (
        <Button variant="outline" size="icon" className="h-11 w-11" asChild>
          <Link
            href={createPageUrl(currentPage + 1)}
            aria-label={`Go to next page, page ${currentPage + 1}`}
            rel="next"
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>
      ) : (
        <Button
          variant="outline"
          size="icon"
          className="h-11 w-11"
          disabled
          aria-label="Next page unavailable"
        >
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      )}
    </nav>
  )
}
