import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, BookOpen, ChevronRight, Home, ListChecks } from 'lucide-react'
import { ToolRelatedGuidesSection } from '@/components/store/tool-related-guides-section'
import { getSiteUrl } from '@/lib/site-url'
import { TOOL_RELATED_GUIDES } from '@/lib/tool-related-guides'
import { GLOVE_BUYER_CHECKS, GLOVE_EDITIONS, GLOVE_REFERENCE_CHECKED, GLOVE_REFERENCE_SOURCES } from '@/lib/glove-marking-reference'
import theme from '../tools-theme.module.css'
import styles from './decoder.module.css'
import { GloveMarkingDecoder } from './decoder-client'

const TITLE = 'Glove Marking Decoder | EN 388 & EN 407 Codes Explained'
const DESCRIPTION = 'Read EN 388 and EN 407 glove performance markings by standard and edition. Explain individual fields, retain unresolved details and copy a complete interpretation for procurement.'
const PATH = '/tools/glove-marking-decoder'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${getSiteUrl()}${PATH}` },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: `${getSiteUrl()}${PATH}`,
    type: 'website',
    images: [{ url: '/og-image-main.webp', width: 1200, height: 630, alt: 'EN 388 and EN 407 glove marking decoder' }],
  },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION, images: ['/og-image-main.webp'] },
}

export default function GloveMarkingDecoderPage() {
  const siteUrl = getSiteUrl()
  const structuredData = [
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${siteUrl}/` },
        { '@type': 'ListItem', position: 2, name: 'Tools', item: `${siteUrl}/tools` },
        { '@type': 'ListItem', position: 3, name: 'Glove marking decoder', item: `${siteUrl}${PATH}` },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: 'Glove Marking Decoder',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Any',
      url: `${siteUrl}${PATH}`,
      description: DESCRIPTION,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    },
  ]

  return (
    <div className={`${theme.page} ${styles.page}`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <nav className={styles.breadcrumb} aria-label="Breadcrumb"><ol>
        <li><Link href="/" aria-label="Home"><Home size={14} aria-hidden="true" /></Link></li>
        <li aria-hidden="true"><ChevronRight size={12} /></li>
        <li><Link href="/tools">Tools</Link></li>
        <li aria-hidden="true"><ChevronRight size={12} /></li>
        <li aria-current="page">Glove marking decoder</li>
      </ol></nav>

      <header data-tool-hero className={`${theme.hero} ${styles.hero}`}>
        <p>Glove markings · Free reference tool</p>
        <h1>Read the code.<br className={styles.mobileBreak} /> Keep the context.</h1>
        <p>Decode EN 388 and EN 407 glove markings one position at a time. See what each field means, which edition applies, and what still needs supplier confirmation.</p>
        <div className={styles.heroFacts}><span>Mechanical &amp; thermal markings</span><span>Edition-specific interpretation</span><span>Processed in your browser</span></div>
      </header>

      <div className={styles.container}>
        <GloveMarkingDecoder />

        <section data-tool-reading className={styles.readingGrid} aria-labelledby="glove-buying-checks">
          <div className={styles.checksPanel}>
            <p className={styles.eyebrow}><ListChecks size={15} aria-hidden="true" /> Before a bulk order</p>
            <h2 id="glove-buying-checks">Take the interpretation back to the product.</h2>
            <p>A performance marking is one part of selecting gloves for a task. Use these checks with the exact model’s documents and your workplace assessment.</p>
            <ol className={styles.checkList}>{GLOVE_BUYER_CHECKS.map((check, index) => <li key={index}>{check}</li>)}</ol>
            <div className={styles.readingLinks}><Link href="/categories/hand-protection">Browse hand protection <ArrowRight size={15} aria-hidden="true" /></Link><Link href="/tools/compliance-checker">Read safety footwear labels <ArrowRight size={15} aria-hidden="true" /></Link></div>
          </div>
          <div className={styles.coveragePanel}>
            <p className={styles.eyebrow}><BookOpen size={15} aria-hidden="true" /> Reference coverage</p>
            <h2>Use the exact edition shown.</h2>
            <dl className={styles.coverageList}>
              <div><dt>EN 388</dt><dd>{GLOVE_EDITIONS.EN388.map(edition => <span key={edition.value}>{edition.label}</span>)}</dd></div>
              <div><dt>EN 407</dt><dd>{GLOVE_EDITIONS.EN407.map(edition => <span key={edition.value}>{edition.label}</span>)}</dd></div>
            </dl>
            <p>Missing years, unsupported editions and amendments remain unresolved. National adoption years are not automatically treated as equivalent editions.</p>
            <p className={styles.checkedDate}>Sources checked <time dateTime={GLOVE_REFERENCE_CHECKED}>{GLOVE_REFERENCE_CHECKED}</time></p>
          </div>
        </section>

        <section data-tool-reading className={styles.sourcePanel} aria-labelledby="glove-reference-sources">
          <div><p className={styles.eyebrow}>Read the source context</p><h2 id="glove-reference-sources">Primary reference sources</h2><p>The summaries explain selected marking fields. Confirm full requirements, conditional restrictions and pictograms in the applicable standard and product documents.</p></div>
          <ul className={styles.sourceList}>{GLOVE_REFERENCE_SOURCES.map(source => <li key={source.href}><a href={source.href} target="_blank" rel="noopener noreferrer"><span>{source.title}</span><ArrowRight size={15} aria-hidden="true" /><span className={styles.srOnly}> (opens in a new tab)</span></a><p>{source.description}</p></li>)}</ul>
        </section>

        <section data-tool-reading className={styles.related}><ToolRelatedGuidesSection title="Put the marking in its buying context" description="Use these guides to connect the label, the task and the documents you need from a supplier." guides={TOOL_RELATED_GUIDES['glove-marking-decoder']} /></section>
      </div>
    </div>
  )
}
