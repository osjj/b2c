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
    <section id="ppe-categories" className="scroll-mt-28 py-12 md:py-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Protection Plan
          </p>
          <h2 className="mt-2 text-2xl md:text-3xl font-serif font-bold">
            PPE Categories
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Curated equipment groups aligned to your jobsite hazards.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full border bg-background/80 px-3 py-1 text-xs text-muted-foreground">
          <Shield className="h-4 w-4 text-amber-600" />
          {categories.length} categories
        </div>
      </div>
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
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
              className={`group relative overflow-hidden rounded-2xl border bg-background/80 p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg cursor-pointer ${
                isActive ? '' : 'opacity-60 cursor-not-allowed'
              }`}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
              <div className="relative z-10 flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors">
                      {label}
                    </h3>
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                  </div>
                  {item.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {item.description}
                    </p>
                  )}
                  {!isActive && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Category inactive
                    </p>
                  )}
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
