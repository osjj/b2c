'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  ChevronRight,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  WandSparkles,
} from 'lucide-react'
import { ExportButtons } from '@/components/tools/ai-quote/ExportButtons'
import { QuoteTable } from '@/components/tools/ai-quote/QuoteTable'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { calculateQuoteTotal } from '@/lib/ai-quote'
import type { AiQuoteResponse, QuoteItem } from '@/types/ai-quote'

const EXAMPLES = [
  '50 welders — need full head, eye, hand, and respiratory PPE for sparks, heat, and fumes.',
  '20 workers in chemical plant — anti-toxin, anti-corrosion, and anti-slip daily gear required.',
  '100 construction workers with fall risk, elevated work, and heavy dust exposure.',
]

const STEPS = [
  {
    label: 'Analyze Requirements',
    sub: 'Identify headcount, role, and hazard types',
  },
  {
    label: 'Match Products',
    sub: 'Recall relevant items from vector index',
  },
  {
    label: 'Generate Quote',
    sub: 'Build editable procurement quote',
  },
] as const

export default function AiQuotePage() {
  const [description, setDescription] = useState('')
  const [items, setItems] = useState<QuoteItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeStep, setActiveStep] = useState(0)
  const timersRef = useRef<number[]>([])

  useEffect(() => {
    return () => {
      for (const timer of timersRef.current) {
        window.clearTimeout(timer)
      }
    }
  }, [])

  const clearTimers = () => {
    for (const timer of timersRef.current) {
      window.clearTimeout(timer)
    }
    timersRef.current = []
  }

  const startProgress = () => {
    clearTimers()
    setActiveStep(0)
    timersRef.current = [
      window.setTimeout(() => setActiveStep(1), 700),
      window.setTimeout(() => setActiveStep(2), 1500),
    ]
  }

  const handleGenerate = async () => {
    if (description.trim().length < 5) return

    setIsLoading(true)
    setError('')
    setItems([])
    startProgress()

    try {
      const response = await fetch('/api/tools/ai-quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: description.trim() }),
      })

      const data = (await response.json()) as AiQuoteResponse

      if (!response.ok || !data.success || !data.items) {
        setError(data.error || 'Failed to generate quote. Please try again.')
        return
      }

      setItems(data.items)
      setActiveStep(STEPS.length - 1)
    } catch (requestError) {
      console.error(requestError)
      setError('Network error. Please check your connection and try again.')
    } finally {
      clearTimers()
      setIsLoading(false)
    }
  }

  const handleReset = () => {
    clearTimers()
    setDescription('')
    setItems([])
    setError('')
    setIsLoading(false)
    setActiveStep(0)
  }

  const total = calculateQuoteTotal(items)

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.14),_transparent_28%),linear-gradient(180deg,_rgba(15,23,42,0.04),_transparent_18%),var(--color-ppe-bg-page)]">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-foreground via-foreground/95 to-foreground/90">
        <div className="absolute inset-0 opacity-[0.08]">
          <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="ai-quote-grid" width="48" height="48" patternUnits="userSpaceOnUse">
                <path d="M 48 0 L 0 0 0 48" fill="none" stroke="white" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#ai-quote-grid)" />
          </svg>
        </div>
        <div className="absolute right-[-12rem] top-[-8rem] h-80 w-80 rounded-full bg-accent/20 blur-3xl" />

        <div className="container relative mx-auto px-6 py-18 lg:px-8">
          <nav
            aria-label="Breadcrumb"
            className="mb-8 flex items-center gap-2 text-sm text-primary-foreground/60"
          >
            <Link href="/" className="transition-colors hover:text-primary-foreground">
              Home
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span>Tools</span>
            <ChevronRight className="h-4 w-4" />
            <span className="text-accent">AI Quote</span>
          </nav>

          <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div className="max-w-3xl">
              <Badge className="mb-5 rounded-full bg-accent/20 px-4 py-1.5 text-accent hover:bg-accent/20">
                <Sparkles className="mr-2 h-4 w-4" />
                AI-Powered Tool
              </Badge>
              <h1 className="text-4xl font-semibold leading-tight text-primary-foreground md:text-6xl">
                Describe Your Needs,
                <span className="block text-accent">Get an Instant Quote</span>
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-primary-foreground/72">
                Enter your workforce, job roles, and site hazards. Our AI runs semantic search
                against your real product catalog and generates a quote you can edit and export.
              </p>
            </div>

            {/* Pipeline steps — hero */}
            <div className="rounded-[2rem] border border-white/10 bg-white/8 p-6 text-primary-foreground backdrop-blur-sm">
              <div className="text-sm uppercase tracking-[0.28em] text-primary-foreground/60">
                Retrieval Pipeline
              </div>
              <div className="mt-5 space-y-4">
                {STEPS.map((step, index) => {
                  const isActive = index <= activeStep
                  const isCurrentlyActive = index === activeStep && isLoading
                  return (
                    <div key={step.label} className="flex items-center gap-4">
                      <div
                        className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-sm font-semibold transition-all duration-500 ${
                          isActive
                            ? 'border-accent bg-accent text-accent-foreground'
                            : 'border-white/20 text-primary-foreground/50'
                        }`}
                      >
                        {isCurrentlyActive ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          `0${index + 1}`
                        )}
                        {isCurrentlyActive && (
                          <span className="absolute inset-0 animate-ping rounded-full bg-accent/40" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium">{step.label}</div>
                        <div className="text-sm text-primary-foreground/60">{step.sub}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main content */}
      <section className="container mx-auto grid gap-8 px-6 py-10 lg:grid-cols-[0.95fr_1.05fr] lg:px-8">
        {/* Input card */}
        <Card className="overflow-hidden border-border/60 bg-white/95 shadow-[0_32px_90px_-50px_rgba(15,23,42,0.35)]">
          <CardHeader className="border-b border-border/60 bg-secondary/35">
            <CardTitle className="flex items-center gap-3 text-2xl">
              <WandSparkles className="h-5 w-5 text-accent" />
              Describe Your Requirements
            </CardTitle>
            <CardDescription>
              Include job roles, headcount, work environment, key hazards, and whether you need a
              complete kit.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <Textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="e.g. We have 50 welders who need head, eye, hand, and respiratory protection. The site has sparks, high heat, and fumes."
              className="min-h-[200px] resize-none rounded-[1.5rem] border-border/60 bg-white px-5 py-4 text-base leading-7"
              disabled={isLoading}
            />

            <div className="flex flex-wrap gap-2">
              {EXAMPLES.map((example) => (
                <button
                  key={example}
                  type="button"
                  disabled={isLoading}
                  onClick={() => setDescription(example)}
                  className="rounded-full border border-border/60 bg-secondary/50 px-4 py-2 text-left text-sm text-foreground transition-colors hover:border-primary/40 hover:bg-white"
                >
                  {example}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                size="lg"
                className="rounded-full px-7"
                disabled={isLoading || description.trim().length < 5}
                onClick={handleGenerate}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  'Generate Quote'
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="rounded-full px-7"
                onClick={handleReset}
              >
                Reset
              </Button>
            </div>

            {/* Step progress indicator */}
            <div className="rounded-[1.5rem] border border-border/60 bg-secondary/25 p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
                <ShieldCheck className="h-4 w-4 text-accent" />
                Generation Pipeline
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                {STEPS.map((step, index) => {
                  const isCurrentlyActive = index === activeStep && isLoading
                  const isDone = index < activeStep || (!isLoading && items.length > 0)
                  return (
                    <div
                      key={step.label}
                      className={`rounded-2xl border px-4 py-3 text-sm transition-all duration-500 ${
                        isCurrentlyActive
                          ? 'animate-pulse border-accent bg-accent/15 text-foreground'
                          : isDone
                          ? 'border-primary/20 bg-white text-foreground'
                          : 'border-border/60 bg-transparent text-muted-foreground'
                      }`}
                    >
                      <div className="flex items-center gap-2 font-medium">
                        {isCurrentlyActive && <Loader2 className="h-3 w-3 animate-spin" />}
                        {step.label}
                      </div>
                      <div className="mt-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                        Step {index + 1}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {error ? (
              <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Result card */}
        <Card className="overflow-hidden border-border/60 bg-white/95 shadow-[0_32px_90px_-50px_rgba(15,23,42,0.35)]">
          <CardHeader className="border-b border-border/60 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="text-2xl">Quote Results</CardTitle>
                <CardDescription>
                  {items.length > 0
                    ? `${items.length} item${items.length > 1 ? 's' : ''} generated — edit quantities or remove items as needed.`
                    : 'Your editable quote will appear here after generation.'}
                </CardDescription>
              </div>
              {items.length > 0 ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="rounded-full"
                  onClick={handleReset}
                >
                  <RefreshCw className="h-4 w-4" />
                  Regenerate
                </Button>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            {isLoading ? (
              /* Skeleton loader while generating */
              <div className="space-y-4 animate-pulse">
                <div className="grid gap-4 sm:grid-cols-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="rounded-[1.5rem] border border-border/60 bg-secondary/35 p-4">
                      <div className="h-3 w-16 rounded-full bg-muted" />
                      <div className="mt-3 h-8 w-12 rounded-lg bg-muted" />
                    </div>
                  ))}
                </div>
                <div className="overflow-hidden rounded-3xl border border-border/60">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-4 border-b border-border/40 px-5 py-4">
                      <div className="h-20 w-20 shrink-0 rounded-2xl bg-muted" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-3/5 rounded-full bg-muted" />
                        <div className="h-3 w-4/5 rounded-full bg-muted/60" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : items.length > 0 ? (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-[1.5rem] border border-border/60 bg-secondary/35 p-4">
                    <div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Items</div>
                    <div className="mt-3 text-3xl font-semibold">{items.length}</div>
                  </div>
                  <div className="rounded-[1.5rem] border border-border/60 bg-secondary/35 p-4">
                    <div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Quantity</div>
                    <div className="mt-3 text-3xl font-semibold">
                      {items.reduce((sum, item) => sum + item.quantity, 0)}
                    </div>
                  </div>
                  <div className="rounded-[1.5rem] border border-border/60 bg-secondary/35 p-4">
                    <div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Total</div>
                    <div className="mt-3 text-3xl font-semibold text-primary">¥{total.toFixed(2)}</div>
                  </div>
                </div>

                <div className="mt-4">
                  <QuoteTable items={items} onChange={setItems} />
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-[1.5rem] border border-border/60 bg-secondary/25 p-5">
                  <div>
                    <div className="text-sm font-medium">Export This Quote</div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Any quantity edits or removed items will be reflected in the export.
                    </p>
                  </div>
                  <ExportButtons items={items} />
                </div>
              </div>
            ) : (
              <div className="flex min-h-[420px] flex-col items-center justify-center rounded-[2rem] border border-dashed border-border/70 bg-secondary/20 px-8 text-center">
                <Sparkles className="h-12 w-12 text-accent" />
                <h2 className="mt-5 text-2xl font-semibold">Waiting for Your Input</h2>
                <p className="mt-3 max-w-md text-sm leading-7 text-muted-foreground">
                  Describe your workforce and hazards on the left. The AI will search your product
                  catalog and generate an editable, exportable procurement quote.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
