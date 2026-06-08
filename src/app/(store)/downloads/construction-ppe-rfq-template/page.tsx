import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowRight,
  BadgeCheck,
  ClipboardCheck,
  Download,
  FileCheck2,
  FileText,
  PackageCheck,
  Ruler,
  ShieldCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BreadcrumbJsonLd, FaqJsonLd } from '@/components/seo'
import { getSiteUrl } from '@/lib/site-url'

const PAGE_PATH = '/downloads/construction-ppe-rfq-template'
const PDF_PATH = '/downloads/construction-ppe-rfq-template.pdf'
const PDF_HREF = `${PDF_PATH}?source=construction-ppe-rfq-template`
const QUOTE_HREF = '/quote?source=construction-ppe-rfq-template'
const AI_QUOTE_HREF = '/tools/ai-quote?source=construction-ppe-rfq-template'
const CALCULATOR_HREF = '/tools/ppe-calculator?source=construction-ppe-rfq-template'

const FIELD_GROUPS = [
  {
    label: 'Project scope',
    items: ['Site name', 'Delivery country', 'Worker roles', 'Order deadline'],
  },
  {
    label: 'PPE requirements',
    items: ['PPE categories', 'Standards', 'Quantities', 'Size ranges'],
  },
  {
    label: 'Supplier response',
    items: ['MOQ', 'Lead time', 'Samples', 'Quote validity'],
  },
  {
    label: 'Compliance proof',
    items: ['Certificates', 'Test reports', 'Label photos', 'User instructions'],
  },
]

const RFQ_FIELDS = [
  {
    field: 'Project and delivery details',
    buyerInput: 'Project type, delivery country, target market, quote deadline, and expected delivery date.',
    reason: 'Keeps the supplier response tied to the real jobsite and export requirements.',
  },
  {
    field: 'PPE category scope',
    buyerInput: 'Head, eye, hand, foot, hi-vis, respiratory, hearing, fall protection, and task add-ons.',
    reason: 'Prevents a generic PPE bundle from replacing a hazard-based buying list.',
  },
  {
    field: 'Standards and markings',
    buyerInput: 'ANSI, ASTM, NIOSH, OSHA, CE, EN, UKCA, or buyer-specific standard requirements.',
    reason: 'Makes supplier quotes comparable before price negotiation starts.',
  },
  {
    field: 'Quantities and sizes',
    buyerInput: 'Worker count, initial quantity, replacement stock, size curve, and reorder timing.',
    reason: 'Reduces underbuying, oversizing, and fit problems after shipment.',
  },
  {
    field: 'Documents and samples',
    buyerInput: 'Certificates, test reports, data sheets, label photos, packaging photos, and samples.',
    reason: 'Filters suppliers before the order reaches approval or inspection.',
  },
  {
    field: 'Packaging and delivery',
    buyerInput: 'Carton labeling, worker kits, trade packs, private label, Incoterms, and destination details.',
    reason: 'Makes bulk orders easier to issue, track, and replenish on site.',
  },
]

const CATEGORY_ROWS = [
  ['Head protection', 'ANSI/ISEA Z89.1, EN 397', 'Type, class, suspension, chin strap, accessory compatibility'],
  ['Eye and face protection', 'ANSI Z87.1, EN 166', 'Safety glasses, goggles, face shields, anti-fog, splash or dust needs'],
  ['Hand protection', 'ANSI/ISEA 105, EN 388, EN 374', 'Cut, impact, grip, coating, chemical, heat, and size range'],
  ['Safety footwear', 'ASTM F2413, EN ISO 20345', 'Toe cap, puncture, slip, EH, waterproof, metatarsal, size curve'],
  ['High-visibility clothing', 'ANSI/ISEA 107, EN ISO 20471', 'Class, color, reflective layout, rainwear, replacement timing'],
  ['Respiratory protection', 'NIOSH, EN 149, EN 140', 'Filter type, cartridge, size, fit testing, replacement parts'],
  ['Hearing protection', 'NRR, SNR, EN 352', 'Earplug, earmuff, helmet-mounted option, hygiene and refill stock'],
  ['Fall protection', 'ANSI Z359, EN 361 family', 'Harness size, lanyard, SRL, anchor, inspection and rescue planning'],
]

