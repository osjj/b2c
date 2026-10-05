import type { Solution } from '@prisma/client'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, CheckCircle2 } from 'lucide-react'

type SolutionSummary = Pick<Solution, 'id' | 'slug' | 'title' | 'excerpt' | 'coverImage'>

const PRIORITY_HUBS = [
  {
    slug: 'construction-site-ppe-solution',
    title: 'Construction PPE hub',
    description:
      'Review construction hazards, PPE categories, task checklists and bulk procurement requirements.',
    features: ['Solution overview', 'Task checklists', 'Product categories', 'RFQ resources'],
    action: 'Open construction hub',
  },
  {
    slug: 'ppe-safety-equipment-for-mining-quarrying',
    title: 'Mining & quarrying PPE hub',
    description:
      'Compare task, work-area, dust, noise and footwear decisions before preparing a mine or quarry PPE enquiry.',
    features: ['Task checklist', 'Work-area guide', 'Exposure guides', 'Buyer resources'],
    action: 'Open mining hub',
  },
] as const

export function BlogIndustrySolutions({ solutions }: { solutions: SolutionSummary[] }) {
  if (solutions.length === 0) return null

  const hubs = PRIORITY_HUBS.flatMap((hub) => {
    const solution = solutions.find((item) => item.slug === hub.slug)
    return solution ? [{ ...hub, solution }] : []
  })
  const otherSolutions = solutions.filter(
    (solution) => !hubs.some((hub) => hub.slug === solution.slug),
  )

  return (
    <section
      id="industry-solutions"
      aria-labelledby="industry-solutions-heading"
      className="container mx-auto mb-16 scroll-mt-28 px-4 lg:px-6"
    >
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="industry-solutions-heading" className="font-serif text-2xl sm:text-3xl">
            Industry solutions
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Select a work setting to review hazards, PPE options and procurement requirements.
          </p>
        </div>
        <span className="shrink-0 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          {solutions.length} industry guide{solutions.length === 1 ? '' : 's'}
        </span>
      </div>

      {hubs.length > 0 ? (
        <div className="mb-6 grid gap-6 lg:grid-cols-2">
          {hubs.map((hub) => (
            <Link
              key={hub.slug}
              href={`/solutions/${hub.slug}`}
              aria-label={hub.title}
              className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border bg-background shadow-sm transition-colors hover:border-primary/50 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              {hub.solution.coverImage ? (
                <div className="relative aspect-video bg-muted">
                  <Image
                    src={hub.solution.coverImage}
                    alt={hub.solution.title}
                    fill
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    className="object-contain"
                  />
                </div>
              ) : null}
              <div className="flex flex-1 flex-col p-5 sm:p-7">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
                  Industry hub
                </p>
                <h3 className="mt-3 font-serif text-2xl leading-tight sm:text-3xl">{hub.title}</h3>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                  {hub.description}
                </p>
                <div className="mt-5 grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
                  {hub.features.map((item) => (
                    <span key={item} className="flex min-w-0 items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                      <span className="min-w-0">{item}</span>
                    </span>
                  ))}
                </div>
                <div className="mt-auto flex flex-wrap gap-3 pt-6">
                  <span
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-colors group-hover:bg-primary/90 motion-reduce:transition-none"
                  >
                    {hub.action}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : null}

      {otherSolutions.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {otherSolutions.map((solution) => (
            <Link
              key={solution.id}
              href={`/solutions/${solution.slug}`}
              className="group flex min-w-0 flex-col rounded-xl border bg-background p-5 transition-colors hover:border-primary/50 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <h3 className="text-base font-semibold leading-6 group-hover:text-primary">
                {solution.title}
              </h3>
              {solution.excerpt ? (
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
                  {solution.excerpt}
                </p>
              ) : null}
              <span className="mt-auto inline-flex min-h-11 items-center gap-2 pt-3 text-sm font-semibold text-primary">
                View solution
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </span>
            </Link>
          ))}
        </div>
      ) : null}
    </section>
  )
}
