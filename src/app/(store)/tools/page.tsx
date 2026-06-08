import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowRight,
  Calculator,
  ChevronRight,
  FileText,
  Hammer,
  HardHat,
  Ruler,
  ShieldCheck,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { ToolRelatedGuidesSection } from '@/components/store/tool-related-guides-section'
import { getSiteUrl } from '@/lib/site-url'
import { TOOLS_HUB_RELATED_GUIDES } from '@/lib/tool-related-guides'

const HUB_TITLE =
  'Free PPE Tools - Quote Generator, Quantity Calculator, Size and Hard Hat Decoders'
const HUB_DESCRIPTION =
  'Free online toolkit for PPE procurement, hazard assessment and compliance: AI quote generator, PPE quantity calculator, safety boot size converter, ASTM / EN ISO 20345 label decoder and hard hat class decoder. No signup.'

export const metadata: Metadata = {
  title: HUB_TITLE,
  description: HUB_DESCRIPTION,
  keywords: [
    'PPE tools',
    'PPE procurement tools',
    'safety equipment calculator',
    'safety boot size chart',
    'ASTM F2413 decoder',
    'EN ISO 20345 decoder',
    'hard hat class decoder',
    'ANSI Z89.1 hard hat classes',
    'free PPE calculator',
    'AI PPE quote',
  ],
  alternates: { canonical: `${getSiteUrl()}/tools` },
  openGraph: {
    title: HUB_TITLE,
    description: HUB_DESCRIPTION,
    url: `${getSiteUrl()}/tools`,
    type: 'website',
    images: [{ url: '/og-image-main.webp', width: 1200, height: 630, alt: HUB_TITLE }],
  },
  twitter: {
    card: 'summary_large_image',
    title: HUB_TITLE,
    description: HUB_DESCRIPTION,
    images: ['/og-image-main.webp'],
  },
}

type ToolCategory = 'ai' | 'calculator' | 'compliance' | 'reference'

interface ToolEntry {
  href: string
  title: string
  description: string
  category: ToolCategory
  icon: LucideIcon
  badge?: string
  tags?: string[]
}

const CATEGORY_META: Record<
  ToolCategory,
  { label: string; icon: LucideIcon; color: string; bg: string }
> = {
  ai: {
    label: 'AI',
    icon: Sparkles,
    color: 'text-accent',
    bg: 'bg-accent/15',
  },
  calculator: {
    label: 'Calculator',
    icon: Calculator,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
  },
  compliance: {
    label: 'Compliance',
    icon: ShieldCheck,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
  },
  reference: {
    label: 'Reference',
    icon: FileText,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
  },
}

const TOOLS: ToolEntry[] = [
  {
    href: '/tools/ai-quote',
    title: 'AI Quote Generator',
    description:
      'Describe your workforce, job site and hazards — get a customised PPE procurement quote in seconds, exportable to PDF and Excel.',
    category: 'ai',
    icon: Sparkles,
    badge: 'Most used',
    tags: ['AI-powered', 'PDF export', 'Excel export'],
  },
  {
    href: '/tools/ppe-calculator',
    title: 'PPE Quantity Calculator',
    description:
      'Estimate monthly PPE consumption by role, headcount and shift rotation. Plan replenishment with confidence.',
    category: 'calculator',
    icon: Calculator,
    tags: ['Monthly planning', 'By role'],
  },
  {
    href: '/tools/size-guide',
    title: 'Safety Boot Size Guide',
    description:
      'Convert between US / EU / UK / China footwear sizing and match width fittings to your fleet.',
    category: 'reference',
    icon: Ruler,
    tags: ['US / EU / UK', 'Width fitting'],
  },
  {
    href: '/tools/compliance-checker',
    title: 'Compliance Label Decoder',
    description:
      'Paste a safety footwear label and instantly see the standards (ASTM F2413, EN ISO 20345) it satisfies.',
    category: 'compliance',
    icon: ShieldCheck,
    tags: ['ASTM F2413', 'EN ISO 20345'],
  },
  {
    href: '/tools/hard-hat-class-decoder',
    title: 'Hard Hat Class Decoder',
    description:
      'Decode Type I vs Type II and Class G, Class E, and Class C before adding head protection to an RFQ.',
    category: 'reference',
    icon: HardHat,
    tags: ['ANSI Z89.1', 'Type I / II', 'Class G / E / C'],
  },
]

