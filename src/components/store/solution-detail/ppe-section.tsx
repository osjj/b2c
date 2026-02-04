'use client'

import type { ComponentType } from 'react'
import Link from 'next/link'
import { HardHat, Hand, Footprints, Eye, Shield, Wind, Shirt, Tag, ArrowRight } from 'lucide-react'
import type { PpeCategoryItem } from '@/types/solution'

const PPE_ICON_MAP: Record<string, ComponentType<{ className?: string }>> = {
  'head-protection': HardHat,
  'hand-protection': Hand,
  'foot-protection': Footprints,
  'eye-protection': Eye,
  'fall-protection': Shield,
  respiratory: Wind,
  'body-protection': Shirt,
}

type CategoryLabel = {
  slug: string
  name: string
  isActive?: boolean
}

const formatSlug = (slug: string) =>
  slug
    .split('-')
    .filter(Boolean)
    .map((segment) => segment[0]?.toUpperCase() + segment.slice(1))
    .join(' ')

interface PpeSectionProps {
  categories: PpeCategoryItem[] | null
  categoryLabels?: CategoryLabel[]
}

export function PpeSection({ categories, categoryLabels = [] }: PpeSectionProps) {
  if (!categories?.length) return null
  const labelMap = new Map(categoryLabels.map((category) => [category.slug, category]))

  return (
    <section id="ppe-categories" className="scroll-mt-20">
      <div className="rounded-lg border bg-card">
        <div className="flex items-center justify-between px-4 py-2.5 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-amber-600" />
            <h2 className="text-sm font-semibold">PPE Categories</h2>
          </div>
          <span className="text-xs text-muted-foreground">{categories.length} types</span>
        </div>
        <div className="p-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {categories.map((item) => {
              const categoryMeta = labelMap.get(item.categorySlug)
              const label = categoryMeta?.name || formatSlug(item.categorySlug)
              const isActive = categoryMeta?.isActive !== false
              const Icon = PPE_ICON_MAP[item.categorySlug] || Tag

              return (
                <Link
                  key={item.categorySlug}
                  href={`/categories/${item.categorySlug}`}
                  onClick={isActive ? undefined : (event) => event.preventDefault()}
                  aria-disabled={!isActive}
                  className={`group flex items-start gap-3 rounded-md border p-3 transition-all hover:border-primary/30 hover:bg-primary/5 ${
                    isActive ? '' : 'opacity-50 cursor-not-allowed'
                  }`}
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <h3 className="text-sm font-medium text-foreground group-hover:text-primary truncate">
                        {label}
                      </h3>
                      <ArrowRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </div>
                    {item.description && (
                      <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                        {item.description}
                      </p>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
