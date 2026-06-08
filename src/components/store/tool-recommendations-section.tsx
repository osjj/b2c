import Link from 'next/link'
import {
  ArrowRight,
  Calculator,
  HardHat,
  Ruler,
  ShieldCheck,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'
import type { ToolRecommendation } from '@/lib/tool-recommendations'

const ICONS: Record<ToolRecommendation['id'], LucideIcon> = {
  'ai-quote': Sparkles,
  'ppe-calculator': Calculator,
  'size-guide': Ruler,
  'compliance-checker': ShieldCheck,
  'hard-hat-class-decoder': HardHat,
}

interface ToolRecommendationsSectionProps {
  title: string
  description: string
  tools: ToolRecommendation[]
}

export function ToolRecommendationsSection({
  title,
  description,
  tools,
}: ToolRecommendationsSectionProps) {
  if (tools.length === 0) {
    return null
  }

  return (
    <section className="mt-16 rounded-3xl border bg-gradient-to-br from-primary/5 via-background to-background p-6 sm:p-8 shadow-sm">
      <div className="max-w-2xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
          Related Tools
        </p>
        <h2 className="mt-3 font-serif text-2xl sm:text-3xl leading-tight text-foreground">
          {title}
        </h2>
        <p className="mt-3 text-sm sm:text-base leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {tools.map((tool) => {
          const Icon = ICONS[tool.id]

          return (
            <Link
              key={tool.id}
              href={tool.href}
              className="group block rounded-2xl border bg-background p-5 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <span className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {tool.eyebrow}
                </span>
              </div>

              <h3 className="mt-5 font-serif text-xl leading-tight text-foreground group-hover:text-primary">
                {tool.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {tool.description}
              </p>
              <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
                {tool.cta}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
