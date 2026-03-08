'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

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
  const tabs: Tab[] = [
    hasDescription && { id: 'description', label: 'Description' },
    hasSpecifications && { id: 'specifications', label: 'Specifications' },
    hasDetails && { id: 'product-details', label: 'Product Details' },
  ].filter(Boolean) as Tab[]

  const [activeId, setActiveId] = useState<string>(tabs[0]?.id ?? '')

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
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (tabs.length === 0) return null

  const scrollTo = (id: string) => {
    const el = document.getElementById(id)
    if (!el) return
    const offset = 120 // header height + tab bar height
    const top = el.getBoundingClientRect().top + window.scrollY - offset
    window.scrollTo({ top, behavior: 'smooth' })
  }

  return (
    <div className="sticky top-28 z-10 bg-background border-b -mx-1 px-1 mt-8">
      <div className="flex gap-6">
        {tabs.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => scrollTo(id)}
            className={cn(
              'py-3 text-sm font-medium border-b-2 transition-colors',
              activeId === id
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
