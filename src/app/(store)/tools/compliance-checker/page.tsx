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
import { getSiteUrl } from '@/lib/site-url'
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
  'Free decoder for safety boot labels. Instantly explain S1, S2, S3, S4, S5, SRC, HRO, ASTM F2413-18, I/75, C/75, EH, PR and every EN ISO 20345 and ASTM safety-footwear code.'
const SEO_TITLE = 'What Does S3 SRC HRO Mean? Safety Footwear Label Decoder'

const QUOTE_HREF = '/quote?source=tool-compliance-checker'

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
    q: 'What does S3 SRC HRO mean on a safety boot?',
    a: 'S3 is an EN ISO 20345 class meaning the boot has a steel toe (200 J), steel midsole penetration resistance, water-resistant upper, cleated outsole, antistatic and energy-absorbing heel. SRC means the outsole passes both ceramic-tile (SRA) and steel-floor glycerol (SRB) slip tests. HRO means the outsole is heat-resistant up to 300 °C for 60 seconds.',
  },
  {
    q: 'What is the difference between S1, S2 and S3?',
    a: 'S1 boots have steel toe, closed heel, antistatic, energy absorption and fuel oil resistance — best for dry indoor work. S2 adds water-resistant upper for wet environments. S3 adds both penetration resistance (steel midsole) and a cleated outsole — the common spec for general construction.',
  },
  {
    q: 'What is the difference between ASTM F2413 and EN ISO 20345?',
    a: 'ASTM F2413 is the US standard, EN ISO 20345 is the European standard. Both cover similar protections but use different test methods and code formats. EN uses class letters (S1–S7) with protection add-ons (HRO, CI, etc.). ASTM uses section-number markings (I/75, C/75, PR, EH, M). Some brands certify boots to both standards.',
  },
  {
    q: 'What does EH stand for on work boots?',
    a: 'EH stands for Electrical Hazard. An ASTM F2413-marked EH boot provides secondary insulation — it withstands 18,000 volts for 60 seconds at ≤ 1 mA leakage when new, dry and undamaged. It is NOT primary electrical insulation for live-line work; that requires ASTM F2412 dielectric (DI) boots.',
  },
  {
    q: 'What is the new EN ISO 20345:2022 and what changed?',
    a: 'The 2022 revision introduced two new classes — S6 (waterproof S2) and S7 (waterproof S3) — replaced SRA/SRB/SRC with a single mandatory SR slip test, added PS/PL codes for textile midsole penetration resistance, and added ladder-grip (LG) and scuff-cap (SC) markings. Existing S3 SRC boots are still legal and widely sold.',
  },
  {
    q: 'How do I know if a safety boot is properly certified?',
    a: 'Look for three things on the tongue or inside label: (1) the standard reference (EN ISO 20345:2022 or ASTM F2413-18), (2) the classification codes (e.g. S3 SRC HRO or I/75 C/75 PR), and (3) a CE mark (EU), UKCA mark (UK) or ANSI/ASTM notified body identifier. Boots without these markings are not certified safety footwear.',
  },
  {
    q: 'Is SRC or SR better for slip resistance?',
    a: 'SR (from EN ISO 20345:2022) is stricter — it uses a ceramic tile + glycerol combination, which is more aggressive than the old SRA (ceramic + soap). SRC (SRA + SRB) was the pre-2022 top slip rating and remains excellent. Boots marked SR or SRC both offer top-tier slip resistance.',
  },
  {
    q: 'What does P, PS and PL mean for puncture resistance?',
    a: 'All three certify a midsole that resists 1,100 N penetration. P uses a steel midsole tested with a 4.5 mm nail. PS uses a textile/composite midsole tested with a smaller 3 mm nail (more flexible, lighter). PL uses a textile midsole tested with the larger 4.5 mm nail — the toughest textile option.',
  },
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
    <div className="bg-ppe-bg-page min-h-screen pb-24">
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
      <header className="container mx-auto px-4 lg:px-6 pt-14 pb-10 max-w-4xl text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary mb-4">
          Compliance Tool · Free
        </p>
        <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl leading-[1.05] tracking-tight mb-5">
          Safety Footwear Label Decoder
        </h1>
        <p className="text-muted-foreground text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
          Paste any ASTM F2413 or EN ISO 20345 marking and instantly see what every code
          means — from S1 through S7, SRC to HRO, and I/75 to EH.
        </p>
      </header>

      <div className="container mx-auto px-4 lg:px-6 max-w-5xl">
        <ComplianceDecoder />
      </div>

      {/* Standards comparison */}
      <section className="container mx-auto px-4 lg:px-6 max-w-5xl mt-20">
        <div className="flex items-center gap-3 mb-3">
          <FileCheck className="h-6 w-6 text-primary" />
          <h2 className="font-serif text-3xl sm:text-4xl leading-tight">
            ASTM F2413 vs EN ISO 20345
          </h2>
        </div>
        <p className="text-muted-foreground text-base leading-[1.85] mb-6">
          The two dominant safety-footwear standards cover similar protections with
          different test methods and code formats. Boots certified to both standards are
          acceptable in almost every global workplace.
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
      <section className="container mx-auto px-4 lg:px-6 max-w-5xl mt-20">
        <div className="flex items-center gap-3 mb-3">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <h2 className="font-serif text-3xl sm:text-4xl leading-tight">
            EN ISO 20345 protection classes
          </h2>
        </div>
        <p className="text-muted-foreground text-base leading-[1.85] mb-6">
          Every EN-certified safety boot is marked with one class code (SB, S1, S1P, S1PS,
          S2, S3, S3S, S4, S5, S6 or S7). The class defines the baseline protection — add-on
          codes like HRO, CI, M extend it.
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
      <section className="container mx-auto px-4 lg:px-6 max-w-5xl mt-16">
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
      <section className="container mx-auto px-4 lg:px-6 max-w-4xl mt-16">
        <h2 className="font-serif text-3xl sm:text-4xl leading-tight mb-3">
          Slip resistance codes
        </h2>
        <p className="text-muted-foreground text-base leading-[1.85] mb-6">
          EN ISO 20345:2022 replaced the legacy SRA/SRB/SRC system with a single mandatory
          SR test, but you will still see SRA, SRB and SRC on boots manufactured under the
          previous revision.
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
      <section className="container mx-auto px-4 lg:px-6 max-w-5xl mt-16">
        <h2 className="font-serif text-3xl sm:text-4xl leading-tight mb-3">
          ASTM F2413 section codes
        </h2>
        <p className="text-muted-foreground text-base leading-[1.85] mb-6">
          ASTM-certified boots carry a four-line label: standard reference (F2413-18),
          gender and ASTM class, impact/compression rating (I/75, C/75) and any additional
          protections (PR, EH, SD, CD, Mt/75, DI).
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
      <section className="container mx-auto px-4 lg:px-6 max-w-4xl mt-20">
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
{`CE 0493
EN ISO 20345:2022
S3 SRC HRO CI
Size 43`}
            </pre>
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              <li><span className="font-mono font-semibold text-foreground">S3</span> — water-resistant upper, cleated outsole, penetration-resistant midsole</li>
              <li><span className="font-mono font-semibold text-foreground">SRC</span> — passes both ceramic + steel slip tests</li>
              <li><span className="font-mono font-semibold text-foreground">HRO</span> — outsole resists 300 °C contact heat</li>
              <li><span className="font-mono font-semibold text-foreground">CI</span> — sole insulates against cold to −17 °C</li>
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

      {/* Related */}
      <section className="container mx-auto px-4 lg:px-6 max-w-4xl mt-20">
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
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:shadow-md transition-all"
                >
                  Get a quote
                </Link>
                <Link
                  href="/products"
                  className="inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-muted transition-colors"
                >
                  Browse certified PPE
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
