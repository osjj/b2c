import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronRight, Home, Clock, RefreshCw, FileCheck, Info } from 'lucide-react'
import { ToolRelatedGuidesSection } from '@/components/store/tool-related-guides-section'
import { getSiteUrl } from '@/lib/site-url'
import { TOOL_RELATED_GUIDES } from '@/lib/tool-related-guides'
import { PpeCalculator } from './calculator-client'

const TITLE = 'PPE Quantity Calculator — Monthly Consumption & Budget Planner'
const DESCRIPTION =
  'Free PPE quantity calculator. Estimate monthly and annual consumption of gloves, hard hats, safety boots, respirators, hi-vis and more — by industry, headcount, shift pattern and exposure level. Export a budget-ready CSV.'

const QUOTE_HREF = '/quote?source=tool-ppe-calculator'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    'PPE quantity calculator',
    'PPE consumption calculator',
    'PPE replenishment calculator',
    'safety equipment budget',
    'how much PPE do I need',
    'monthly PPE cost per worker',
    'PPE budget planning',
    'safety supplies estimator',
    'glove consumption rate',
    'respirator replacement schedule',
  ],
  alternates: { canonical: `${getSiteUrl()}/tools/ppe-calculator` },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: `${getSiteUrl()}/tools/ppe-calculator`,
    type: 'website',
    images: [
      {
        url: '/og-image-main.webp',
        width: 1200,
        height: 630,
        alt: 'PPE Quantity Calculator — free monthly consumption and budget planner',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: ['/og-image-main.webp'],
  },
}

const REPLACEMENT_GUIDE = [
  { item: 'Disposable nitrile gloves', interval: 'Per task (food/chemical: change every 2–4 hours)', lifespan: 'Single use' },
  { item: 'Cut-resistant gloves (A4–A6)', interval: 'Every 2–3 weeks of heavy use', lifespan: '80–120 hours' },
  { item: 'Safety glasses', interval: 'When scratched or damaged (monthly average)', lifespan: '1–6 months' },
  { item: 'Hard hat (ANSI Z89.1)', interval: 'Every 2–5 years, immediately after impact', lifespan: 'Date-coded' },
  { item: 'Hi-vis vest (ANSI 107)', interval: 'When striping degrades or fades', lifespan: '8–12 months' },
  { item: 'Safety boots (ASTM F2413)', interval: 'Every 5–8 months of heavy use', lifespan: '6–12 months' },
  { item: 'N95 / FFP2 respirator', interval: 'Per shift; sooner if damp or damaged', lifespan: 'Single shift' },
  { item: 'Reusable respirator cartridges', interval: 'End-of-shift or when saturated', lifespan: '8–40 hours' },
  { item: 'Disposable earplugs', interval: 'Per shift (never re-use corded)', lifespan: 'Single use' },
  { item: 'Fall-arrest harness', interval: 'Every 2 years; immediately after arresting a fall', lifespan: '24 months' },
]

const FAQ = [
  {
    q: 'How do I calculate how much PPE my company needs?',
    a: 'Start with headcount and role type, multiply industry-average consumption rates for each PPE item by the number of workers, then adjust for shift pattern and exposure level. The calculator automates this with benchmarks from OSHA guidance and industry data.',
  },
  {
    q: 'How often should disposable gloves be replaced?',
    a: 'Disposable nitrile or latex gloves are single-use. Change them between tasks, whenever they contact chemicals, and every 2–4 hours under continuous use to maintain barrier integrity. Heavy-use roles typically consume 60–120 pairs per worker per month.',
  },
  {
    q: 'When should safety boots be replaced?',
    a: 'Replace ASTM F2413 or EN ISO 20345 safety boots every 5–8 months under heavy construction use, or immediately on visible toe-cap damage, sole separation, or significant tread wear. Routine inspection adds several months of protective life.',
  },
  {
    q: 'What is the average annual PPE cost per worker?',
    a: 'Annual PPE cost typically ranges from $180 per worker (low-exposure warehouse) to $650+ per worker (chemical, welding, high-exposure construction), driven by disposable glove and respirator consumption. The calculator gives a specific figure for your inputs.',
  },
  {
    q: 'Does OSHA require the employer to pay for PPE?',
    a: 'Yes. Under 29 CFR 1910.132(h) and 1926.95, employers must provide and pay for most PPE at no cost to the employee, with limited exceptions for everyday items and personal-use equipment retained by the worker.',
  },
  {
    q: 'How accurate is this PPE consumption calculator?',
    a: 'It is a planning estimator using industry-average consumption rates. Actual usage varies 20–40% by site conditions, contract pricing and training quality. Use it to set a baseline, then refine against real consumption data after 2–3 months.',
  },
]

