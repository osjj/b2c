import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Calculator, Check, ChevronRight, HardHat, Ruler, ScanLine, Sparkles } from 'lucide-react'
import styles from './tools.module.css'
import { getSiteUrl } from '@/lib/site-url'
import { TOOLS_HUB_RELATED_GUIDES } from '@/lib/tool-related-guides'

// Refresh the shared company identity along with this otherwise static page.
export const revalidate = 3600

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

interface ToolEntry {
  href: string
  title: string
  description: string
}

const TOOLS: ToolEntry[] = [
  {
    href: '/tools/ai-quote',
    title: 'AI Quote Generator',
    description:
      'Describe your workforce, job site and hazards — get a customised PPE procurement quote in seconds, exportable to PDF and Excel.',
  },
  {
    href: '/tools/ppe-calculator',
    title: 'PPE Quantity Calculator',
    description:
      'Estimate monthly PPE consumption by role, headcount and shift rotation. Plan replenishment with confidence.',
  },
  {
    href: '/tools/size-guide',
    title: 'Safety Boot Size Guide',
    description:
      'Convert between US / EU / UK / China footwear sizing and match width fittings to your fleet.',
  },
  {
    href: '/tools/compliance-checker',
    title: 'Compliance Label Decoder',
    description:
      'Paste a footwear label with its standard and year to interpret supported markings and flag conflicts or unknown codes.',
  },
  {
    href: '/tools/hard-hat-class-decoder',
    title: 'Hard Hat Class Decoder',
    description:
      'Decode Type I vs Type II and Class G, Class E, and Class C before adding head protection to an RFQ.',
  },
]

