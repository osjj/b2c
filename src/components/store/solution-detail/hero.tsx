'use client'

import Image from 'next/image'
import { formatUsageSceneLabel, type UsageScene } from '@/lib/usage-scenes'
import { Shield, Package, Award, HelpCircle, AlertTriangle, ChevronRight } from 'lucide-react'

interface TocItem {
  id: string
  title: string
}

interface SolutionHeroProps {
  title: string
  subtitle?: string | null
  usageScenes: string[]
  coverImage?: string | null
  tocItems: TocItem[]
  stats: {
    ppeCount: number
    materialsCount: number
    productCount: number
    hasHazards: boolean
    hasStandards: boolean
    hasFaq: boolean
  }
}

const TOC_ICONS: Record<string, typeof Shield> = {
  'hazards': AlertTriangle,
  'ppe-categories': Shield,
  'materials': Package,
  'products': Package,
  'standards': Award,
  'faq': HelpCircle,
}

export function SolutionHero({ title, subtitle, usageScenes, coverImage, tocItems, stats }: SolutionHeroProps) {
  return (
    <section className="relative border-b bg-slate-900">
      {/* Cover image - subtle */}
      {coverImage && (
        <>
          <Image
            src={coverImage}
            alt={title}
            fill
            className="object-cover opacity-15"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/95 to-slate-900/80" />
        </>
      )}

      <div className="container mx-auto relative z-10 py-6 px-4 lg:px-6">
        {/* Top row: Industry badge + Stats */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="inline-flex items-center gap-2 rounded bg-white/10 px-2.5 py-1 text-white/90">
            <Shield className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-xs font-medium uppercase tracking-wider">
              {usageScenes.slice(0, 2).map((s) => formatUsageSceneLabel(s as UsageScene)).join(' · ')}
              {usageScenes.length > 2 && ` +${usageScenes.length - 2}`}
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs text-white/60">
            <span className="flex items-center gap-1.5">
              <span className="font-semibold text-white">{stats.ppeCount}</span> PPE
            </span>
            <span className="flex items-center gap-1.5">
              <span className="font-semibold text-white">{stats.materialsCount}</span> Materials
            </span>
            <span className="flex items-center gap-1.5">
              <span className="font-semibold text-white">{stats.productCount}</span> Products
            </span>
          </div>
        </div>

        {/* Title + Subtitle */}
        <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight max-w-3xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-2 text-sm text-slate-300 max-w-2xl leading-relaxed">
            {subtitle}
          </p>
        )}

        {/* Horizontal TOC Navigation */}
        {tocItems.length > 0 && (
          <nav className="mt-5 -mx-4 px-4 overflow-x-auto scrollbar-hide">
            <div className="flex items-center gap-1.5 min-w-max">
              {tocItems.map((item, index) => {
                const Icon = TOC_ICONS[item.id] || Shield
                return (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    className="group flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs font-medium text-white/70 transition-all hover:bg-white/10 hover:text-white"
                  >
                    <Icon className="h-3.5 w-3.5 text-amber-400/70 group-hover:text-amber-400" />
                    <span>{item.title}</span>
                    {index < tocItems.length - 1 && (
                      <ChevronRight className="h-3 w-3 text-white/30 ml-1" />
                    )}
                  </a>
                )
              })}
            </div>
          </nav>
        )}
      </div>
    </section>
  )
}