const TOOL_STEPS = [
  {
    href: CALCULATOR_HREF,
    title: 'Estimate quantities first',
    description: 'Use the PPE calculator to turn worker count and replacement cycles into RFQ quantities.',
    icon: PackageCheck,
  },
  {
    href: AI_QUOTE_HREF,
    title: 'Draft the RFQ wording',
    description: 'Use the AI quote tool when you need help turning hazards, roles, and standards into a supplier brief.',
    icon: FileText,
  },
  {
    href: '/tools/size-guide?source=construction-ppe-rfq-template',
    title: 'Check footwear sizing',
    description: 'Use the size guide before locking safety boot sizes, width notes, and conversion requirements.',
    icon: Ruler,
  },
]

const FAQ_ITEMS = [
  {
    question: 'What is a construction PPE RFQ?',
    answer:
      'A construction PPE RFQ is a request for quote that defines the jobsite scope, PPE categories, standards, quantities, sizes, documents, packaging, and delivery details suppliers need before pricing a bulk PPE order.',
  },
  {
    question: 'What should be included in a PPE RFQ template?',
    answer:
      'A PPE RFQ template should include worker roles, PPE categories, required standards, size ranges, quantities, replacement stock, supplier documents, sample requests, MOQ, lead time, packaging, and delivery country.',
  },
  {
    question: 'Is this different from a construction RFI?',
    answer:
      'Yes. An RFI usually asks for information or clarification during a project. An RFQ asks suppliers to price a defined scope, so the PPE categories, quantities, standards, and documents need to be clear enough for comparison.',
  },
  {
    question: 'Can I use this template for contractor PPE kits?',
    answer:
      'Yes. Use the template to define kit type, trade or role, size range, standards, packaging, replacement stock, and delivery requirements before asking suppliers to quote contractor PPE kits.',
  },
  {
    question: 'Can I send this template to Laifappe for a quote?',
    answer:
      'Yes. Download the template, fill in the fields you already know, and send it through the quote form. You can also start with a short message if some details are still missing.',
  },
]

export const metadata: Metadata = {
  title: 'Construction PPE RFQ Template for Bulk Orders | Laifappe',
  description:
    'Download a construction PPE RFQ template for bulk orders. Capture worker roles, PPE categories, standards, quantities, sizes, supplier documents, packaging, and delivery details.',
  alternates: {
    canonical: PAGE_PATH,
  },
}

