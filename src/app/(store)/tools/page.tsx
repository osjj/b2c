import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowRight,
  Calculator,
  ChevronRight,
  FileText,
  Hammer,
  Home,
  Ruler,
  ShieldCheck,
  Sparkles,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import { getSiteUrl } from '@/lib/site-url'

const HUB_TITLE = 'Free PPE Tools — Quote Generator, Quantity Calculator, Size & Label Decoder'
const HUB_DESCRIPTION =
  'Free online toolkit for PPE procurement, hazard assessment and compliance: AI quote generator, PPE quantity calculator, safety boot size converter and ASTM / EN ISO 20345 label decoder. No signup.'

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
    'free PPE calculator',
    'AI PPE quote',
  ],
  alternates: {
    canonical: `${getSiteUrl()}/tools`,
  },
  openGraph: {
    title: HUB_TITLE,
    description: HUB_DESCRIPTION,
    url: `${getSiteUrl()}/tools`,
    type: 'website',
    images: [
      {
        url: '/og-image-main.webp',
        width: 1200,
        height: 630,
        alt: 'Free PPE procurement tools — quote generator, calculator, size guide, label decoder',
      },
    ],
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
}

const CATEGORY_META: Record<
  ToolCategory,
  { label: string; description: string; icon: LucideIcon; accent: string }
> = {
  ai: {
    label: 'AI Tools',
    description: 'Natural-language assistants backed by your catalog.',
    icon: Sparkles,
    accent: 'from-primary/10 via-primary/5 to-transparent',
  },
  calculator: {
    label: 'Calculators',
    description: 'Quick numerical planning for sizing, quantity and cost.',
    icon: Calculator,
    accent: 'from-blue-500/10 via-blue-500/5 to-transparent',
  },
  compliance: {
    label: 'Compliance & Checklists',
    description: 'Auditable workflows for standards like ASTM, EN ISO, OSHA.',
    icon: ShieldCheck,
    accent: 'from-emerald-500/10 via-emerald-500/5 to-transparent',
  },
  reference: {
    label: 'Reference',
    description: 'Lookup tables, glossaries and comparison guides.',
    icon: FileText,
    accent: 'from-amber-500/10 via-amber-500/5 to-transparent',
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
  },
  {
    href: '/tools/ppe-calculator',
    title: 'PPE Quantity Calculator',
    description:
      'Estimate monthly PPE consumption by role, headcount and shift rotation. Plan replenishment with confidence.',
    category: 'calculator',
    icon: Calculator,
  },
  {
    href: '/tools/size-guide',
    title: 'Safety Boot Size Guide',
    description:
      'Convert between US / EU / UK / China footwear sizing and match width fittings to your fleet.',
    category: 'reference',
    icon: Ruler,
  },
  {
    href: '/tools/compliance-checker',
    title: 'Compliance Label Decoder',
    description:
      'Paste a safety footwear label and instantly see the standards (ASTM F2413, EN ISO 20345) it satisfies.',
    category: 'compliance',
    icon: ShieldCheck,
  },
]