const STATS = [
  { value: TOOLS.length, label: 'Free tools' },
  { value: 4, label: 'Categories' },
  { value: 0, label: 'Signup required' },
]

export default function ToolsIndexPage() {
  const siteUrl = getSiteUrl()

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${siteUrl}/` },
      { '@type': 'ListItem', position: 2, name: 'Tools', item: `${siteUrl}/tools` },
    ],
  }

  const collectionJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'PPE Procurement Tools',
    description: 'Free toolkit for PPE procurement, sizing, compliance decoding and consumption planning.',
    url: `${siteUrl}/tools`,
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: TOOLS.length,
      itemListElement: TOOLS.map((tool, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        item: {
          '@type': 'WebApplication',
          name: tool.title,
          description: tool.description,
          url: `${siteUrl}${tool.href}`,
          applicationCategory: 'BusinessApplication',
          offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        },
      })),
    },
  }

  const featured = TOOLS[0]

  return (
    <>
      <style>{`
        @keyframes tools-scan {
          0%, 100% { top: 8%;  opacity: 0; }
          8%        { opacity: 0.9; }
          92%       { opacity: 0.9; }
          50%       { top: 88%; }
        }
        @keyframes tools-float {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(-7px); }
        }
        @keyframes tools-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        .tools-scan-wrap { position: relative; overflow: hidden; }
        .tools-scan-wrap::after {
          content: '';
          position: absolute;
          left: 0; right: 0; height: 2px;
          background: linear-gradient(90deg, transparent, oklch(0.65 0.2 45 / 0.85), transparent);
          animation: tools-scan 2.6s ease-in-out infinite;
        }
        .tools-float { animation: tools-float 3.2s ease-in-out infinite; }
        .tools-ring {
          position: relative;
        }
        .tools-ring::before {
          content: '';
          position: absolute;
          inset: -8px;
          border-radius: 50%;
          border: 1.5px dashed oklch(0.65 0.2 45 / 0.4);
          animation: tools-spin 14s linear infinite;
        }
        .tools-brackets::before,
        .tools-brackets::after {
          content: '';
          position: absolute;
          width: 11px; height: 11px;
          border-color: oklch(0.65 0.2 45 / 0.5);
          border-style: solid;
        }
        .tools-brackets::before { top: -1px; left: -1px; border-width: 2px 0 0 2px; border-radius: 2px 0 0 0; }
        .tools-brackets::after  { bottom: -1px; right: -1px; border-width: 0 2px 2px 0; border-radius: 0 0 2px 0; }
      `}</style>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }}
      />

      {/* ── Page wrapper — same bg as ai-quote ─────────── */}
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.14),_transparent_28%),linear-gradient(180deg,_rgba(15,23,42,0.04),_transparent_18%),var(--color-ppe-bg-page)]">

        {/* ── HERO — mirrors ai-quote hero ──────────────── */}
        <section className="relative overflow-hidden bg-gradient-to-br from-foreground via-foreground/95 to-foreground/90">
          {/* SVG grid — identical to ai-quote */}
          <div className="absolute inset-0 opacity-[0.08]">
            <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="tools-grid" width="48" height="48" patternUnits="userSpaceOnUse">
                  <path d="M 48 0 L 0 0 0 48" fill="none" stroke="white" strokeWidth="1" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#tools-grid)" />
            </svg>
          </div>
          <div className="absolute right-[-12rem] top-[-8rem] h-80 w-80 rounded-full bg-accent/20 blur-3xl" />

          <div className="container relative mx-auto px-6 py-16 lg:px-8">
            {/* breadcrumb */}
            <nav
              aria-label="Breadcrumb"
              className="mb-8 flex items-center gap-2 text-sm text-primary-foreground/60"
            >
              <Link href="/" className="transition-colors hover:text-primary-foreground">
                Home
              </Link>
              <ChevronRight className="h-4 w-4" />
              <span className="text-accent">Tools</span>
            </nav>

            <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
              {/* left — title */}
              <div>
                <Badge className="mb-5 rounded-full bg-accent/20 px-4 py-1.5 text-accent hover:bg-accent/20">
                  <Hammer className="mr-2 h-4 w-4" />
                  Free PPE Toolkit · No Signup
                </Badge>
                <h1 className="text-4xl font-semibold leading-tight text-primary-foreground md:text-6xl">
                  Every PPE tool
                  <span className="block text-accent">your team needs.</span>
                </h1>
                <p className="mt-5 max-w-xl text-lg leading-8 text-primary-foreground/72">
                  Calculators, size converters, compliance decoders and AI-powered quote generators —
                  built for procurement managers, safety officers and site supervisors.
                </p>
              </div>

              {/* right — stats panel (glassmorphism) */}
              <div className="rounded-[2rem] border border-white/10 bg-white/8 p-6 text-primary-foreground backdrop-blur-sm">
                <div className="text-sm uppercase tracking-[0.28em] text-primary-foreground/60">
                  Toolkit Summary
                </div>
                <div className="mt-5 space-y-4">
                  {STATS.map((s) => (
                    <div key={s.label} className="flex items-center gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-accent bg-accent text-accent-foreground text-sm font-semibold">
                        {s.value}
                      </div>
                      <div className="font-medium">{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── BODY ─────────────────────────────────────── */}
        <section className="container mx-auto grid gap-8 px-6 py-10 lg:px-8">

          {/* ── FEATURED CARD ─────────────────────────── */}
          {featured ? (
            <Link href={featured.href} className="group block">
              <Card className="overflow-hidden border-border/60 bg-white/95 shadow-[0_32px_90px_-50px_rgba(15,23,42,0.35)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_40px_100px_-40px_rgba(15,23,42,0.25)]">
                <div className="grid lg:grid-cols-[260px_1fr]">

                  {/* icon panel */}
                  <div className="relative flex flex-col items-center justify-center gap-5 overflow-hidden bg-secondary/35 p-8 lg:border-r lg:border-border/60">
                    <div
                      className="absolute inset-0 pointer-events-none opacity-50"
                      style={{
                        backgroundImage: 'repeating-linear-gradient(-55deg, transparent, transparent 14px, oklch(0.65 0.2 45 / 0.05) 14px, oklch(0.65 0.2 45 / 0.05) 24px)',
                      }}
                    />
                    {/* watermark */}
                    <span
                      className="pointer-events-none absolute right-4 top-3 select-none text-[5rem] font-black leading-none opacity-[0.06]"
                    >
                      01
                    </span>

                    {/* animated icon */}
                    <div className="tools-float relative z-10">
                      <div
                        className="tools-brackets tools-scan-wrap tools-ring relative flex h-24 w-24 items-center justify-center rounded-[1.5rem] bg-accent/15 border border-accent/25"
                      >
                        <featured.icon className="h-11 w-11 text-accent transition-transform duration-500 group-hover:scale-110" />
                      </div>
                    </div>

                    <Badge className="relative z-10 rounded-full bg-accent/20 text-accent hover:bg-accent/20">
                      <Sparkles className="mr-1.5 h-3 w-3" />
                      Featured
                    </Badge>
                  </div>

                  {/* info */}
                  <div className="relative flex flex-col justify-center p-8 sm:p-10">
                    <div className="absolute top-0 inset-x-0 h-[3px] rounded-t-none bg-gradient-to-r from-accent/70 to-transparent" />

                    <div className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-accent">
                      AI Tools
                    </div>
                    <CardTitle className="text-3xl sm:text-4xl font-semibold leading-tight text-foreground transition-colors group-hover:text-primary">
                      {featured.title}
                    </CardTitle>
                    <CardDescription className="mt-3 text-base leading-7 max-w-lg">
                      {featured.description}
                    </CardDescription>

                    {featured.tags ? (
                      <div className="mt-5 flex flex-wrap gap-2">
                        {featured.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full border border-border/60 bg-secondary/50 px-3 py-1 text-xs font-medium text-foreground"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : null}

                    <div className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-accent">
                      Launch tool
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1.5" />
                    </div>
                  </div>
                </div>
              </Card>
            </Link>
          ) : null}

          {/* ── ALL TOOLS GRID ─────────────────────────── */}
          <div>
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                All Tools
              </h2>
              <span className="text-xs text-muted-foreground">{TOOLS.length} available · Free</span>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              {TOOLS.map((tool) => {
                const meta = CATEGORY_META[tool.category]
                const Icon = tool.icon
                return (
                  <Link key={tool.href} href={tool.href} className="group block h-full">
                    <Card className="h-full overflow-hidden border-border/60 bg-white/95 shadow-[0_32px_90px_-50px_rgba(15,23,42,0.22)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_40px_100px_-40px_rgba(15,23,42,0.18)]">
                      <CardHeader className="border-b border-border/60 bg-secondary/35">
                        <div className="flex items-start justify-between gap-3">
                          <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${meta.bg} transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}>
                            <Icon className={`h-5 w-5 ${meta.color}`} />
                          </div>
                          <div className="flex flex-col items-end gap-1.5">
                            <Badge className={`rounded-full ${meta.bg} ${meta.color} border-0 px-3 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] hover:${meta.bg}`}>
                              {meta.label}
                            </Badge>
                            {tool.badge ? (
                              <Badge className="rounded-full bg-accent/20 text-accent border-0 hover:bg-accent/20 text-[10px]">
                                {tool.badge}
                              </Badge>
                            ) : null}
                          </div>
                        </div>
                        <CardTitle className="mt-4 text-xl font-semibold leading-snug transition-colors group-hover:text-primary">
                          {tool.title}
                        </CardTitle>
                      </CardHeader>

                      <CardContent className="space-y-4 pt-5">
                        <CardDescription className="text-sm leading-7">
                          {tool.description}
                        </CardDescription>

                        {tool.tags ? (
                          <div className="flex flex-wrap gap-2">
                            {tool.tags.map((tag) => (
                              <span
                                key={tag}
                                className="rounded-full border border-border/60 bg-secondary/50 px-3 py-1 text-xs font-medium text-muted-foreground"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        ) : null}

                        <div className="flex items-center justify-between pt-1">
                          <span className={`inline-flex items-center gap-1.5 text-sm font-semibold ${meta.color}`}>
                            Open tool
                            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                          </span>
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Free · No signup
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                )
              })}
            </div>
          </div>

          {/* ── SUGGEST A TOOL ────────────────────────── */}
          <ToolRelatedGuidesSection
            title="High-impression guides connected to these tools"
            description="These guides already receive search visibility. Use them with the tools when moving from research into quantity planning, standards checks, sizing, and quote preparation."
            guides={TOOLS_HUB_RELATED_GUIDES}
          />

          <Card className="overflow-hidden border-border/60 bg-white/95 shadow-[0_32px_90px_-50px_rgba(15,23,42,0.22)]">
            <CardContent className="flex flex-col items-center py-12 text-center sm:py-16">
              <div className="flex h-14 w-14 items-center justify-center rounded-[1.5rem] bg-accent/15 border border-accent/25">
                <Hammer className="h-6 w-6 text-accent" />
              </div>
              <h2 className="mt-6 text-2xl font-semibold sm:text-3xl">
                Need a tool that isn&apos;t here?
              </h2>
              <p className="mt-3 max-w-md text-base leading-7 text-muted-foreground">
                We&apos;re actively expanding the toolkit. Tell us what would help your team work
                faster and we&apos;ll prioritise it.
              </p>
              <Link
                href="/contact?topic=tools"
                className="mt-7 inline-flex items-center gap-2 rounded-full bg-foreground px-7 py-3 text-sm font-semibold text-primary-foreground transition-all hover:-translate-y-0.5 hover:shadow-lg"
              >
                Suggest a tool
                <ArrowRight className="h-4 w-4" />
              </Link>
            </CardContent>
          </Card>
        </section>
      </div>
    </>
  )
}