export default function ConstructionPpeRfqTemplatePage() {
  const baseUrl = getSiteUrl()
  const pageUrl = `${baseUrl}${PAGE_PATH}`
  const breadcrumbItems = [
    { name: 'Home', url: baseUrl },
    { name: 'Construction PPE RFQ Template', url: pageUrl },
  ]

  return (
    <main className="min-h-screen bg-ppe-bg-page">
      <BreadcrumbJsonLd items={breadcrumbItems} />
      <FaqJsonLd items={FAQ_ITEMS} />
      <WebPageJsonLd url={pageUrl} />

      <section className="border-b bg-background">
        <div className="container mx-auto grid gap-10 px-4 py-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)] lg:px-6 lg:py-16">
          <div className="flex min-w-0 flex-col justify-center">
            <nav className="mb-7 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <Link href="/" className="hover:text-foreground">
                Home
              </Link>
              <span>/</span>
              <span className="text-foreground">RFQ template</span>
            </nav>
            <div className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border bg-muted/40 px-3 py-1 text-xs font-semibold text-primary">
              <FileCheck2 className="h-3.5 w-3.5" aria-hidden="true" />
              Construction PPE procurement asset
            </div>
            <h1 className="max-w-4xl font-serif text-4xl leading-[1.08] text-foreground sm:text-5xl lg:text-6xl">
              Construction PPE RFQ Template for Bulk Orders
            </h1>
            <p className="mt-6 max-w-3xl text-base leading-7 text-muted-foreground sm:text-lg">
              Use this construction PPE RFQ template to request comparable quotes for safety boots,
              hard hats, hi-vis clothing, gloves, respirators, eye protection, hearing protection,
              and mixed PPE kits.
            </p>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">
              The template helps buyers define quantities, standards, size ranges, supplier
              documents, packaging, delivery country, and replacement stock before sending an RFQ.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="min-h-11">
                <Link
                  href={PDF_HREF}
                  download
                  data-download-asset="construction-ppe-rfq-template"
                  data-download-source="construction-ppe-rfq-template"
                >
                  <Download className="h-4 w-4" aria-hidden="true" />
                  Download RFQ Template
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="min-h-11">
                <Link href={QUOTE_HREF}>
                  Request a Bulk PPE Quote
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            </div>
            <div className="mt-7 flex flex-wrap gap-2 text-xs font-semibold text-muted-foreground">
              {['Standards', 'Quantities', 'Sizes', 'Supplier documents', 'Delivery'].map((item) => (
                <span key={item} className="rounded-full border bg-background px-3 py-1.5">
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
            <div className="flex items-start justify-between gap-4 border-b pb-5">
              <div>
                <p className="text-sm font-semibold text-primary">RFQ field map</p>
                <h2 className="mt-2 text-2xl font-semibold text-foreground">
                  What the template helps you capture
                </h2>
              </div>
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <ClipboardCheck className="h-5 w-5" aria-hidden="true" />
              </span>
            </div>
            <div className="mt-5 divide-y rounded-xl border bg-background">
              {FIELD_GROUPS.map((group) => (
                <section key={group.label} className="p-4">
                  <h3 className="text-sm font-semibold text-foreground">{group.label}</h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {group.items.map((item) => (
                      <span
                        key={item}
                        className="rounded-md bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-12 lg:px-6">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold text-primary">Template scope</p>
          <h2 className="mt-3 font-serif text-3xl leading-tight text-foreground sm:text-4xl">
            What this construction PPE RFQ template includes
          </h2>
          <p className="mt-4 text-sm leading-6 text-muted-foreground sm:text-base">
            Use these fields before asking suppliers for price, samples, documents, or
            substitutions. The goal is to make every quote answer the same buying scope.
          </p>
        </div>

        <div className="mt-8 overflow-hidden rounded-2xl border bg-background shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-muted/60 text-xs font-semibold uppercase text-muted-foreground">
                <tr>
                  <th className="px-5 py-4">RFQ field</th>
                  <th className="px-5 py-4">Buyer input</th>
                  <th className="px-5 py-4">Why it matters</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {RFQ_FIELDS.map((row) => (
                  <tr key={row.field} className="align-top">
                    <td className="px-5 py-4 font-semibold text-foreground">{row.field}</td>
                    <td className="px-5 py-4 leading-6 text-muted-foreground">{row.buyerInput}</td>
                    <td className="px-5 py-4 leading-6 text-muted-foreground">{row.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="border-y bg-background">
        <div className="container mx-auto grid gap-8 px-4 py-12 lg:grid-cols-[0.8fr_1.2fr] lg:px-6">
          <div>
            <p className="text-sm font-semibold text-primary">Category matrix</p>
            <h2 className="mt-3 font-serif text-3xl leading-tight text-foreground">
              PPE categories covered
            </h2>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              Keep the page focused on RFQ execution. For deeper buying strategy, use the
              bulk procurement guide after downloading the template.
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <Link
                href="/blog/bulk-construction-ppe-procurement"
                className="inline-flex min-h-10 items-center gap-2 rounded-md border px-4 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
              >
                Bulk procurement guide
                <ArrowRight className="h-4 w-4 text-primary" aria-hidden="true" />
              </Link>
              <Link
                href="/blog/construction-ppe-checklist"
                className="inline-flex min-h-10 items-center gap-2 rounded-md border px-4 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
              >
                Construction PPE checklist
                <ArrowRight className="h-4 w-4 text-primary" aria-hidden="true" />
              </Link>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {CATEGORY_ROWS.map(([category, standard, notes]) => (
              <article key={category} className="rounded-xl border bg-card p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-foreground">{category}</h3>
                    <p className="mt-1 text-xs font-semibold text-primary">{standard}</p>
                    <p className="mt-2 text-sm leading-5 text-muted-foreground">{notes}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-12 lg:px-6">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(320px,0.75fr)]">
          <div className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
            <p className="text-sm font-semibold text-primary">Copy/paste email</p>
            <h2 className="mt-3 font-serif text-3xl leading-tight text-foreground">
              Short RFQ email to send with the template
            </h2>
            <div className="mt-6 rounded-xl border bg-background p-4 text-sm leading-6 text-muted-foreground">
              <p className="font-semibold text-foreground">Subject: Construction PPE RFQ request</p>
              <p className="mt-4">
                Hello, please quote the attached construction PPE scope. We need pricing,
                MOQ, lead time, available size ranges, applicable standards, sample support,
                certification documents, packaging options, and delivery terms for the listed
                PPE categories.
              </p>
              <p className="mt-4">
                Please also note any substitutions, document gaps, or size limitations before
                quoting so we can compare supplier responses on the same basis.
              </p>
            </div>
          </div>

          <aside className="rounded-2xl border bg-background p-5 shadow-sm sm:p-6">
            <p className="text-sm font-semibold text-primary">Use it with tools</p>
            <div className="mt-4 divide-y rounded-xl border">
              {TOOL_STEPS.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="group block bg-card p-4 transition-colors first:rounded-t-xl last:rounded-b-xl hover:bg-primary/5"
                  >
                    <div className="flex items-start gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Icon className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-foreground group-hover:text-primary">
                          {item.title}
                        </h3>
                        <p className="mt-1 text-sm leading-5 text-muted-foreground">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </aside>
        </div>
      </section>

      <section className="border-y bg-muted/30">
        <div className="container mx-auto px-4 py-12 lg:px-6">
          <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="text-sm font-semibold text-primary">FAQ</p>
              <h2 className="mt-3 font-serif text-3xl leading-tight text-foreground">
                RFQ template questions
              </h2>
              <p className="mt-4 text-sm leading-6 text-muted-foreground">
                Quick answers before downloading the template or sending a bulk PPE quote request.
              </p>
            </div>
            <div className="grid gap-3">
              {FAQ_ITEMS.map((item) => (
                <article key={item.question} className="rounded-xl border bg-background p-5 shadow-sm">
                  <h3 className="text-base font-semibold text-foreground">{item.question}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.answer}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-12 lg:px-6">
        <div className="rounded-2xl border bg-primary/5 p-5 shadow-sm sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-primary">
                <BadgeCheck className="h-4 w-4" aria-hidden="true" />
                Ready to compare supplier responses
              </div>
              <h2 className="font-serif text-3xl leading-tight text-foreground">
                Download the RFQ template, then send the filled scope for pricing.
              </h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                You can send a complete template or start with a short message. Laifappe can
                follow up on missing categories, standards, quantities, and delivery details.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <Button asChild size="lg" className="min-h-11">
                <Link
                  href={PDF_HREF}
                  download
                  data-download-asset="construction-ppe-rfq-template"
                  data-download-source="construction-ppe-rfq-template-bottom"
                >
                  <Download className="h-4 w-4" aria-hidden="true" />
                  Download Template
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="min-h-11 bg-background">
                <Link href={QUOTE_HREF}>
                  Request Quote
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}

function WebPageJsonLd({ url }: { url: string }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Construction PPE RFQ Template for Bulk Orders',
    description:
      'Download a construction PPE RFQ template for bulk orders covering worker roles, PPE categories, standards, quantities, sizes, supplier documents, packaging, and delivery details.',
    url,
      mainEntity: {
      '@type': 'DigitalDocument',
      name: 'Construction PPE RFQ Template',
      url: `${getSiteUrl()}${PDF_PATH}`,
      fileFormat: 'application/pdf',
    },
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}
