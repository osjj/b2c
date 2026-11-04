import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, ChevronRight, Home, Footprints } from 'lucide-react'
import { ToolRelatedGuidesSection } from '@/components/store/tool-related-guides-section'
import { getSiteUrl } from '@/lib/site-url'
import { TOOL_RELATED_GUIDES } from '@/lib/tool-related-guides'
import theme from '../tools-theme.module.css'
import styles from './allocation.module.css'
import { AllocationWorkbench } from './allocation-workbench'

const TITLE = 'Safety Footwear Bulk Size Allocator | Excel Order Plan'
const DESCRIPTION = 'Turn safety footwear size counts into a bulk order plan. Group model, color and size, add spare pairs, adjust final quantities and export Excel or prepare an RFQ.'
const PATH = '/tools/footwear-size-allocation'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${getSiteUrl()}${PATH}` },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: `${getSiteUrl()}${PATH}`,
    type: 'website',
    images: [{ url: '/og-image-main.webp', width: 1200, height: 630, alt: 'Safety footwear bulk size allocation workbench' }],
  },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION, images: ['/og-image-main.webp'] },
}

export default function FootwearSizeAllocationPage() {
  const siteUrl = getSiteUrl()
  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${siteUrl}/` },
      { '@type': 'ListItem', position: 2, name: 'Tools', item: `${siteUrl}/tools` },
      { '@type': 'ListItem', position: 3, name: 'Footwear size allocator', item: `${siteUrl}${PATH}` },
    ],
  }

  return (
    <div className={`${theme.page} ${styles.page}`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <nav className={styles.breadcrumb} aria-label="Breadcrumb">
        <ol>
          <li><Link href="/" aria-label="Home"><Home size={14} aria-hidden="true" /></Link></li>
          <li aria-hidden="true"><ChevronRight size={12} /></li>
          <li><Link href="/tools">Tools</Link></li>
          <li aria-hidden="true"><ChevronRight size={12} /></li>
          <li aria-current="page">Footwear size allocator</li>
        </ol>
      </nav>

      <header data-tool-hero className={`${theme.hero} ${styles.hero}`}>
        <p>Bulk footwear planning · Free</p>
        <h1>Every size.<br className={styles.mobileBreak} /> One clear order.</h1>
        <p>Turn your safety footwear size counts into a purchase plan. Combine duplicates, allow for spare pairs, and review every final quantity before you order.</p>
        <div className={styles.heroFacts}>
          <span><Footprints size={15} aria-hidden="true" /> Quantities in pairs</span>
          <span>EU · UK · US · CN · JP</span>
          <span>Import processed in your browser</span>
        </div>
      </header>

      <div className={styles.container}>
        <AllocationWorkbench />
        <section data-tool-reading className={styles.reading} aria-labelledby="allocation-method-title">
          <div>
            <p className={styles.eyebrow}>Before placing an order</p>
            <h2 id="allocation-method-title">A size plan starts with confirmed fit.</h2>
            <p>This tool organizes the counts you provide. Keep sizes in the exact system used by your supplier’s model chart, and confirm fit with samples before approving a bulk order.</p>
            <Link href="/tools/size-guide">Open the safety boot size guide <ArrowRight size={16} aria-hidden="true" /></Link>
          </div>
          <ol className={styles.methodList}>
            <li><strong>Group first.</strong> Matching model, color, size system and size are combined. Different systems stay separate.</li>
            <li><strong>Round spare pairs up.</strong> At 10%, a grouped demand of 15 pairs gets 2 spare pairs, for a recommendation of 17.</li>
            <li><strong>Confirm the final order.</strong> Adjust any recommended quantity to a whole number at least equal to base demand. Excel and RFQ use that final number.</li>
          </ol>
        </section>

        <section data-tool-reading className={styles.related}>
          <ToolRelatedGuidesSection
            title="Prepare your footwear order with confidence"
            description="Review model selection, sample approval and bulk purchasing details alongside your size plan."
            guides={TOOL_RELATED_GUIDES['footwear-size-allocation']}
          />
        </section>
      </div>
    </div>
  )
}
