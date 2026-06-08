import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowRight,
  BookOpenCheck,
  ChevronRight,
  ClipboardCheck,
  FileCheck2,
  HardHat,
  Home,
  ShieldCheck,
  Zap,
} from 'lucide-react'
import { ToolRelatedGuidesSection } from '@/components/store/tool-related-guides-section'
import { getSiteUrl } from '@/lib/site-url'
import { TOOL_RELATED_GUIDES } from '@/lib/tool-related-guides'
import { HardHatDecoder } from './decoder-client'

const PAGE_PATH = '/tools/hard-hat-class-decoder'
const TITLE = 'Hard Hat Class Decoder - Type I vs Type II, Class G, E and C'
const DESCRIPTION =
  'Free hard hat class decoder for construction buyers. Compare ANSI/ISEA Z89.1 Type I vs Type II and Class G, Class E, and Class C before adding head protection to an RFQ.'
const QUOTE_HREF = '/quote?source=tool-hard-hat-class-decoder'
const RFQ_HREF = '/downloads/construction-ppe-rfq-template?source=tool-hard-hat-class-decoder'

const TYPE_ROWS = [
  {
    code: 'Type I',
    meaning: 'Top impact protection',
    use: 'General construction sites where falling objects above the worker are the main head hazard.',
  },
  {
    code: 'Type II',
    meaning: 'Top and lateral impact protection',
    use: 'Scaffolding, steel work, climbing-style helmets, tight equipment zones, and tasks where side impact is realistic.',
  },
]

const CLASS_ROWS = [
  {
    code: 'Class G',
    meaning: 'General electrical protection',
    use: 'Common construction baseline where limited electrical exposure may exist. ANSI testing is commonly referenced at 2,200 volts.',
  },
  {
    code: 'Class E',
    meaning: 'Higher electrical protection',
    use: 'Electrical work or sites where stronger dielectric protection is required. ANSI testing is commonly referenced at 20,000 volts.',
  },
  {
    code: 'Class C',
    meaning: 'Conductive, no electrical protection',
    use: 'Ventilated comfort where electrical exposure is controlled out. Do not use around electrical hazards.',
  },
]

const TASK_ROWS = [
  ['General building site', 'Type I Class G', 'Most useful baseline when overhead impact is the main concern.'],
  ['Electrical installation', 'Type I or Type II Class E', 'Avoid vented shells unless the label still confirms the required class.'],
  ['Scaffolding or elevated work', 'Type II Class G or E', 'Side impact and chin strap retention often matter more.'],
  ['Roadwork or equipment zones', 'Type I or Type II Class G', 'Add hi-vis, eyewear, hearing, and visibility checks to the same RFQ.'],
  ['Hot outdoor work with no electrical exposure', 'Class C only if allowed', 'Class C improves ventilation but removes electrical protection.'],
]

const FAQ = [
  {
    q: 'What is a Class E hard hat?',
    a: 'A Class E hard hat is the higher electrical-insulation class used in many electrical construction specifications. Buyers should confirm the ANSI/ISEA Z89.1 marking on the shell or label and match the choice to the site hazard assessment.',
  },
  {
    q: 'What is a Class G hard hat?',
    a: 'A Class G hard hat is a general-use electrical class. It is often used as a construction baseline where impact protection is needed and limited electrical exposure may exist.',
  },
  {
    q: 'What class of hard hat does not provide electrical protection?',
    a: 'Class C hard hats do not provide electrical protection. They are conductive and usually chosen for ventilation or comfort only where electrical exposure has been controlled out.',
  },
  {
    q: 'What is the difference between Type I and Type II hard hats?',
    a: 'Type I hard hats are intended for top impact protection. Type II hard hats add lateral impact protection, which can be useful for scaffolding, climbing-style helmets, steel work, and tight construction zones.',
  },
  {
    q: 'Can I buy one hard hat class for every construction worker?',
    a: 'Sometimes, but it is safer to map head protection by task. Electrical crews, scaffold crews, equipment zones, visitors, and general labor may need different type, class, venting, chin strap, and accessory decisions.',
  },
]

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    'hard hat class decoder',
    'hard hat classes',
    'Class E hard hat',
    'Class G hard hat',
    'Class C hard hat',
    'Type I vs Type II hard hat',
    'ANSI Z89.1 hard hat classes',
    'what is a class e hard hat',
    'what class hard hat for electrical work',
  ],
  alternates: { canonical: `${getSiteUrl()}${PAGE_PATH}` },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: `${getSiteUrl()}${PAGE_PATH}`,
    type: 'website',
    images: [{ url: '/og-image-main.webp', width: 1200, height: 630, alt: TITLE }],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: ['/og-image-main.webp'],
  },
}