const TASK_DETAILS: Record<string, { input: string; output: string; action: string }> = {
  '/tools/ai-quote': { input: 'Workforce, job site and hazards', output: 'PPE quote draft with PDF and Excel export', action: 'Open quote generator' },
  '/tools/ppe-calculator': { input: 'Workforce, usage rates and unit prices', output: 'Consumption, whole-unit purchase plan and CSV', action: 'Plan PPE quantities' },
  '/tools/size-guide': { input: 'Shoe size or foot measurements', output: 'Regional size equivalents and fit guidance', action: 'Convert boot sizes' },
  '/tools/compliance-checker': { input: 'Footwear label, standard and edition year', output: 'Code meanings, edition conflicts and unknown tokens', action: 'Decode footwear labels' },
  '/tools/hard-hat-class-decoder': { input: 'Hard hat type and electrical class', output: 'Impact coverage, class limits and buyer checks', action: 'Compare hard hat classes' },
}

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

  const taskOrder = [TOOLS[1], TOOLS[3], TOOLS[2], TOOLS[4], TOOLS[0]]
  const displayTitles = ['Quantity & budget planner', 'Footwear label decoder', 'Boot size converter', 'Hard hat class decoder', 'AI quote generator']
  const disciplines = ['Planning / CSV', 'Standards / Footwear', 'Sizing / Footwear', 'Standards / Head protection', 'Quoting / AI-assisted']
  const icons = [Calculator, ScanLine, Ruler, HardHat, Sparkles]

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }} />
      <div className={styles.workbench}>
        <div className={styles.shell}>
          <nav aria-label="Breadcrumb" className={styles.breadcrumb}>
            <Link href="/">Home</Link><ChevronRight size={12} aria-hidden="true" /><span aria-current="page">Tools</span>
          </nav>
          <header className={styles.intro} data-tool-hero>
            <div>
              <p className={styles.kicker}><span aria-hidden="true" />Procurement workbench</p>
              <h1>Know what<br /> to <span>order.</span></h1>
              <p className={styles.introCopy}>Work out quantities. Check the specification. Get the fit right.<br className={styles.desktopBreak} /> Practical PPE tools for the decisions before an order.</p>
              <a href="#tool-directory-title" className={styles.explore}>Find your tool<ArrowRight size={17} aria-hidden="true" /></a>
            </div>
            <div className={styles.introNote}>
              <div className={styles.deskGraphic} aria-hidden="true">
                <div className={styles.graphicSheet}><span>ORDER / PLANNING</span><div className={styles.graphicBars}><i /><i /><i /><i /><i /></div><div className={styles.graphicRule} /><div className={styles.graphicRule} /></div>
                <span className={styles.graphicCheck}><Check size={24} /></span>
                <span className={styles.graphicRuler}><Ruler size={28} /></span>
                <span className={styles.graphicScan}><ScanLine size={24} /></span>
              </div>
              <span className={styles.smallLabel}>Built for the buying desk</span>
              <p>From workforce numbers<br />to a clearer supplier brief.</p>
              <span className={styles.access}>Free to use <span aria-hidden="true">/</span> No signup</span>
            </div>
          </header>

          <section aria-labelledby="tool-directory-title" className={styles.directory}>
            <div className={styles.sectionLine}>
              <h2 id="tool-directory-title">Choose your task</h2>
              <span className={styles.smallLabel}>01—05 <span aria-hidden="true">/</span> Tools</span>
            </div>
            <div className={styles.toolGrid}>
              {taskOrder.map((tool, index) => {
                const Icon = icons[index]
                return (
                <Link key={tool.href} href={tool.href} data-tool-entry={index + 1} className={[styles.tool, index === 0 ? styles.featured : ''].join(' ')}>
                  <div className={styles.toolMeta}><span className={styles.number}>{String(index + 1).padStart(2, '0')}</span><span>{disciplines[index]}</span><ArrowRight size={19} aria-hidden="true" /></div>
                  <span className={styles.toolIcon}><Icon size={24} strokeWidth={1.7} aria-hidden="true" /></span>
                  <h3>{displayTitles[index]}</h3>
                  <dl className={styles.toolDetails}>
                    <div><dt>Bring</dt><dd>{TASK_DETAILS[tool.href].input}</dd></div>
                    <div><dt>Get</dt><dd>{TASK_DETAILS[tool.href].output}</dd></div>
                  </dl>
                  {index === 0 && <svg className={styles.planDrawing} viewBox="0 0 144 90" fill="none" aria-hidden="true"><path d="M5 80H140M5 10V80" stroke="currentColor" strokeWidth="1" /><path d="M22 79V51H39V79M56 79V30H73V79M90 79V9H107V79" stroke="currentColor" strokeWidth="1.5" /><path d="M31 43L64 21L100 1" stroke="currentColor" strokeDasharray="3 4" /><path d="M118 79V48H134V79" fill="currentColor" /></svg>}
                  <span className={styles.toolAction}>{TASK_DETAILS[tool.href].action}<ArrowRight size={16} aria-hidden="true" /></span>
                </Link>
              )})}
            </div>
            <p className={styles.directoryNote}>A planning starting point. Confirm fit, site requirements and product evidence before purchasing.</p>
          </section>

          <section className={styles.guides} aria-labelledby="buying-guides-title" data-tool-reading>
            <div className={styles.guideIntro}>
              <span className={styles.smallLabel}>Field notes <span aria-hidden="true">/</span> Buying guides</span>
              <h2 id="buying-guides-title">The detail behind<br className={styles.desktopBreak} /> the decision.</h2>
              <p>Practical reading for specifications, fit and the questions to put to a supplier.</p>
              <span className={styles.guideCount}>06 <span>guides for your next order</span></span>
            </div>
            <div className={styles.guideList}>
              {TOOLS_HUB_RELATED_GUIDES.map((guide, index) => (
                <Link href={guide.href} key={guide.href} className={styles.guide}>
                  <span className={styles.guideNumber}>{String(index + 1).padStart(2, '0')}</span>
                  <div><span className={styles.guideEyebrow}>{guide.eyebrow}</span><h3>{guide.title}</h3><p>{guide.description}</p></div>
                  <ArrowRight size={18} aria-hidden="true" />
                </Link>
              ))}
            </div>
          </section>

          <aside className={styles.request} aria-labelledby="tool-request-title" data-tool-reading>
            <div><span className={styles.smallLabel}>Help shape the workbench</span><h2 id="tool-request-title">What would make your next order easier?</h2><p>Tell us which purchasing task could use a better tool.</p></div>
            <Link href="/contact?topic=tools">Suggest a tool<ArrowRight size={18} aria-hidden="true" /></Link>
          </aside>
          <div className={styles.colophon} aria-hidden="true"><span>LAIFAPPE / PROCUREMENT RESOURCES</span><span>END OF DIRECTORY — 05 TOOLS</span></div>
        </div>
      </div>
    </>
  )
}
