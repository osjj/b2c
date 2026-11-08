import Image from 'next/image'
import Link from 'next/link'
import { ArrowDown, ArrowUpRight, FileText, FolderOpen } from 'lucide-react'
import type { CaseView } from '@/lib/cases/types'
import { isCasePrivateImage } from '@/lib/cases/private-image-path'
import { caseInquiryHref, caseInquirySource } from '@/lib/cases/inquiry'
import { caseNumber, formatCaseDate } from './case-format'
import styles from './case-listing.module.css'
import sharedStyles from './cases.module.css'

export function CaseListing({ cases, preview = false }: { cases: CaseView[]; preview?: boolean }) {
  const [lead, ...archive] = cases
  const caseHref = (caseStudy: CaseView) => preview ? `/admin/cases/${caseStudy.id}/preview` : `/cases/${caseStudy.slug}`
  return (
    <div className={`${sharedStyles.theme} ${styles.page}`} data-case-preview={preview}>
      {preview && <div className={sharedStyles.previewBanner}><FileText size={16} aria-hidden="true" /><span>Internal listing preview · Unpublished content is not visible in the public archive.</span></div>}
      <section className={styles.indexHero} aria-labelledby="case-index-title">
        <div className={sharedStyles.wrap}>
          <nav className={sharedStyles.breadcrumb} aria-label="Breadcrumb">
            <Link href="/">Home</Link><span aria-hidden="true">/</span><span aria-current="page">Procurement Cases</span>
          </nav>
          <div className={styles.heroCopy}>
            <div className={sharedStyles.eyebrow}>LAIFAPPE / PROCUREMENT ARCHIVE</div>
            <h1 id="case-index-title" className={styles.indexTitle}>Real orders. The full story.</h1>
            <p className={styles.heroDescription}>A closer look at PPE procurement: what buyers needed, what they ordered, and how each project moved from samples to shipment.</p>
          </div>
          <div className={styles.archiveNav}>
            <a href="#case-archive" className={styles.textLink}>Explore procurement cases <ArrowDown size={17} aria-hidden="true" /></a>
            <div className={styles.archivePrinciples}>
              <span><b>01</b> Buyer context</span><span><b>02</b> Procurement details</span><span><b>03</b> Project process</span>
            </div>
          </div>
        </div>
      </section>
      <section className={`${sharedStyles.wrap} ${styles.archiveSection}`} id="case-archive" aria-labelledby="case-archive-title">
        <div className={styles.sectionHeading}><div><span className={sharedStyles.eyebrow}>THE CASE FILES</span><h2 id="case-archive-title">Procurement cases</h2></div><p>Documented projects. Specific details, not blanket promises.</p></div>
        {lead ? (
          <>
            <Link href={caseHref(lead)} className={styles.featuredCase}>
              <div className={styles.featuredMedia}>
                {lead.coverImage ? <Image src={lead.coverImage} alt={lead.coverAlt} fill priority unoptimized={isCasePrivateImage(lead.coverImage)} sizes="(max-width: 720px) 100vw, (max-width: 1440px) 50vw, 660px" className={isCasePrivateImage(lead.coverImage) ? styles.detailImage : styles.caseImage} /> : <DossierCover caseStudy={lead} />}
              </div>
              <div className={styles.featuredContent}>
                <span className={styles.featuredLabel}>{lead.featured ? 'Featured case' : 'Case file 01'}</span>
                <CaseMeta caseStudy={lead} /><h3>{lead.title}</h3><p>{lead.summary}</p>
                {lead.procurement.length > 0 && <ul className={styles.scopeChips}>{lead.procurement.slice(0, 4).map((item, index) => <li key={`${item.name}-${index}`}>{item.name}</li>)}</ul>}
                <div className={styles.caseCardFooter}><span className={styles.readCase}>Read the case <ArrowUpRight size={18} aria-hidden="true" /></span><span>{lead.cooperationDate ? formatCaseDate(lead.cooperationDate) : 'Procurement record'}</span></div>
              </div>
            </Link>
            {archive.length > 0 && (
              <section className={styles.caseArchive} aria-labelledby="case-list-title">
                <h3 id="case-list-title">Case archive</h3>
                <div className={styles.caseGrid}>{archive.map((caseStudy, index) => (
                  <Link href={caseHref(caseStudy)} key={caseStudy.id} className={styles.caseCard}>
                    <div className={styles.cardMedia}>{caseStudy.coverImage ? <Image src={caseStudy.coverImage} alt={caseStudy.coverAlt} fill unoptimized={isCasePrivateImage(caseStudy.coverImage)} sizes="(max-width: 720px) 100vw, (max-width: 1440px) 27vw, 352px" className={isCasePrivateImage(caseStudy.coverImage) ? styles.detailImage : styles.caseImage} /> : <DossierCover caseStudy={caseStudy} />}<span className={styles.mediaLabel}>CASE FILE {caseNumber(index + 1)}</span></div>
                    <div className={styles.cardContent}>
                      <CaseMeta caseStudy={caseStudy} />
                      <h4>{caseStudy.title}</h4>
                      <p>{caseStudy.summary}</p>
                      <div className={styles.caseCardFooter}><span>{caseStudy.cooperationDate ? formatCaseDate(caseStudy.cooperationDate) : 'Procurement record'}</span></div>
                    </div>
                    <span className={`${styles.readCase} ${styles.archiveAction}`}>Read the case <ArrowUpRight size={18} aria-hidden="true" /></span>
                  </Link>
                ))}</div>
              </section>
            )}
          </>
        ) : (
          <div className={styles.emptyArchive}>
            <div className={styles.emptyMark} aria-hidden="true"><FolderOpen size={48} strokeWidth={1} /><span>CASE ARCHIVE</span></div>
            <div className={styles.emptyContent}><span className={sharedStyles.eyebrow}>A NOTE FROM OUR TEAM</span><h3>Good case stories<br />start with the facts.</h3><p>No procurement cases have been published yet. We publish project details only after reviewing the source information and publication permissions.</p><Link href="/quote" data-source="cases-empty" className={styles.textLink}>Discuss your procurement requirements <ArrowUpRight size={18} aria-hidden="true" /></Link></div>
          </div>
        )}
      </section>
      <CaseInquiry />
    </div>
  )
}

