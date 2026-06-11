'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PaginationProps {
  page: number
  totalPages: number
  total: number
}

export function Pagination({ page, totalPages, total }: PaginationProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const visiblePages = getVisiblePages(page, totalPages)

  const createPageUrl = (pageNum: number) => {
    const params = new URLSearchParams(searchParams)
    params.set('page', pageNum.toString())
    return `${pathname}?${params.toString()}`
  }

  if (totalPages <= 1) return null

  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-card px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        Showing page {page} of {totalPages} ({total} items)
      </p>
      <div className="flex min-w-0 items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
        <Button
          variant="outline"
          size="icon-sm"
          disabled={page <= 1}
          asChild={page > 1}
          aria-label="Previous page"
        >
          {page > 1 ? (
            <Link href={createPageUrl(page - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Link>
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>

        <div className="flex items-center gap-1">
          {visiblePages.map((item, index) =>
            item === 'ellipsis' ? (
              <span
                key={`${item}-${index}`}
                className="flex size-8 items-center justify-center text-muted-foreground"
                aria-hidden="true"
              >
                <MoreHorizontal className="h-4 w-4" />
              </span>
            ) : (
              <Button
                key={item}
                variant={item === page ? 'default' : 'outline'}
                size="icon-sm"
                asChild={item !== page}
                aria-label={`Go to page ${item}`}
                aria-current={item === page ? 'page' : undefined}
              >
                {item === page ? (
                  <span>{item}</span>
                ) : (
                  <Link href={createPageUrl(item)}>{item}</Link>
                )}
              </Button>
            )
          )}
        </div>

        <Button
          variant="outline"
          size="icon-sm"
          disabled={page >= totalPages}
          asChild={page < totalPages}
          aria-label="Next page"
        >
          {page < totalPages ? (
            <Link href={createPageUrl(page + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Link>
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  )
}

function getVisiblePages(page: number, totalPages: number): Array<number | 'ellipsis'> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }

  const pages = new Set<number>([1, totalPages])
  const start = Math.max(2, page - 1)
  const end = Math.min(totalPages - 1, page + 1)

  for (let pageNum = start; pageNum <= end; pageNum += 1) {
    pages.add(pageNum)
  }

  if (page <= 3) {
    pages.add(2)
    pages.add(3)
    pages.add(4)
  }

  if (page >= totalPages - 2) {
    pages.add(totalPages - 3)
    pages.add(totalPages - 2)
    pages.add(totalPages - 1)
  }

  const sortedPages = Array.from(pages)
    .filter((pageNum) => pageNum >= 1 && pageNum <= totalPages)
    .sort((first, second) => first - second)
  const items: Array<number | 'ellipsis'> = []

  sortedPages.forEach((pageNum, index) => {
    const previousPage = sortedPages[index - 1]
    if (previousPage && pageNum - previousPage > 1) {
      items.push('ellipsis')
    }
    items.push(pageNum)
  })

  return items
}
