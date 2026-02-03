'use client'

import Image from 'next/image'
import Link from 'next/link'
import { INDUSTRY_LABELS } from '@/types/solution'
import type { Industry } from '@prisma/client'
import { Shield, ArrowDown } from 'lucide-react'

interface SolutionHeroProps {
  title: string
  subtitle?: string | null
  industry: Industry
  coverImage?: string | null
  stats: {
    ppeCount: number
    materialsCount: number
    productCount: number
    hasHazards: boolean
    hasStandards: boolean
    hasFaq: boolean
  }
}

export function SolutionHero({ title, subtitle, industry, coverImage, stats }: SolutionHeroProps) {
  const scrollToContent = () => {
    const anchorIds = ['hazards', 'ppe-categories', 'materials', 'products', 'standards', 'faq']
    const element = anchorIds.map((id) => document.getElementById(id)).find(Boolean)
    element?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800">
      <div className="absolute -top-24 right-0 h-72 w-72 rounded-full bg-primary/25 blur-3xl" />
      <div className="absolute bottom-0 left-10 h-60 w-60 rounded-full bg-accent/30 blur-3xl" />

      {/* Cover image */}
      {coverImage && (
        <>
          <Image
            src={coverImage}
            alt={title}
            fill
            className="object-cover opacity-30 mix-blend-luminosity"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/70 to-slate-900/20" />
        </>
      )}

      <div className="container mx-auto relative z-10 py-16 md:py-24 px-6 lg:px-8">
        <div className="grid items-center gap-10 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-white/80">
              <Shield className="h-4 w-4 text-accent" />
              <span className="text-xs uppercase tracking-[0.2em]">
                {INDUSTRY_LABELS[industry]}
              </span>
            </div>

            <h1 className="mt-6 font-serif text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight">
              {title}
            </h1>

            {subtitle && (
              <p className="mt-5 text-lg md:text-xl text-slate-200 max-w-2xl leading-relaxed">
                {subtitle}
              </p>
            )}

            <div className="mt-8 flex flex-wrap gap-3">
              {stats.productCount > 0 ? (
                <a
                  href="#products"
                  className="inline-flex items-center justify-center rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent/90"
                >
                  Recommended Products
                </a>
              ) : (
                <Link
                  href="/products"
                  className="inline-flex items-center justify-center rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent/90"
                >
                  Browse Products
                </Link>
              )}
              {stats.ppeCount > 0 && (
                <a
                  href="#ppe-categories"
                  className="inline-flex items-center justify-center rounded-full border border-white/20 px-5 py-2.5 text-sm font-semibold text-white/90 transition-colors hover:border-white/50 hover:text-white"
                >
                  PPE Categories
                </a>
              )}
              {stats.hasStandards && (
                <a
                  href="#standards"
                  className="inline-flex items-center justify-center rounded-full border border-white/20 px-5 py-2.5 text-sm font-semibold text-white/90 transition-colors hover:border-white/50 hover:text-white"
                >
                  Standards
                </a>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.3em] text-white/60">
                Solution Snapshot
              </p>
              <span className="text-xs text-white/50">{INDUSTRY_LABELS[industry]}</span>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-2xl font-semibold text-white">{stats.ppeCount}</p>
                <p className="text-xs uppercase tracking-[0.2em] text-white/60">PPE Categories</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-2xl font-semibold text-white">{stats.materialsCount}</p>
                <p className="text-xs uppercase tracking-[0.2em] text-white/60">Materials</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-2xl font-semibold text-white">{stats.productCount}</p>
                <p className="text-xs uppercase tracking-[0.2em] text-white/60">Products</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-2xl font-semibold text-white">
                  {stats.hasStandards ? 'Yes' : 'No'}
                </p>
                <p className="text-xs uppercase tracking-[0.2em] text-white/60">Standards</p>
              </div>
            </div>
            <div className="mt-5 space-y-2 text-sm text-white/70">
              <div className="flex items-center justify-between">
                <span>Hazard guidance</span>
                <span className={stats.hasHazards ? 'text-emerald-300' : 'text-white/40'}>
                  {stats.hasHazards ? 'Included' : 'Not available'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Compliance notes</span>
                <span className={stats.hasStandards ? 'text-emerald-300' : 'text-white/40'}>
                  {stats.hasStandards ? 'Included' : 'Not available'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>FAQ support</span>
                <span className={stats.hasFaq ? 'text-emerald-300' : 'text-white/40'}>
                  {stats.hasFaq ? 'Included' : 'Not available'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <button
        onClick={scrollToContent}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/70 hover:text-white transition-colors cursor-pointer"
      >
        <span className="text-xs uppercase tracking-wider">Explore</span>
        <ArrowDown className="h-5 w-5 motion-safe:animate-bounce" />
      </button>
    </section>
  )
}