function CaseMeta({ caseStudy }: { caseStudy: CaseView }) {
  const { country, industry } = caseStudy
  if (!country && !industry) return null
  return <div className={styles.caseMeta}>{country && <span>{country}</span>}{industry && <span>{industry}</span>}</div>
}

function DossierCover({ caseStudy }: { caseStudy: CaseView }) {
  return <div className={styles.dossierCover}><span className={styles.dossierLabel}>LAIFAPPE / PROCUREMENT RECORD</span><div><span>{caseStudy.country}</span><strong>{caseStudy.industry}</strong></div><div className={styles.dossierBottom}><span>ORDER SCOPE<br />{caseStudy.procurement.length} product {caseStudy.procurement.length === 1 ? 'line' : 'lines'}</span><FileText size={32} strokeWidth={1} aria-hidden="true" /></div></div>
}

export function CaseInquiry({ caseSlug }: { caseSlug?: string }) {
  return <section className={sharedStyles.inquiry}><div className={sharedStyles.wrap}><div><span className={sharedStyles.eyebrow}>YOUR PROCUREMENT BRIEF</span><h2>Let’s start with<br /><em>what you need.</em></h2></div><div className={sharedStyles.inquiryAside}><p>Share your product list, quantities, destination and customization requirements. We’ll help you work through the details.</p><Link href={caseSlug ? caseInquiryHref(caseSlug) : '/quote'} data-source={caseSlug ? caseInquirySource(caseSlug) : 'procurement-cases'} className={sharedStyles.primaryLink}>Discuss a PPE order <ArrowUpRight size={19} aria-hidden="true" /></Link></div></div></section>
}