export default function PpeCalculatorPage() {
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  }

  const toolJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'PPE Quantity Calculator',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Any',
    url: `${getSiteUrl()}/tools/ppe-calculator`,
    description: DESCRIPTION,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  }

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${getSiteUrl()}/` },
      { '@type': 'ListItem', position: 2, name: 'Tools', item: `${getSiteUrl()}/tools` },
      {
        '@type': 'ListItem',
        position: 3,
        name: 'PPE Calculator',
        item: `${getSiteUrl()}/tools/ppe-calculator`,
      },
    ],
  }

  return (
    <div className="bg-ppe-bg-page min-h-screen pb-24">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(toolJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <nav className="container mx-auto py-2.5 px-4 lg:px-6 text-xs border-b bg-background/50">
        <ol className="flex items-center gap-1.5 text-muted-foreground">
          <li>
            <Link href="/" className="hover:text-foreground transition-colors">
              <Home className="h-3.5 w-3.5" />
            </Link>
          </li>
          <ChevronRight className="h-3 w-3" />
          <li>
            <Link href="/tools" className="hover:text-foreground transition-colors">
              Tools
            </Link>
          </li>
          <ChevronRight className="h-3 w-3" />
          <li className="text-foreground font-medium">PPE Calculator</li>
        </ol>
      </nav>

      {/* Hero */}
      <header className="container mx-auto px-4 lg:px-6 pt-14 pb-10 max-w-4xl text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary mb-4">
          Planning Tool · Free
        </p>
        <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl leading-[1.05] tracking-tight mb-5">
          PPE Quantity Calculator
        </h1>
        <p className="text-muted-foreground text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
          Estimate monthly and annual PPE consumption by industry, shift pattern and
          exposure level. Get a worker-level cost breakdown and export a budget-ready CSV.
        </p>
      </header>

      <div className="container mx-auto px-4 lg:px-6 max-w-6xl">
        <PpeCalculator />
      </div>

      {/* How it works */}
      <section className="container mx-auto px-4 lg:px-6 max-w-4xl mt-20">
        <h2 className="font-serif text-3xl sm:text-4xl leading-tight mb-6">
          How to calculate PPE needs
        </h2>
        <p className="text-muted-foreground text-base leading-[1.85] mb-6">
          A defensible PPE plan starts with four inputs: headcount by role, industry-specific
          consumption rates, shift pattern and exposure level. The calculator combines them
          using the following logic:
        </p>
        <div className="rounded-xl border bg-background p-6 shadow-sm font-mono text-sm leading-relaxed">
          <span className="text-primary font-semibold">Monthly quantity</span> ={' '}
          <span className="text-foreground">Workers</span> ×{' '}
          <span className="text-foreground">Baseline rate per worker</span> ×{' '}
          <span className="text-foreground">Role multiplier</span> ×{' '}
          <span className="text-foreground">Shift multiplier</span> ×{' '}
          <span className="text-foreground">Exposure multiplier</span>
        </div>

        <div className="grid gap-5 sm:grid-cols-3 mt-8">
          <div className="rounded-xl border bg-background p-5 shadow-sm">
            <Clock className="h-5 w-5 text-primary mb-2" />
            <h3 className="font-semibold text-foreground mb-1">Shift pattern</h3>
            <p className="text-sm text-muted-foreground">
              Extended 12-hour shifts consume ~1.5× baseline PPE; 24/7 rotations ~2.2×.
            </p>
          </div>
          <div className="rounded-xl border bg-background p-5 shadow-sm">
            <RefreshCw className="h-5 w-5 text-primary mb-2" />
            <h3 className="font-semibold text-foreground mb-1">Exposure level</h3>
            <p className="text-sm text-muted-foreground">
              Heavy dust, chemicals or contamination push disposable consumption 1.6× higher.
            </p>
          </div>
          <div className="rounded-xl border bg-background p-5 shadow-sm">
            <FileCheck className="h-5 w-5 text-primary mb-2" />
            <h3 className="font-semibold text-foreground mb-1">Compliance buffer</h3>
            <p className="text-sm text-muted-foreground">
              Add 10–15% safety stock to cover lost/damaged items and audit reserves.
            </p>
          </div>
        </div>
      </section>

      {/* Replacement schedule */}
      <section className="container mx-auto px-4 lg:px-6 max-w-5xl mt-20">
        <h2 className="font-serif text-3xl sm:text-4xl leading-tight mb-3">
          PPE replacement schedule benchmarks
        </h2>
        <p className="text-muted-foreground text-base leading-relaxed mb-6">
          Typical replacement intervals for common PPE items under normal use. Harsher
          environments (chemical, welding, offshore) shorten these intervals significantly.
        </p>
        <div className="overflow-x-auto rounded-xl border bg-background shadow-sm">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-muted/60">
                <th className="border-b px-4 py-3 text-left font-semibold">PPE Item</th>
                <th className="border-b px-4 py-3 text-left font-semibold">Replacement interval</th>
                <th className="border-b px-4 py-3 text-left font-semibold">Typical lifespan</th>
              </tr>
            </thead>
            <tbody>
              {REPLACEMENT_GUIDE.map((row) => (
                <tr
                  key={row.item}
                  className="border-b last:border-b-0 odd:bg-background even:bg-muted/20"
                >
                  <td className="px-4 py-3 align-top font-medium">{row.item}</td>
                  <td className="px-4 py-3 align-top text-foreground/85">{row.interval}</td>
                  <td className="px-4 py-3 align-top text-foreground/85">{row.lifespan}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="container mx-auto px-4 lg:px-6 max-w-5xl mt-20">
        <ToolRelatedGuidesSection
          title="Use these guides to refine your PPE quantities"
          description="The calculator gives a planning number. These high-impression buying guides help you adjust that number by task, replacement rate, and PPE category before sending an RFQ."
          guides={TOOL_RELATED_GUIDES['ppe-calculator']}
        />
      </section>

      {/* FAQ */}
      <section className="container mx-auto px-4 lg:px-6 max-w-3xl mt-20">
        <h2 className="font-serif text-3xl sm:text-4xl leading-tight mb-8 text-center">
          Frequently asked questions
        </h2>
        <div className="space-y-5">
          {FAQ.map((item) => (
            <details
              key={item.q}
              className="group rounded-xl border bg-background p-5 shadow-sm [&_summary::-webkit-details-marker]:hidden"
            >
              <summary className="flex items-start justify-between gap-4 cursor-pointer font-semibold text-foreground list-none">
                <span>{item.q}</span>
                <ChevronRight className="h-5 w-5 flex-shrink-0 text-muted-foreground transition-transform group-open:rotate-90" />
              </summary>
              <p className="mt-3 text-muted-foreground leading-relaxed">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Related links */}
      <section className="container mx-auto px-4 lg:px-6 max-w-4xl mt-20">
        <div className="rounded-2xl border bg-gradient-to-br from-primary/5 via-background to-background p-8 sm:p-10 shadow-sm">
          <div className="flex items-start gap-4">
            <Info className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
            <div>
              <h2 className="font-serif text-2xl leading-tight mb-3">
                Next step: get a tailored quote
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-5">
                Once you have a consumption estimate, send it to our sourcing team for a
                quote, or use the{' '}
                <Link href="/tools/ai-quote" className="text-primary font-semibold hover:underline">
                  AI Quote Generator
                </Link>{' '}
                to match it to specific SKUs from our catalog with real pricing. Or learn
                the standards behind the items in our{' '}
                <Link href="/blog/construction-safety-footwear-guide" className="text-primary font-semibold hover:underline">
                  construction safety footwear guide
                </Link>
                .
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  href={QUOTE_HREF}
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:shadow-md transition-all"
                >
                  Request quote
                </Link>
                <Link
                  href="/tools/ai-quote"
                  className="inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-muted transition-colors"
                >
                  Open AI Quote
                </Link>
                <Link
                  href="/products"
                  className="inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-muted transition-colors"
                >
                  Browse catalog
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
