'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, CheckCircle2, HardHat } from 'lucide-react'

const IMPACT_OPTIONS = [
  {
    id: 'top',
    label: 'Top impact only',
    description: 'Falling objects above the worker are the main head hazard.',
  },
  {
    id: 'top-side',
    label: 'Top and side impact',
    description: 'The worker may hit or be struck from the side, not only from above.',
  },
] as const

const ELECTRICAL_OPTIONS = [
  {
    id: 'none',
    label: 'No electrical exposure',
    description: 'General jobsite impact protection is the main requirement.',
  },
  {
    id: 'low',
    label: 'Possible low-voltage exposure',
    description: 'General electrical protection is useful, but high-voltage exposure is not expected.',
  },
  {
    id: 'high',
    label: 'Electrical work or higher exposure',
    description: 'Use non-vented electrical-rated head protection and confirm the label.',
  },
  {
    id: 'conductive',
    label: 'Need maximum ventilation only',
    description: 'Only choose conductive Class C where electrical exposure is controlled out.',
  },
] as const

type ImpactOptionId = (typeof IMPACT_OPTIONS)[number]['id']
type ElectricalOptionId = (typeof ELECTRICAL_OPTIONS)[number]['id']

function isImpactOptionId(value: string): value is ImpactOptionId {
  return IMPACT_OPTIONS.some((option) => option.id === value)
}

function isElectricalOptionId(value: string): value is ElectricalOptionId {
  return ELECTRICAL_OPTIONS.some((option) => option.id === value)
}

function getRecommendation(impact: ImpactOptionId, electrical: ElectricalOptionId) {
  const type = impact === 'top-side' ? 'Type II' : 'Type I'
  const classCode =
    electrical === 'high'
      ? 'Class E'
      : electrical === 'low'
        ? 'Class G'
        : electrical === 'conductive'
          ? 'Class C'
          : 'Class G'

  const warnings: string[] = []

  if (electrical === 'conductive') {
    warnings.push('Class C hard hats do not provide electrical protection and should only be used where electrical hazards are controlled out.')
  }

  if (electrical === 'high') {
    warnings.push('Vented shells usually are not Class E. Confirm the ANSI/ISEA Z89.1 label before buying.')
  }

  if (electrical === 'none') {
    warnings.push('Class G is a conservative construction baseline. Class C can be considered only when ventilation is the priority and electrical hazards are not present.')
  }

  if (impact === 'top-side') {
    warnings.push('Type II is useful for lateral impact risk, scaffold work, climbing-style helmets, and complex equipment zones.')
  }

  return {
    type,
    classCode,
    summary: `${type} ${classCode}`,
    notes: warnings,
  }
}

export function HardHatDecoder() {
  const [impact, setImpact] = useState<ImpactOptionId>('top')
  const [electrical, setElectrical] = useState<ElectricalOptionId>('low')

  const recommendation = useMemo(
    () => getRecommendation(impact, electrical),
    [impact, electrical],
  )

  return (
    <section className="rounded-2xl border bg-background p-5 shadow-sm sm:p-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(320px,0.7fr)]">
        <div className="space-y-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              Quick decoder
            </p>
            <h2 className="mt-2 font-serif text-2xl leading-tight text-foreground sm:text-3xl">
              Choose the hard hat type and class
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Use this as a purchasing starting point. The final decision should match the
              hazard assessment, site rules, and the label on the product.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-semibold text-foreground">Impact exposure</span>
              <select
                value={impact}
                onChange={(event) => {
                  const value = event.target.value
                  if (isImpactOptionId(value)) {
                    setImpact(value)
                  }
                }}
                className="mt-2 min-h-11 w-full rounded-md border bg-background px-3 text-sm outline-none transition-colors focus:border-primary"
              >
                {IMPACT_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
              <span className="mt-2 block text-xs leading-5 text-muted-foreground">
                {IMPACT_OPTIONS.find((option) => option.id === impact)?.description}
              </span>
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-foreground">Electrical exposure</span>
              <select
                value={electrical}
                onChange={(event) => {
                  const value = event.target.value
                  if (isElectricalOptionId(value)) {
                    setElectrical(value)
                  }
                }}
                className="mt-2 min-h-11 w-full rounded-md border bg-background px-3 text-sm outline-none transition-colors focus:border-primary"
              >
                {ELECTRICAL_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
              <span className="mt-2 block text-xs leading-5 text-muted-foreground">
                {ELECTRICAL_OPTIONS.find((option) => option.id === electrical)?.description}
              </span>
            </label>
          </div>
        </div>

        <aside className="rounded-xl border bg-primary/5 p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <HardHat className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                Recommended starting point
              </p>
              <p className="mt-1 text-2xl font-semibold text-foreground">
                {recommendation.summary}
              </p>
            </div>
          </div>

          <ul className="mt-5 space-y-3 text-sm leading-6 text-muted-foreground">
            <li className="flex gap-2">
              <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              <span>{recommendation.type} matches the selected impact-direction starting point.</span>
            </li>
            <li className="flex gap-2">
              <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              <span>{recommendation.classCode} is the electrical class starting point to verify on the product label.</span>
            </li>
            {recommendation.notes.map((note) => (
              <li key={note} className="flex gap-2">
                <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                <span>{note}</span>
              </li>
            ))}
          </ul>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row lg:flex-col">
            <Link
              href="/downloads/construction-ppe-rfq-template?source=tool-hard-hat-class-decoder"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Add to RFQ template
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href="/quote?source=tool-hard-hat-class-decoder"
              className="inline-flex min-h-11 items-center justify-center rounded-md border bg-background px-4 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
            >
              Request head protection quote
            </Link>
          </div>
        </aside>
      </div>
    </section>
  )
}
