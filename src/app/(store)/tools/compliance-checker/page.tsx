import theme from '../tools-theme.module.css'
import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ChevronRight,
  Home,
  ShieldCheck,
  BookOpen,
  FileCheck,
  Info,
} from 'lucide-react'
import { ToolRelatedGuidesSection } from '@/components/store/tool-related-guides-section'
import { getSiteUrl } from '@/lib/site-url'
import { TOOL_RELATED_GUIDES } from '@/lib/tool-related-guides'
import { ComplianceDecoder } from './decoder-client'
import {
  EN_CLASSES,
  EN_ADDONS,
  SLIP_CODES,
  ASTM_CODES,
  STANDARD_COMPARISON,
} from './data'

const TITLE = 'Safety Footwear Compliance Label Decoder — ASTM F2413 & EN ISO 20345'
const DESCRIPTION =
  'Free decoder for safety boot labels. Instantly explain S1, S2, S3, S4, S5, SRC, HRO, ASTM F2413-18, I/75, C/75, EH, PR and supported EN ISO 20345 and ASTM markings, with edition and ambiguity checks.'
const SEO_TITLE = 'What Does S3 SRC HRO Mean? Safety Footwear Label Decoder'

const QUOTE_HREF = '/quote'
const QUOTE_SOURCE = 'tool-compliance-checker'

