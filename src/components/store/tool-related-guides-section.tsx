import Link from 'next/link'
import { ArrowRight, BookOpenCheck } from 'lucide-react'
import type { ToolRelatedGuide } from '@/lib/tool-related-guides'

interface ToolRelatedGuidesSectionProps {
  title: string
  description: string
  guides: ToolRelatedGuide[]
}

export function ToolRelatedGuidesSection({
  title,
  description,
  guides,
}: ToolRelatedGuidesSectionProps) {
  if (guides.length === 0) {
    return null
  }

  return (
    <section className="rounded-3xl border bg-background p-6 shadow-sm sm:p-8">
      <div className="max-w-2xl">
        <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
          <BookOpenCheck className="h-4 w-4" aria-hidden="true" />
          Related buying guides
        </p>
        <h2 className="mt-3 font-serif text-2xl leading-tight text-foreground sm:text-3xl">
          {title}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
          {description}
        </p>
      </div>

      <div className="mt-7 grid gap-4 md:grid-cols-2">
        {guides.map((guide) => (
          <Link
            key={guide.href}
            href={guide.href}
            className="group flex min-w-0 flex-col rounded-2xl border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
          >
            <span className="w-fit rounded-full bg-primary/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
              {guide.eyebrow}
            </span>
            <h3 className="mt-4 text-lg font-semibold leading-tight text-foreground group-hover:text-primary">
              {guide.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {guide.description}
            </p>
            <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
              Read guide
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </span>
          </Link>
        ))}
      </div>
    </section>
  )
}
