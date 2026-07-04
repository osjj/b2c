'use client'

import { useEffect, useMemo, useState } from 'react'
import { cn } from '@/lib/utils'

const SECTION_TAB_HEIGHT = 52
const SECTION_TAB_GAP = 16
const STICKY_HEADER_HEIGHT_DESKTOP = 75
const STICKY_HEADER_HEIGHT_MOBILE = 58

interface Tab {
  id: string
  label: string
}

interface ProductSectionTabsProps {
  hasDescription: boolean
  hasSpecifications: boolean
  hasDetails: boolean
}

export function ProductSectionTabs({
  hasDescription,
  hasSpecifications,
  hasDetails,
}: ProductSectionTabsProps) {
  const tabs = useMemo<Tab[]>(
    () =>
      [
        hasDescription && { id: 'description', label: 'Description' },
        hasSpecifications && { id: 'specifications', label: 'Specifications' },
        hasDetails && { id: 'product-details', label: 'Product Details' },
      ].filter(Boolean) as Tab[],
    [hasDescription, hasSpecifications, hasDetails]
  )

  const [activeId, setActiveId] = useState<string>(tabs[0]?.id ?? '')
  const activeTabId = tabs.some((tab) => tab.id === activeId) ? activeId : tabs[0]?.id

  // Set up IntersectionObserver for scroll-spy
  useEffect(() => {
    if (tabs.length === 0) return

    const observers: IntersectionObserver[] = []

    tabs.forEach(({ id }) => {
      const el = document.getElementById(id)
      if (!el) return

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setActiveId(id)
          }
        },
        {
          rootMargin: '-30% 0px -60% 0px',
          threshold: 0,
        }
      )
      observer.observe(el)
      observers.push(observer)
    })

    return () => observers.forEach((o) => o.disconnect())
  }, [tabs])

  if (tabs.length === 0) return null

  const scrollTo = (id: string) => {
    const el = document.getElementById(id)
    if (!el) return
    const stickyHeaderHeight = window.matchMedia('(min-width: 768px)').matches
      ? STICKY_HEADER_HEIGHT_DESKTOP
      : STICKY_HEADER_HEIGHT_MOBILE
    const top = el.getBoundingClientRect().top + window.scrollY - stickyHeaderHeight - SECTION_TAB_HEIGHT - SECTION_TAB_GAP
    window.scrollTo({ top, behavior: 'smooth' })
  }

  return (
    <div className="sticky top-[75px] z-40 hidden border-y bg-background/95 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/85 md:block">
      <div className="container mx-auto flex gap-8 overflow-x-auto px-6 lg:px-8">
        {tabs.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => scrollTo(id)}
            className={cn(
              'py-3 text-sm font-medium border-b-2 transition-colors',
              activeTabId === id
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}