export const metadata: Metadata = {
  title: SEO_TITLE,
  description: DESCRIPTION,
  keywords: [
    TITLE,
    'ASTM F2413 decoder',
    'EN ISO 20345 label meaning',
    'S1 S2 S3 S4 S5 meaning',
    'S3 SRC HRO',
    'safety boot label explained',
    'what does S3 SRC mean',
    'ASTM F2413-18 codes',
    'I/75 C/75 EH meaning',
    'safety footwear marking',
    'safety boot certification codes',
    'HRO CI HI safety boot',
    'work boot label decoder',
  ],
  alternates: { canonical: `${getSiteUrl()}/tools/compliance-checker` },
  openGraph: {
    title: SEO_TITLE,
    description: DESCRIPTION,
    url: `${getSiteUrl()}/tools/compliance-checker`,
    type: 'website',
    images: [
      {
        url: '/og-image-main.webp',
        width: 1200,
        height: 630,
        alt: 'Safety Footwear Compliance Label Decoder — ASTM F2413 & EN ISO 20345',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: SEO_TITLE,
    description: DESCRIPTION,
    images: ['/og-image-main.webp'],
  },
}

const FAQ = [
  {
    "q": "What does S3 SRC HRO mean on a safety boot?",
    "a": "For EN ISO 20345:2011, S3 includes a protective toecap, closed heel, antistatic properties, heel energy absorption, fuel oil resistance, upper water resistance, penetration resistance and a cleated outsole. SRC means both legacy slip tests; HRO indicates hot-contact outsole resistance. S3 does not require a steel toecap. SRC is not a 2022 marking."
  },
  {
    "q": "What is the difference between S1, S2 and S3?",
    "a": "S1 adds closed heel, antistatic properties and heel energy absorption to the basic requirements. S2 adds upper water resistance; S3 adds penetration resistance and a cleated outsole. In 2011 these classes also include FO. In 2022 FO is additional, and S3 uses a metal insert; S3L and S3S identify non-metal inserts."
  },
  {
    "q": "What is the difference between ASTM M and EN M?",
    "a": "In ASTM F2413 markings, M identifies male footwear designation; F identifies female footwear designation. ASTM metatarsal protection uses Mt. Under EN ISO 20345, M means metatarsal protection. Include the standard header to resolve this ambiguity."
  },
  {
    "q": "What does EH stand for on work boots?",
    "a": "EH identifies secondary electric shock resistance under ASTM test conditions. It is not primary insulation for live-line work. Confirm the exact model report and manufacturer limits; wetness, wear and damage can reduce protection."
  },
  {
    "q": "What changed in EN ISO 20345:2022?",
    "a": "SRA, SRB and SRC were removed. Basic slip resistance is normally required without a marking, while SR identifies an optional additional test with glycerol on ceramic tile; specialised footwear may use the exception symbol Ø. The edition distinguishes metal P and non-metal PL/PS inserts, replaces WRU with WPA, makes FO additional, and adds classes S6/S7 plus SC and LG requirements."
  },
  {
    "q": "Does decoding a label verify certification?",
    "a": "No. Match the product model and edition to manufacturer documentation, applicable declarations of conformity, certificates and test reports. Confirm workplace hazards and local requirements with your safety team. An ASTM reference alone is not an independent certification or a notified-body identifier."
  },
  {
    "q": "Is SRC or SR better for slip resistance?",
    "a": "They belong to different editions and use different test surfaces and procedures. SRC means both 2011 tests. SR is the optional 2022 ceramic-tile/glycerol test. Neither guarantees performance on every workplace surface; do not treat them as a direct ranking."
  },
  {
    "q": "What do P, PL and PS mean?",
    "a": "In 2022, P means a metal insert tested with a 4.5 mm nail; PL means a non-metal insert tested with a 4.5 mm nail; PS means a non-metal insert tested with a 3.0 mm nail. In 2011, P did not make that material distinction. The codes do not establish equivalence to ASTM PR."
  }
]

export default function CompliancePage() {
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  }

  const appJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Safety Footwear Compliance Label Decoder',
    applicationCategory: 'BusinessApplication',
    description:
      'Free online decoder for ASTM F2413 and EN ISO 20345 safety-footwear certification codes.',
    operatingSystem: 'Web',
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
        name: 'Compliance Checker',
        item: `${getSiteUrl()}/tools/compliance-checker`,
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(appJsonLd) }}
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
          <li className="text-foreground font-medium">Compliance Checker</li>
        </ol>
      </nav>

      {/* Hero */}
      <header data-tool-hero className={[theme.hero, "container mx-auto px-4 lg:px-6 pt-14 pb-10 max-w-4xl text-center"].join(" ")}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary mb-4">
          Compliance Tool · Free
        </p>
        <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl leading-[1.05] tracking-tight mb-5">
          Safety Footwear Label Decoder
        </h1>
        <p className="text-muted-foreground text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
          Paste a marking with its standard and year to interpret supported codes, identify edition conflicts and flag unknown text.
        </p>
      </header>

      <div className="container mx-auto px-4 lg:px-6 max-w-5xl">
        <ComplianceDecoder />
      </div>

      {/* Standards comparison */}
      <section data-tool-reading className="container mx-auto mt-8 max-w-5xl px-4 lg:px-6 text-sm text-muted-foreground">
        <h2 className="font-semibold text-foreground">Reference coverage and sources</h2>
        <p className="mt-2">References checked 3 October 2026. Coverage: EN ISO 20345:2011 and :2022; selected ASTM F2413-18/-24 markings. Unsupported editions and unfamiliar tokens remain unresolved. No certification or regulatory approval is verified.</p>
        <ul className="mt-3 space-y-2">
          <li><a className="text-primary underline" href="https://www.uvex-safety.co.uk/en/knowledge/safety-standards/safety-footwear/guide-to-en-iso-203452022/">uvex: EN ISO 20345:2022 changes and class tables</a></li>
          <li><a className="text-primary underline" href="https://store.astm.org/f2413-24.html">ASTM: F2413-24 active edition and scope</a></li>
          <li><a className="text-primary underline" href="https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.136">OSHA: workplace foot protection requirements</a></li>
        </ul>
      </section>
      <section data-tool-reading className="container mx-auto px-4 lg:px-6 max-w-5xl mt-20">
        <div className="flex items-center gap-3 mb-3">
          <FileCheck className="h-6 w-6 text-primary" />
          <h2 className="font-serif text-3xl sm:text-4xl leading-tight">
            ASTM F2413 vs EN ISO 20345
          </h2>
        </div>
        <p className="text-muted-foreground text-base leading-[1.85] mb-6">
          These standards use different tests and marking systems. Select footwear against your workplace hazards and local requirements, and verify evidence for the exact model. A decoded label is not a certification check.
        </p>
        <div className="overflow-x-auto rounded-xl border bg-background shadow-sm">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-muted/60">
                <th className="border-b px-4 py-3 text-left font-semibold">Property</th>
                <th className="border-b px-4 py-3 text-left font-semibold">EN ISO 20345 (EU)</th>
                <th className="border-b px-4 py-3 text-left font-semibold">ASTM F2413 (US)</th>
              </tr>
            </thead>
            <tbody>
              {STANDARD_COMPARISON.map((row) => (
                <tr
                  key={row.property}
                  className="border-b last:border-b-0 odd:bg-background even:bg-muted/20"
                >
                  <td className="px-4 py-3 font-medium">{row.property}</td>
                  <td className="px-4 py-3 text-foreground/85">{row.en}</td>
                  <td className="px-4 py-3 text-foreground/85">{row.astm}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* EN classes */}
      <section data-tool-reading className="container mx-auto px-4 lg:px-6 max-w-5xl mt-20">
        <div className="flex items-center gap-3 mb-3">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <h2 className="font-serif text-3xl sm:text-4xl leading-tight">
            EN ISO 20345 protection classes
          </h2>
        </div>
        <p className="text-muted-foreground text-base leading-[1.85] mb-6">
          The summaries below use the 2022 edition. The decoder distinguishes 2011 where the printed header provides that year. Class codes do not specify toecap material; additional codes describe further requirements.
        </p>
        <div className="overflow-x-auto rounded-xl border bg-background shadow-sm">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-muted/60">
                <th className="border-b px-4 py-3 text-left font-semibold w-24">Class</th>
                <th className="border-b px-4 py-3 text-left font-semibold">Name</th>
                <th className="border-b px-4 py-3 text-left font-semibold">What it covers</th>
              </tr>
            </thead>
            <tbody>
              {EN_CLASSES.map((c) => (
                <tr
                  key={c.code}
                  className="border-b last:border-b-0 odd:bg-background even:bg-muted/20"
                >
                  <td className="px-4 py-3 font-mono font-semibold text-primary">{c.code}</td>
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3 text-muted-foreground leading-relaxed">
                    {c.description}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* EN additional codes */}
      <section data-tool-reading className="container mx-auto px-4 lg:px-6 max-w-5xl mt-16">
        <h2 className="font-serif text-3xl sm:text-4xl leading-tight mb-3">
          EN additional requirement codes
        </h2>
        <p className="text-muted-foreground text-base leading-[1.85] mb-6">
          Add-on codes extend the baseline class — for example, an S3 HRO CI boot adds
          heat-resistant outsole (HRO) and cold insulation (CI) to the S3 specification.
        </p>
        <div className="overflow-x-auto rounded-xl border bg-background shadow-sm">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-muted/60">
                <th className="border-b px-4 py-3 text-left font-semibold w-20">Code</th>
                <th className="border-b px-4 py-3 text-left font-semibold">Meaning</th>
                <th className="border-b px-4 py-3 text-left font-semibold">Test requirement</th>
              </tr>
            </thead>
            <tbody>
              {EN_ADDONS.map((c) => (
                <tr
                  key={c.code}
                  className="border-b last:border-b-0 odd:bg-background even:bg-muted/20"
                >
                  <td className="px-4 py-3 font-mono font-semibold text-primary">{c.code}</td>
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3 text-muted-foreground leading-relaxed">
                    {c.description}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Slip resistance */}
      <section data-tool-reading className="container mx-auto px-4 lg:px-6 max-w-4xl mt-16">
        <h2 className="font-serif text-3xl sm:text-4xl leading-tight mb-3">
          Slip resistance codes
        </h2>
        <p className="text-muted-foreground text-base leading-[1.85] mb-6">
          EN ISO 20345:2022 removed SRA/SRB/SRC. Basic slip testing normally has no marking; SR is an optional additional test on ceramic tile with glycerol. Specialised footwear that cannot be tested may carry Ø. Legacy codes belong to the 2011 system.
        </p>
        <div className="overflow-x-auto rounded-xl border bg-background shadow-sm">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-muted/60">
                <th className="border-b px-4 py-3 text-left font-semibold w-20">Code</th>
                <th className="border-b px-4 py-3 text-left font-semibold">Surface / contaminant</th>
              </tr>
            </thead>
            <tbody>
              {SLIP_CODES.map((c) => (
                <tr
                  key={c.code}
                  className="border-b last:border-b-0 odd:bg-background even:bg-muted/20"
                >
                  <td className="px-4 py-3 font-mono font-semibold text-primary">{c.code}</td>
                  <td className="px-4 py-3 text-muted-foreground leading-relaxed">
                    <span className="font-medium text-foreground">{c.name}.</span>{' '}
                    {c.description}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ASTM codes */}
      <section data-tool-reading className="container mx-auto px-4 lg:px-6 max-w-5xl mt-16">
        <h2 className="font-serif text-3xl sm:text-4xl leading-tight mb-3">
          ASTM F2413 section codes
        </h2>
        <p className="text-muted-foreground text-base leading-[1.85] mb-6">
          Read the printed ASTM F2413 edition alongside footwear designation (M or F), impact/compression markings and additional protections. ASTM lists F2413-24 as active and F2413-18 as historical. Legacy /75 formats should be checked against the model report and stated edition.
        </p>
        <div className="overflow-x-auto rounded-xl border bg-background shadow-sm">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-muted/60">
                <th className="border-b px-4 py-3 text-left font-semibold w-28">Code</th>
                <th className="border-b px-4 py-3 text-left font-semibold">Meaning</th>
                <th className="border-b px-4 py-3 text-left font-semibold">Detail</th>
              </tr>
            </thead>
            <tbody>
              {ASTM_CODES.map((c) => (
                <tr
                  key={c.code}
                  className="border-b last:border-b-0 odd:bg-background even:bg-muted/20"
                >
                  <td className="px-4 py-3 font-mono font-semibold text-primary">{c.code}</td>
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3 text-muted-foreground leading-relaxed">
                    {c.description}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* How to read a label */}
      <section data-tool-reading className="container mx-auto px-4 lg:px-6 max-w-4xl mt-20">
        <div className="flex items-center gap-3 mb-3">
          <BookOpen className="h-6 w-6 text-primary" />
          <h2 className="font-serif text-3xl sm:text-4xl leading-tight">
            How to read a safety boot label
          </h2>
        </div>
        <p className="text-muted-foreground text-base leading-[1.85] mb-8">
          Every certified safety boot carries its marking on the tongue, sidewall or
          inside-collar label. Here is how to read both formats at a glance.
        </p>

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="rounded-xl border bg-background p-6 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-3">
              EN ISO 20345 example
            </p>
            <pre className="font-mono text-sm bg-muted/40 rounded-lg p-4 mb-4 whitespace-pre-wrap leading-relaxed">
{`EN ISO 20345:2022
S3 SR HRO CI
Size 43`}
            </pre>
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              <li><span className="font-mono font-semibold text-foreground">S3</span> — water-resistant upper, cleated outsole, penetration-resistant midsole</li>
              <li><span className="font-mono font-semibold text-foreground">SR</span> - optional ceramic tile and glycerol slip test</li>
              <li><span className="font-mono font-semibold text-foreground">HRO</span> - hot-contact outsole resistance under the test conditions</li>
              <li><span className="font-mono font-semibold text-foreground">CI</span> - cold insulation of the sole complex</li>
            </ul>
          </div>

          <div className="rounded-xl border bg-background p-6 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-3">
              ASTM F2413 example
            </p>
            <pre className="font-mono text-sm bg-muted/40 rounded-lg p-4 mb-4 whitespace-pre-wrap leading-relaxed">
{`ASTM F2413-18
M I/75 C/75
EH PR
Size 10 W`}
            </pre>
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              <li><span className="font-mono font-semibold text-foreground">M</span> — men&apos;s sizing</li>
              <li><span className="font-mono font-semibold text-foreground">I/75 C/75</span> — 75 ft·lb impact + 2,500 lbf compression</li>
              <li><span className="font-mono font-semibold text-foreground">EH</span> — electrical hazard (18 kV secondary insulation)</li>
              <li><span className="font-mono font-semibold text-foreground">PR</span> — puncture-resistant midsole</li>
            </ul>
          </div>
        </div>
      </section>

      <section data-tool-reading className="container mx-auto px-4 lg:px-6 max-w-5xl mt-20">
        <ToolRelatedGuidesSection
          title="Guides for checking standards before buying"
          description="Use these pages to connect decoded labels with construction footwear requirements, OSHA context, and RFQ-level supplier checks."
          guides={TOOL_RELATED_GUIDES['compliance-checker']}
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

      {/* Related */}
      <section data-tool-reading className="container mx-auto px-4 lg:px-6 max-w-4xl mt-20">
        <div className="rounded-2xl border bg-gradient-to-br from-primary/5 via-background to-background p-8 sm:p-10 shadow-sm">
          <div className="flex items-start gap-4">
            <Info className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
            <div>
              <h2 className="font-serif text-2xl leading-tight mb-3">
                Need help sourcing compliant PPE?
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-5">
                Plan quantities with the{' '}
                <Link href="/tools/ppe-calculator" className="text-primary font-semibold hover:underline">
                  PPE Budget Calculator
                </Link>
                , find your fit with the{' '}
                <Link href="/tools/size-guide" className="text-primary font-semibold hover:underline">
                  Safety Boot Size Guide
                </Link>
                , or prepare a tailored sourcing request with the{' '}
                <Link href="/tools/ai-quote" className="text-primary font-semibold hover:underline">
                  AI Quote Assistant
                </Link>
                .
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  href={QUOTE_HREF}
                  data-source={QUOTE_SOURCE}
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:shadow-md transition-all"
                >
                  Get a quote
                </Link>
                <Link
                  href="/products"
                  className="inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-muted transition-colors"
                >
                  Browse safety footwear
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
