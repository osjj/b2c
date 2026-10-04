import theme from '../tools-theme.module.css'
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

const QUOTE_HREF = '/quote'
const QUOTE_SOURCE = 'tool-ppe-calculator'

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
  {
    "item": "Disposable gloves and coveralls",
    "interval": "Follow the product and task change instructions; replace compromised barriers.",
    "lifespan": "Product/task specific"
  },
  {
    "item": "Reusable gloves and eye protection",
    "interval": "Inspect condition, fit and protective performance; replace damaged items.",
    "lifespan": "Manufacturer instructions"
  },
  {
    "item": "Hard hats and harnesses",
    "interval": "Inspect before use and follow manufacturer retirement and post-impact/fall rules.",
    "lifespan": "No universal budget cycle"
  },
  {
    "item": "Safety boots and hi-vis clothing",
    "interval": "Inspect wear, damage and protective performance; replace when unsuitable.",
    "lifespan": "Condition and model specific"
  },
  {
    "item": "Respirators and cartridges",
    "interval": "Use the site respiratory-protection program and a documented, product-specific change schedule.",
    "lifespan": "Not the calculator rate"
  },
  {
    "item": "Hearing protection",
    "interval": "Follow hygiene, inspection, cleaning and component-replacement instructions.",
    "lifespan": "Manufacturer instructions"
  }
]

const FAQ = [
  {
    "q": "How do I calculate how much PPE my company needs?",
    "a": "Select the items needed for your assessed tasks. Multiply workers by a base monthly usage rate and the displayed role, shift and exposure factors. For reusable PPE the base rate is 1 divided by the base replacement cycle in months. Annual consumption is monthly consumption times 12; costs multiply quantity by your unit price."
  },
  {
    "q": "How are purchase quantities rounded?",
    "a": "For each item and horizon, purchase quantity is ceil(consumption estimate divided by your pack size) times pack size. Pack size defaults to 1 and is user supplied, not supplier MOQ. Monthly and annual orders are rounded separately. Adjust for usable stock, initial issue, sizes and lead time before buying."
  },
  {
    "q": "When should PPE be replaced?",
    "a": "The editable cycles are budget assumptions, not safe service lives. Inspect PPE and follow the exact manufacturer instructions and your site program. Damaged or compromised PPE may need immediate replacement. Respirator cartridges need a documented change schedule rather than the calculator usage rate."
  },
  {
    "q": "What is the annual PPE cost per worker in the default plan?",
    "a": "The illustrative Construction, single-shift, medium-exposure plan costs USD 2,371.25 per worker per year before purchase rounding. It includes all 12 applicable lines, including several disposable and reusable alternatives. This is a scenario total, not an industry average or a universal USD 180-650 range. Change item selection, prices and usage to reflect your site."
  },
  {
    "q": "Does OSHA require the employer to pay for PPE?",
    "a": "OSHA 29 CFR 1910.132(h) and 1926.95(d) cover employer payment for required PPE, with specified exceptions. Check the applicable rule and workplace requirements; this calculator does not determine legal compliance."
  },
  {
    "q": "How accurate is this PPE consumption calculator?",
    "a": "No validated accuracy percentage is available. Defaults and factors are illustrative planning inputs reviewed on 3 October 2026, not measured OSHA/BLS benchmarks or supplier quotations. Replace them with site usage records and current USD unit prices. The estimate excludes initial issue, usable stock, tax, freight, training and administration."
  }
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
    <div className={[theme.page, "min-h-screen pb-24"].join(" ")}>
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
      <header data-tool-hero className={[theme.hero, "container mx-auto px-4 lg:px-6 pt-14 pb-10 max-w-4xl text-center"].join(" ")}>
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
      <section data-tool-reading className="container mx-auto px-4 lg:px-6 max-w-4xl mt-20">
        <h2 className="font-serif text-3xl sm:text-4xl leading-tight mb-6">
          How to calculate PPE needs
        </h2>
        <p className="text-muted-foreground text-base leading-[1.85] mb-6">
          A replenishment plan starts with assessed tasks, selected items, workforce size, usage records and supplier prices. The defaults are illustrative; the editable inputs use this logic:
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
              Illustrative factors: single shift 1.0, extended 1.5, continuous 2.2. Avoid double-counting the workforce.
            </p>
          </div>
          <div className="rounded-xl border bg-background p-5 shadow-sm">
            <RefreshCw className="h-5 w-5 text-primary mb-2" />
            <h3 className="font-semibold text-foreground mb-1">Exposure level</h3>
            <p className="text-sm text-muted-foreground">
              Illustrative factors: low 0.7, medium 1.0, high 1.6. Adjust item usage from your own records.
            </p>
          </div>
          <div className="rounded-xl border bg-background p-5 shadow-sm">
            <FileCheck className="h-5 w-5 text-primary mb-2" />
            <h3 className="font-semibold text-foreground mb-1">Stock and initial issue</h3>
            <p className="text-sm text-muted-foreground">
              The estimate excludes initial issue and current stock. Set reserves according to lead times and the site plan.
            </p>
          </div>
        </div>
      </section>

      {/* Replacement schedule */}
      <section data-tool-reading className="container mx-auto px-4 lg:px-6 max-w-5xl mt-20">
        <h2 className="font-serif text-3xl sm:text-4xl leading-tight mb-3">
          Replacement decisions and budget assumptions
        </h2>
        <p className="text-muted-foreground text-base leading-relaxed mb-6">
          A budget cycle does not determine when PPE remains safe. Use the product instructions, inspection findings and site program; the calculator cycles are editable planning assumptions.
        </p>
        <div className="overflow-x-auto rounded-xl border bg-background shadow-sm">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-muted/60">
                <th className="border-b px-4 py-3 text-left font-semibold">PPE Item</th>
                <th className="border-b px-4 py-3 text-left font-semibold">Replacement interval</th>
                <th className="border-b px-4 py-3 text-left font-semibold">Basis for replacement</th>
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

      <section data-tool-reading className="container mx-auto px-4 lg:px-6 max-w-5xl mt-20">
        <ToolRelatedGuidesSection
          title="Use these guides to refine your PPE quantities"
          description="The calculator gives a planning number. These buying guides help you adjust that number by task, replacement rate, and PPE category before sending an RFQ."
          guides={TOOL_RELATED_GUIDES['ppe-calculator']}
        />
      </section>

      {/* FAQ */}
      <section data-tool-reading className="container mx-auto px-4 lg:px-6 max-w-3xl mt-20">
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
      <section data-tool-reading className="container mx-auto px-4 lg:px-6 max-w-4xl mt-20">
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
                  data-source={QUOTE_SOURCE}
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
