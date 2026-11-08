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
import { ToolRelatedGuidesSection } from '@/components/store/tool-related-guides-section'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { calculateQuoteTotal } from '@/lib/ai-quote'
import { TOOL_RELATED_GUIDES } from '@/lib/tool-related-guides'
import type { AiQuoteResponse, QuoteItem } from '@/types/ai-quote'
import theme from '../tools-theme.module.css'
import styles from './ai-quote.module.css'

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
    <div className={theme.page}>
      <div className={styles.shell}>
        <nav aria-label="Breadcrumb" className={styles.breadcrumb}>
          <Link href="/">Home</Link>
          <ChevronRight size={15} aria-hidden="true" />
          <Link href="/tools">Tools</Link>
          <ChevronRight size={15} aria-hidden="true" />
          <span aria-current="page">AI Quote</span>
        </nav>

        <section data-tool-hero className={styles.hero} aria-labelledby="quote-title">
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>
              <Sparkles size={16} aria-hidden="true" />
              AI-Powered Tool
            </p>
            <h1 id="quote-title">
              Describe Your Needs,
              <span>Get an Instant Quote</span>
            </h1>
            <p>
              Enter your workforce, job roles, and site hazards. Our AI runs semantic search
              against your real product catalog and generates a quote you can edit and export.
            </p>
          </div>

          <aside className={styles.retrieval} aria-label="Retrieval Pipeline">
            <p>Retrieval Pipeline</p>
            <ol>
              {STEPS.map((step, index) => {
                const isCurrentlyActive = index === activeStep && isLoading
                return (
                  <li key={step.label} data-active={index <= activeStep} aria-current={isCurrentlyActive ? 'step' : undefined}>
                    <span className={styles.pipelineIndex} aria-hidden="true">
                      {isCurrentlyActive ? <Loader2 size={17} className="motion-safe:animate-spin" /> : '0' + (index + 1)}
                    </span>
                    <div>
                      <strong>{step.label}</strong>
                      <span>{step.sub}</span>
                    </div>
                  </li>
                )
              })}
            </ol>
          </aside>
        </section>

        <div className={styles.workbench}>
          <section data-tool-panel className={styles.panel} aria-labelledby="quote-requirements">
            <div className={styles.panelHeading}>
              <span aria-hidden="true">01</span>
              <div>
                <h2 id="quote-requirements">Describe Your Requirements</h2>
                <p id="quote-input-help">
                  Include job roles, headcount, work environment, key hazards, and whether you need a
                  complete kit.
                </p>
              </div>
            </div>

            <div className={styles.panelBody}>
              <Textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                aria-labelledby="quote-requirements"
                aria-describedby="quote-input-help"
                placeholder="e.g. We have 50 welders who need head, eye, hand, and respiratory protection. The site has sparks, high heat, and fumes."
                className={styles.input}
                disabled={isLoading}
              />

              <div className={styles.examples}>
                <p>Example briefs</p>
                {EXAMPLES.map((example) => (
                  <button key={example} type="button" disabled={isLoading} onClick={() => setDescription(example)}>
                    <ChevronRight size={15} aria-hidden="true" />
                    {example}
                  </button>
                ))}
              </div>

              <div className={styles.actions}>
                <Button
                  type="button"
                  size="lg"
                  className={styles.generate}
                  disabled={isLoading || description.trim().length < 5}
                  onClick={handleGenerate}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="motion-safe:animate-spin" aria-hidden="true" />
                      Generating...
                    </>
                  ) : (
                    <>
                      Generate Quote
                      <WandSparkles aria-hidden="true" />
                    </>
                  )}
                </Button>
                <Button type="button" variant="outline" size="lg" className={styles.secondary} onClick={handleReset}>
                  Reset
                </Button>
              </div>

              <div className={styles.generation} aria-label="Generation Pipeline">
                <p><ShieldCheck size={16} aria-hidden="true" /> Generation Pipeline</p>
                <ol>
                  {STEPS.map((step, index) => {
                    const isCurrentlyActive = index === activeStep && isLoading
                    const isDone = index < activeStep || (!isLoading && items.length > 0)
                    return (
                      <li key={step.label} data-done={isDone} aria-current={isCurrentlyActive ? 'step' : undefined}>
                        <span>Step {index + 1}</span>
                        <strong>{step.label}</strong>
                      </li>
                    )
                  })}
                </ol>
              </div>

              {error ? <p className={styles.error} role="alert">{error}</p> : null}
            </div>
          </section>

          <section data-tool-results className={styles.panel} aria-labelledby="quote-results" aria-busy={isLoading}>
            <div className={styles.panelHeading}>
              <span aria-hidden="true">02</span>
              <div className={styles.resultHeading}>
                <div>
                  <h2 id="quote-results">Quote Results</h2>
                  <p aria-live="polite">
                    {items.length > 0
                      ? items.length + (items.length === 1 ? ' item generated' : ' items generated') + ' — edit quantities or remove items as needed.'
                      : 'Your editable quote will appear here after generation.'}
                  </p>
                </div>
                {items.length > 0 ? (
                  <Button type="button" variant="ghost" className={styles.regenerate} onClick={handleReset}>
                    <RefreshCw aria-hidden="true" />
                    Regenerate
                  </Button>
                ) : null}
              </div>
            </div>

            <div className={styles.panelBody}>
              {isLoading ? (
                <div className={styles.empty} role="status">
                  <Loader2 size={32} className="motion-safe:animate-spin" aria-hidden="true" />
                  <p>Generating your quote…</p>
                </div>
              ) : items.length > 0 ? (
                <div className={styles.resultBody}>
                  <dl className={styles.metrics}>
                    <div>
                      <dt>Items</dt>
                      <dd>{items.length}</dd>
                    </div>
                    <div>
                      <dt>Quantity</dt>
                      <dd>{items.reduce((sum, item) => sum + item.quantity, 0)}</dd>
                    </div>
                    <div>
                      <dt>Total</dt>
                      <dd>¥{total.toFixed(2)}</dd>
                    </div>
                  </dl>

                  <div className={styles.resultTable} role="region" aria-label="Editable quote items" tabIndex={0}>
                    <QuoteTable items={items} onChange={setItems} />
                  </div>

                  <div className={styles.exports}>
                    <div>
                      <h3>Export This Quote</h3>
                      <p>Any quantity edits or removed items will be reflected in the export.</p>
                    </div>
                    <ExportButtons items={items} />
                  </div>
                </div>
              ) : (
                <div className={styles.empty}>
                  <Sparkles size={34} aria-hidden="true" />
                  <h3>Waiting for Your Input</h3>
                  <p>
                    Describe your workforce and hazards to begin. The AI will search your product
                    catalog and generate an editable, exportable procurement quote.
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>

        <div className={styles.guides} data-tool-reading>
          <ToolRelatedGuidesSection
            title="Guides to prepare a better quote request"
            description="Use these high-intent buying guides when you need to turn the generated shortlist into quantities, standards, kit structure, and supplier questions."
            guides={TOOL_RELATED_GUIDES['ai-quote']}
          />
        </div>
      </div>
    </div>
  )
}