export default function HardHatClassDecoderPage() {
  const siteUrl = getSiteUrl()
  const pageUrl = `${siteUrl}${PAGE_PATH}`

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  }

  const appJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Hard Hat Class Decoder',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    url: pageUrl,
    description: DESCRIPTION,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  }

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${siteUrl}/` },
      { '@type': 'ListItem', position: 2, name: 'Tools', item: `${siteUrl}/tools` },
      {
        '@type': 'ListItem',
        position: 3,
        name: 'Hard Hat Class Decoder',
        item: pageUrl,
      },
    ],
  }

  return (
    <div className="min-h-screen bg-ppe-bg-page pb-24">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(appJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <nav className="container mx-auto border-b bg-background/50 px-4 py-2.5 text-xs lg:px-6">
        <ol className="flex items-center gap-1.5 text-muted-foreground">
          <li>
            <Link href="/" className="hover:text-foreground" aria-label="Home">
              <Home className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </li>
          <ChevronRight className="h-3 w-3" aria-hidden="true" />
          <li>
            <Link href="/tools" className="hover:text-foreground">
              Tools
            </Link>
          </li>
          <ChevronRight className="h-3 w-3" aria-hidden="true" />
          <li className="text-foreground font-medium">Hard Hat Class Decoder</li>
        </ol>
      </nav>

      <header className="container mx-auto max-w-4xl px-4 pb-10 pt-14 text-center lg:px-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary">
          Head Protection Tool
        </p>
        <h1 className="mt-4 font-serif text-4xl leading-[1.05] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
          Hard Hat Class Decoder
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          Decode Type I vs Type II and Class G, Class E, and Class C before you
          specify construction hard hats in a bulk PPE order.
        </p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href={RFQ_HREF}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Add to RFQ template
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link
            href="/blog/construction-hard-hat-types"
            className="inline-flex min-h-11 items-center justify-center rounded-md border bg-background px-5 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
          >
            Read hard hat guide
          </Link>
        </div>
      </header>

      <main className="container mx-auto max-w-6xl px-4 lg:px-6">
        <HardHatDecoder />

        <section className="mt-16 grid gap-5 md:grid-cols-3">
          <article className="rounded-2xl border bg-background p-5 shadow-sm">
            <HardHat className="h-6 w-6 text-primary" aria-hidden="true" />
            <h2 className="mt-4 text-lg font-semibold text-foreground">Type answers impact direction</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Use Type I for top impact. Use Type II when side or lateral impact is a realistic jobsite hazard.
            </p>
          </article>
          <article className="rounded-2xl border bg-background p-5 shadow-sm">
            <Zap className="h-6 w-6 text-primary" aria-hidden="true" />
            <h2 className="mt-4 text-lg font-semibold text-foreground">Class answers electrical exposure</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Class E and G are electrical classes. Class C is conductive and should not be used around electrical hazards.
            </p>
          </article>
          <article className="rounded-2xl border bg-background p-5 shadow-sm">
            <ClipboardCheck className="h-6 w-6 text-primary" aria-hidden="true" />
            <h2 className="mt-4 text-lg font-semibold text-foreground">RFQ should name both</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              A supplier quote should specify type, class, shell style, venting, chin strap, accessories, and label proof.
            </p>
          </article>
        </section>

        <section className="mt-20">
          <div className="mb-6 flex items-center gap-3">
            <ShieldCheck className="h-6 w-6 text-primary" aria-hidden="true" />
            <h2 className="font-serif text-3xl leading-tight text-foreground sm:text-4xl">
              Hard hat types and classes
            </h2>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="overflow-hidden rounded-2xl border bg-background shadow-sm">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-muted/60">
                    <th className="border-b px-4 py-3 text-left font-semibold">Type</th>
                    <th className="border-b px-4 py-3 text-left font-semibold">Meaning</th>
                    <th className="border-b px-4 py-3 text-left font-semibold">Use</th>
                  </tr>
                </thead>
                <tbody>
                  {TYPE_ROWS.map((row) => (
                    <tr key={row.code} className="border-b last:border-b-0 odd:bg-background even:bg-muted/20">
                      <td className="px-4 py-3 font-mono font-semibold text-primary">{row.code}</td>
                      <td className="px-4 py-3 font-medium text-foreground">{row.meaning}</td>
                      <td className="px-4 py-3 leading-6 text-muted-foreground">{row.use}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="overflow-hidden rounded-2xl border bg-background shadow-sm">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-muted/60">
                    <th className="border-b px-4 py-3 text-left font-semibold">Class</th>
                    <th className="border-b px-4 py-3 text-left font-semibold">Meaning</th>
                    <th className="border-b px-4 py-3 text-left font-semibold">Use</th>
                  </tr>
                </thead>
                <tbody>
                  {CLASS_ROWS.map((row) => (
                    <tr key={row.code} className="border-b last:border-b-0 odd:bg-background even:bg-muted/20">
                      <td className="px-4 py-3 font-mono font-semibold text-primary">{row.code}</td>
                      <td className="px-4 py-3 font-medium text-foreground">{row.meaning}</td>
                      <td className="px-4 py-3 leading-6 text-muted-foreground">{row.use}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="mt-20">
          <div className="mb-6 flex items-center gap-3">
            <FileCheck2 className="h-6 w-6 text-primary" aria-hidden="true" />
            <h2 className="font-serif text-3xl leading-tight text-foreground sm:text-4xl">
              Construction task matrix
            </h2>
          </div>
          <div className="overflow-x-auto rounded-2xl border bg-background shadow-sm">
            <table className="w-full min-w-[760px] border-collapse text-sm">
              <thead>
                <tr className="bg-muted/60">
                  <th className="border-b px-4 py-3 text-left font-semibold">Task</th>
                  <th className="border-b px-4 py-3 text-left font-semibold">Starting point</th>
                  <th className="border-b px-4 py-3 text-left font-semibold">Buyer note</th>
                </tr>
              </thead>
              <tbody>
                {TASK_ROWS.map(([task, startingPoint, note]) => (
                  <tr key={task} className="border-b last:border-b-0 odd:bg-background even:bg-muted/20">
                    <td className="px-4 py-3 font-medium text-foreground">{task}</td>
                    <td className="px-4 py-3 font-mono font-semibold text-primary">{startingPoint}</td>
                    <td className="px-4 py-3 leading-6 text-muted-foreground">{note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-20">
          <ToolRelatedGuidesSection
            title="Guides to finish the head protection decision"
            description="Use these pages when the decoder result needs to become a full construction PPE specification, kit, or RFQ."
            guides={TOOL_RELATED_GUIDES['hard-hat-class-decoder']}
          />
        </section>

        <section className="mt-20 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
              <BookOpenCheck className="h-4 w-4" aria-hidden="true" />
              FAQ
            </p>
            <h2 className="mt-3 font-serif text-3xl leading-tight text-foreground">
              Hard hat class questions
            </h2>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              These answers target the short questions already appearing in Search Console.
            </p>
          </div>
          <div className="grid gap-3">
            {FAQ.map((item) => (
              <article key={item.q} className="rounded-xl border bg-background p-5 shadow-sm">
                <h3 className="text-base font-semibold text-foreground">{item.q}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.a}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-20 rounded-2xl border bg-primary/5 p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl">
              <h2 className="font-serif text-3xl leading-tight text-foreground">
                Add the selected hard hat type and class to your PPE RFQ.
              </h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Include Type I or Type II, Class G/E/C, shell style, venting, chin strap,
                accessory compatibility, label photos, and replacement suspension needs.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <Link
                href={RFQ_HREF}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Open RFQ template
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href={QUOTE_HREF}
                className="inline-flex min-h-11 items-center justify-center rounded-md border bg-background px-5 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
              >
                Request a quote
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
