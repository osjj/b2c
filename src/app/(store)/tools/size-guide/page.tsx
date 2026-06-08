import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronRight, Home, Ruler, Footprints, Info, Clock } from 'lucide-react'
import { ToolRelatedGuidesSection } from '@/components/store/tool-related-guides-section'
import { getSiteUrl } from '@/lib/site-url'
import { TOOL_RELATED_GUIDES } from '@/lib/tool-related-guides'
import { SizeConverter } from './size-converter-client'
import { SIZE_CHART, WIDTH_CHART } from './data'

const TITLE = 'Safety Boot Size Guide — US, EU, UK, CN & JP Conversion Chart'
const DESCRIPTION =
  'Free safety boot size converter and fitting guide. Convert between US men\'s, US women\'s, UK, EU, China and Japan sizing, plus ASTM and EN width fittings. Includes how-to-measure instructions.'
const SEO_TITLE = 'Safety Boot Size Conversion Chart - US, EU, UK, CN & JP Guide'

const QUOTE_HREF = '/quote?source=tool-size-guide'

export const metadata: Metadata = {
  title: SEO_TITLE,
  description: DESCRIPTION,
  keywords: [
    TITLE,
    'safety boot size chart',
    'work boot size conversion',
    'US to EU shoe size',
    'UK to US boot size',
    'EN ISO 20345 sizing',
    'ASTM F2413 sizing',
    'how to measure feet for safety boots',
    'safety footwear width fitting',
    '2E vs 4E boot width',
    'safety boot size guide',
  ],
  alternates: { canonical: `${getSiteUrl()}/tools/size-guide` },
  openGraph: {
    title: SEO_TITLE,
    description: DESCRIPTION,
    url: `${getSiteUrl()}/tools/size-guide`,
    type: 'website',
    images: [
      {
        url: '/og-image-main.webp',
        width: 1200,
        height: 630,
        alt: 'Safety Boot Size Guide — US, EU, UK, CN & JP conversion chart',
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

const MEASURE_STEPS = [
  {
    title: 'Measure at the end of the day',
    body: 'Feet swell throughout a shift — measuring in the evening or after several hours on your feet captures the maximum size and prevents cramped boots.',
  },
  {
    title: 'Wear your work socks',
    body: 'Thick thermal or cushioned safety socks add 2–3 mm of length. Always measure with the socks you plan to wear with the boots.',
  },
  {
    title: 'Stand on a sheet of paper',
    body: 'Place a sheet against a wall. Stand with your heel touching the wall and your weight evenly distributed — sitting under-measures by 3–5 mm.',
  },
  {
    title: 'Mark the longest toe',
    body: 'With a pencil held vertically, mark the paper at the tip of your longest toe. Do both feet — one foot is usually 2–4 mm longer.',
  },
  {
    title: 'Measure to the wall',
    body: 'Measure the distance from the wall edge to your mark in millimetres. Always buy for the longer foot.',
  },
  {
    title: 'Add 10 mm of toe room',
    body: 'Safety boots with steel or composite toe caps need 10 mm (about 1 cm) of room in front of your longest toe so the toe cap never presses on your nails when you walk downhill.',
  },
]

const FAQ = [
  {
    q: 'How do I convert US shoe size to EU for safety boots?',
    a: "US men's 10 = EU 44, US men's 9 = EU 42.5, US men's 8 = EU 41. For exact conversions across half sizes and women's sizing, use the size chart above — it is based on foot length in millimetres, the definitive measurement.",
  },
  {
    q: 'Are safety boots sized differently from regular shoes?',
    a: 'Yes. Safety boots with steel or composite toe caps often feel 3–5 mm shorter than the equivalent casual shoe because the rigid cap reduces toe-box flex. Most safety-footwear brands recommend ordering your true measured size and allowing 10 mm of toe clearance.',
  },
  {
    q: 'What width fitting should I order?',
    a: 'Order "D / Medium" (US) or "F" (EU) as a default — most brands assume this fit. Order "2E", "4E" or "G / H" (EU wide) if you have a high instep, wear thick socks, or experience numbness in standard boots.',
  },
  {
    q: 'Do I order my street-shoe size in steel-toe boots?',
    a: 'Generally yes, but with two adjustments: (1) account for work-sock thickness by rounding up if between sizes, and (2) confirm 10 mm of toe-to-cap clearance after lacing.',
  },
  {
    q: 'How do I know if my safety boots fit correctly?',
    a: 'Correct fit: the heel does not slip when walking, you can wiggle your toes freely, the toe cap never touches your toes (including when walking downhill), and the laces do not need to be overtightened to hold the heel. Break-in discomfort is normal but should resolve within the first 40 hours of wear.',
  },
  {
    q: 'Can I return safety boots that do not fit?',
    a: 'Policies vary. Most safety-footwear retailers accept returns within 30 days if the boots have only been worn indoors on clean surfaces. Check the return policy before opening the box outdoors or on site.',
  },
]

export default function SizeGuidePage() {
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  }

  const howToJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: 'How to measure your feet for safety boots',
    description:
      'Step-by-step guide to accurately measuring foot length and fitting safety boots with steel or composite toe caps.',
    totalTime: 'PT5M',
    step: MEASURE_STEPS.map((s, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      name: s.title,
      text: s.body,
    })),
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
        name: 'Size Guide',
        item: `${getSiteUrl()}/tools/size-guide`,
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToJsonLd) }}
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
          <li className="text-foreground font-medium">Size Guide</li>
        </ol>
      </nav>

      {/* Hero */}
      <header className="container mx-auto px-4 lg:px-6 pt-14 pb-10 max-w-4xl text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary mb-4">
          Reference Tool · Free
        </p>
        <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl leading-[1.05] tracking-tight mb-5">
          Safety Boot Size Guide
        </h1>
        <p className="text-muted-foreground text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
          Convert safety footwear sizing across US, UK, EU, China and Japan — plus width
          fittings for ASTM F2413 and EN ISO 20345 boots.
        </p>
      </header>

      <div className="container mx-auto px-4 lg:px-6 max-w-5xl">
        <SizeConverter />
      </div>

      {/* How to measure */}
      <section className="container mx-auto px-4 lg:px-6 max-w-4xl mt-20">
        <div className="flex items-center gap-3 mb-3">
          <Ruler className="h-6 w-6 text-primary" />
          <h2 className="font-serif text-3xl sm:text-4xl leading-tight">
            How to measure your feet
          </h2>
        </div>
        <p className="text-muted-foreground text-base leading-[1.85] mb-8">
          Foot length in millimetres is the most accurate measurement for safety footwear.
          Take 5 minutes to do it properly and you will avoid the 40% of online boot
          returns caused by size mismatch.
        </p>

        <ol className="space-y-4">
          {MEASURE_STEPS.map((step, idx) => (
            <li
              key={step.title}
              className="flex gap-4 rounded-xl border bg-background p-5 shadow-sm"
            >
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold text-sm">
                {idx + 1}
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Full conversion chart */}
      <section className="container mx-auto px-4 lg:px-6 max-w-6xl mt-20">
        <h2 className="font-serif text-3xl sm:text-4xl leading-tight mb-3">
          US to EU safety boot size conversion chart
        </h2>
        <p className="text-muted-foreground text-base leading-relaxed mb-6">
          Cross-reference table for safety-footwear sizing across the major systems.
          Sizes are based on Brannock / ISO 9407 foot-length measurement.
        </p>
        <div className="overflow-x-auto rounded-xl border bg-background shadow-sm">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-muted/60">
                <th className="border-b px-4 py-3 text-left font-semibold">Foot length</th>
                <th className="border-b px-4 py-3 text-left font-semibold">US Men&apos;s</th>
                <th className="border-b px-4 py-3 text-left font-semibold">US Women&apos;s</th>
                <th className="border-b px-4 py-3 text-left font-semibold">UK</th>
                <th className="border-b px-4 py-3 text-left font-semibold">EU</th>
                <th className="border-b px-4 py-3 text-left font-semibold">China</th>
                <th className="border-b px-4 py-3 text-left font-semibold">Japan</th>
              </tr>
            </thead>
            <tbody>
              {SIZE_CHART.map((row) => (
                <tr
                  key={row.mm}
                  className="border-b last:border-b-0 odd:bg-background even:bg-muted/20"
                >
                  <td className="px-4 py-3 font-medium">{row.mm} mm</td>
                  <td className="px-4 py-3 text-foreground/85">{row.usMen}</td>
                  <td className="px-4 py-3 text-foreground/85">{row.usWomen}</td>
                  <td className="px-4 py-3 text-foreground/85">{row.uk}</td>
                  <td className="px-4 py-3 text-foreground/85">{row.eu}</td>
                  <td className="px-4 py-3 text-foreground/85">{row.cn}</td>
                  <td className="px-4 py-3 text-foreground/85">{row.jp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Width chart */}
      <section className="container mx-auto px-4 lg:px-6 max-w-5xl mt-20">
        <div className="flex items-center gap-3 mb-3">
          <Footprints className="h-6 w-6 text-primary" />
          <h2 className="font-serif text-3xl sm:text-4xl leading-tight">
            Width fittings explained
          </h2>
        </div>
        <p className="text-muted-foreground text-base leading-relaxed mb-6">
          Safety footwear width is measured across the ball of the foot. US systems use
          letter codes (D, E, 2E, 4E), European systems use F/G/H/K. Both ASTM F2413 and
          EN ISO 20345 permit these variants.
        </p>
        <div className="overflow-x-auto rounded-xl border bg-background shadow-sm">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-muted/60">
                <th className="border-b px-4 py-3 text-left font-semibold">Width</th>
                <th className="border-b px-4 py-3 text-left font-semibold">US label</th>
                <th className="border-b px-4 py-3 text-left font-semibold">EU label</th>
                <th className="border-b px-4 py-3 text-left font-semibold">Typical use</th>
              </tr>
            </thead>
            <tbody>
              {WIDTH_CHART.map((row) => (
                <tr
                  key={row.code}
                  className="border-b last:border-b-0 odd:bg-background even:bg-muted/20"
                >
                  <td className="px-4 py-3 font-medium">{row.code}</td>
                  <td className="px-4 py-3 text-foreground/85">{row.usLabel}</td>
                  <td className="px-4 py-3 text-foreground/85">{row.euLabel}</td>
                  <td className="px-4 py-3 text-foreground/85">{row.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Break-in tips */}
      <section className="container mx-auto px-4 lg:px-6 max-w-4xl mt-20">
        <h2 className="font-serif text-3xl sm:text-4xl leading-tight mb-6">
          Break-in and on-site fit check
        </h2>
        <div className="grid gap-5 sm:grid-cols-3">
          <div className="rounded-xl border bg-background p-5 shadow-sm">
            <Clock className="h-5 w-5 text-primary mb-2" />
            <h3 className="font-semibold text-foreground mb-1">First 40 hours</h3>
            <p className="text-sm text-muted-foreground">
              Expect light pressure at the heel and instep — this resolves as the leather
              conforms. Sharp pain or toe-cap contact means wrong size.
            </p>
          </div>
          <div className="rounded-xl border bg-background p-5 shadow-sm">
            <Ruler className="h-5 w-5 text-primary mb-2" />
            <h3 className="font-semibold text-foreground mb-1">Toe test</h3>
            <p className="text-sm text-muted-foreground">
              Kick a flat wall lightly. Your longest toe should never feel the toe cap —
              if it does, the boot is too short regardless of labelled size.
            </p>
          </div>
          <div className="rounded-xl border bg-background p-5 shadow-sm">
            <Footprints className="h-5 w-5 text-primary mb-2" />
            <h3 className="font-semibold text-foreground mb-1">Heel lock test</h3>
            <p className="text-sm text-muted-foreground">
              With boots laced, walk on tiptoes. A properly fitted boot keeps your heel
              anchored within 2–3 mm of the insole.
            </p>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 lg:px-6 max-w-5xl mt-20">
        <ToolRelatedGuidesSection
          title="Footwear guides to use after sizing"
          description="Once size and width are clear, use these buying guides to confirm standards, role needs, and bulk order details before requesting safety footwear pricing."
          guides={TOOL_RELATED_GUIDES['size-guide']}
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

      {/* Related */}
      <section className="container mx-auto px-4 lg:px-6 max-w-4xl mt-20">
        <div className="rounded-2xl border bg-gradient-to-br from-primary/5 via-background to-background p-8 sm:p-10 shadow-sm">
          <div className="flex items-start gap-4">
            <Info className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
            <div>
              <h2 className="font-serif text-2xl leading-tight mb-3">
                Ready to choose your boots?
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-5">
                Once you know your size, send the footwear range to our sourcing team, or
                learn what the certification labels mean with the{' '}
                <Link href="/tools/compliance-checker" className="text-primary font-semibold hover:underline">
                  Compliance Label Decoder
                </Link>
                , or read the full{' '}
                <Link href="/blog/construction-safety-footwear-guide" className="text-primary font-semibold hover:underline">
                  construction safety footwear guide
                </Link>
                {' '}covering ASTM F2413 and EN ISO 20345.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  href={QUOTE_HREF}
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:shadow-md transition-all"
                >
                  Request footwear quote
                </Link>
                <Link
                  href="/categories/foot-protection"
                  className="inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-muted transition-colors"
                >
                  Shop safety boots
                </Link>
                <Link
                  href="/tools/compliance-checker"
                  className="inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-muted transition-colors"
                >
                  Decode a label
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
