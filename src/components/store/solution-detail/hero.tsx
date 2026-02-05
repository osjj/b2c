import Image from 'next/image'
import { formatUsageSceneLabel, type UsageScene } from '@/lib/usage-scenes'
import { Shield } from 'lucide-react'

interface SolutionHeroProps {
  title: string
  excerpt?: string | null
  usageScenes: string[]
  coverImage?: string | null
}

export function SolutionHero({
  title,
  excerpt,
  usageScenes,
  coverImage,
}: SolutionHeroProps) {
  return (
    <section className="relative border-b bg-slate-900">
      {coverImage && (
        <>
          <Image
            src={coverImage}
            alt={title}
            fill
            className="object-cover opacity-20"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/95 to-slate-900/85" />
        </>
      )}

      <div className="container mx-auto relative z-10 py-8 px-4 lg:px-6">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] items-center">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs uppercase tracking-[0.3em] text-white/60">
                Basic Information
              </span>
              {usageScenes.length > 0 && (
                <div className="inline-flex items-center gap-2 rounded bg-white/10 px-2.5 py-1 text-white/90">
                  <Shield className="h-3.5 w-3.5 text-amber-400" />
                  <span className="text-xs font-medium uppercase tracking-wider">
                    {usageScenes.slice(0, 2).map((s) => formatUsageSceneLabel(s as UsageScene)).join(' · ')}
                    {usageScenes.length > 2 && ` +${usageScenes.length - 2}`}
                  </span>
                </div>
              )}
            </div>

            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white leading-tight">
              {title}
            </h1>

            {excerpt && (
              <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
                {excerpt}
              </p>
            )}
          </div>

          <div className="relative">
            {coverImage ? (
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-white/10">
                <Image
                  src={coverImage}
                  alt={title}
                  fill
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="aspect-[4/3] w-full rounded-2xl border border-dashed border-white/20 bg-white/5 flex items-center justify-center text-xs text-white/50">
                Cover image not set
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 hidden lg:block h-px bg-white/10" />
      </div>
    </section>
  )
}