export default function ToolsIndexPage() {
  const categoriesInUse = (Object.keys(CATEGORY_META) as ToolCategory[]).filter((cat) =>
    TOOLS.some((t) => t.category === cat),
  )

  const featured = TOOLS[0]
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
    description:
      'Free toolkit for PPE procurement, sizing, compliance decoding and consumption planning.',
    url: `${siteUrl}/tools`,
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: TOOLS.length,
      itemListElement: TOOLS.map(
        (tool, i) => ({
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
        }),
      ),
    },
  }

  return (
    <div className="bg-ppe-bg-page min-h-screen pb-24">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }}
      />
      <nav className="container mx-auto py-2.5 px-4 lg:px-6 text-xs border-b bg-background/50">
        <ol className="flex items-center gap-1.5 text-muted-foreground">
          <li>
            <Link href="/" className="hover:text-foreground transition-colors">
              <Home className="h-3.5 w-3.5" />
            </Link>
          </li>
          <ChevronRight className="h-3 w-3" />
          <li className="text-foreground font-medium">Tools</li>
        </ol>
      </nav>

      {/* Hero */}
      <header className="relative overflow-hidden border-b">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-background" />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)',
            backgroundSize: '32px 32px',
          }}
        />
        <div className="pointer-events-none absolute -top-32 -right-32 h-[28rem] w-[28rem] rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-24 h-[22rem] w-[22rem] rounded-full bg-accent/10 blur-3xl" />

        <div className="container relative mx-auto px-4 lg:px-6 pt-20 pb-20 max-w-5xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-background/80 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-primary backdrop-blur">
            <Wrench className="h-3.5 w-3.5" />
            Free PPE Toolkit · No signup
          </div>
          <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl xl:text-7xl leading-[1.02] tracking-tight mb-6">
            PPE procurement tools
            <br className="hidden sm:block" />
            <span className="text-primary">for smarter, safer sourcing.</span>
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
            A free suite of calculators, size converters, compliance decoders and AI-powered
            quote generators — built for procurement managers, safety officers and site
            supervisors.
          </p>

          {/* Stats strip */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3 sm:gap-5">
            <StatPill value={TOOLS.length} label="Free tools" highlight />
            <StatPill value={categoriesInUse.length} label="Categories" />
            <StatPill value={0} label="Signup required" />
          </div>
        </div>
      </header>

      {/* Featured spotlight */}
      {featured ? (
        <section className="container mx-auto px-4 lg:px-6 mt-14">
          <Link
            href={featured.href}
            className="group relative block overflow-hidden rounded-3xl border bg-background shadow-sm transition-all hover:shadow-lg"
          >
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/8 via-background to-background" />
            <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/15 blur-3xl transition-transform duration-700 group-hover:scale-110" />

            <div className="relative grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:items-center p-6 sm:p-10 lg:p-14">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-primary px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary-foreground shadow-sm">
                  <Sparkles className="h-3 w-3" />
                  Featured tool
                </div>
                <h2 className="mt-5 font-serif text-3xl sm:text-4xl lg:text-5xl leading-tight text-foreground transition-colors group-hover:text-primary">
                  {featured.title}
                </h2>
                <p className="mt-4 text-muted-foreground text-base sm:text-lg leading-relaxed max-w-xl">
                  {featured.description}
                </p>
                <div className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-primary">
                  Open tool
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1.5" />
                </div>
              </div>

              {/* Visual accent */}
              <div className="relative hidden lg:flex items-center justify-center">
                <div className="relative flex h-56 w-56 items-center justify-center rounded-3xl border bg-background/80 backdrop-blur shadow-sm">
                  <div className="absolute inset-3 rounded-2xl border border-dashed border-primary/20" />
                  <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3">
                    <featured.icon className="h-10 w-10" />
                  </div>
                  <div className="absolute -right-3 -top-3 h-14 w-14 rounded-2xl bg-accent/20 blur-xl" />
                  <div className="absolute -bottom-4 -left-4 h-16 w-16 rounded-2xl bg-primary/20 blur-xl" />
                </div>
              </div>
            </div>
          </Link>
        </section>
      ) : null}

      {/* Categories */}
      <div className="container mx-auto px-4 lg:px-6 mt-16 space-y-16">
        {categoriesInUse.map((cat) => {
          const meta = CATEGORY_META[cat]
          const tools = TOOLS.filter((t) => t.category === cat)
          if (tools.length === 0) return null

          return (
            <section key={cat}>
              <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary mb-2">
                    <meta.icon className="h-3.5 w-3.5" />
                    {meta.label}
                  </div>
                  <h2 className="font-serif text-2xl sm:text-3xl leading-tight text-foreground">
                    {meta.description}
                  </h2>
                </div>
                <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  {tools.length} tool{tools.length === 1 ? '' : 's'}
                </span>
              </div>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {tools.map((tool) => (
                  <ToolCard key={tool.href} tool={tool} accent={meta.accent} />
                ))}
              </div>
            </section>
          )
        })}
      </div>

      {/* Suggest a tool */}
      <section className="container mx-auto px-4 lg:px-6 mt-20">
        <div className="rounded-3xl border bg-gradient-to-br from-background via-background to-muted/50 p-8 sm:p-12 text-center shadow-sm">
          <Hammer className="mx-auto h-8 w-8 text-primary mb-4" />
          <h2 className="font-serif text-2xl sm:text-3xl leading-tight mb-3">
            Need a tool that isn&apos;t here?
          </h2>
          <p className="text-muted-foreground text-base leading-relaxed max-w-xl mx-auto mb-6">
            We&apos;re actively expanding the toolkit. Tell us what would help your team
            work faster and we&apos;ll prioritise it.
          </p>
          <Link
            href="/contact?topic=tools"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5"
          >
            Suggest a tool
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  )
}

function StatPill({
  value,
  label,
  highlight,
}: {
  value: number
  label: string
  highlight?: boolean
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-full border px-4 py-2 backdrop-blur ${
        highlight ? 'bg-primary/10 border-primary/20' : 'bg-background/80'
      }`}
    >
      <span
        className={`font-serif text-2xl leading-none ${
          highlight ? 'text-primary' : 'text-foreground'
        }`}
      >
        {value}
      </span>
      <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </span>
    </div>
  )
}

function ToolCard({ tool, accent }: { tool: ToolEntry; accent: string }) {
  const { href, title, description, icon: Icon, badge } = tool

  return (
    <Link href={href} className="block h-full">
      <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border bg-background p-6 sm:p-7 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-primary/30">
        <div
          className={`pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-br ${accent}`}
        />

        <div className="relative flex items-start justify-between gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border bg-background/80 text-primary shadow-sm transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
            <Icon className="h-5 w-5" />
          </div>
          {badge ? (
            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary">
              {badge}
            </span>
          ) : null}
        </div>

        <h3 className="relative mt-5 font-serif text-xl leading-tight text-foreground transition-colors group-hover:text-primary">
          {title}
        </h3>
        <p className="relative mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>

        <div className="relative mt-6 flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
            Open
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border bg-background/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Free · No signup
          </span>
        </div>
      </article>
    </Link>
  )
}
