import type { ReactNode } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowUpRight, ChevronDown, FileText, MapPin } from 'lucide-react'
import type { CaseView } from '@/lib/cases/types'
import { caseImagesAt, caseSectionPlacement, caseUnplacedImages } from '@/lib/cases/layout'
import { isCasePrivateImage } from '@/lib/cases/private-image-path'
import { caseInquiryHref, caseInquirySource } from '@/lib/cases/inquiry'
import { caseNumber, formatCaseDate } from './case-format'
import { CaseInquiry } from './case-listing'
import { CaseContents } from './case-contents'
import styles from './cases.module.css'

export function CaseDetail({ caseStudy, preview = false }: { caseStudy: CaseView; preview?: boolean }) {
  const c = caseStudy
  const openingIndex = c.coverImage ? c.gallery.findIndex((image) => image.url === c.coverImage) : -1
  const openingImage = c.gallery[openingIndex]
  const imagesAt = (placement: string) => caseImagesAt(c, placement).filter(({ index }) => index !== openingIndex)
  const remainingImages = caseUnplacedImages(c).filter(({ index }) => index !== openingIndex)
  const narrative = c.sections.map((section, index) => ({ section, placement: caseSectionPlacement(section, index) }))
  const hasFacts = Boolean(c.country || c.industry || c.cooperationDate || c.procurement.length)
  const hasOrderOverview = Boolean(c.buyerProfile.trim() || c.procurement.length || c.customization.trim())
  const chapters = [
    ...(hasOrderOverview ? [{ placement: 'order-overview', title: 'Order overview' }] : []),
    ...narrative.map(({ section, placement }) => ({ placement, title: section.title })),
    ...(c.timeline.length ? [{ placement: 'project-timeline', title: 'Project milestones' }] : []),
    ...(remainingImages.length ? [{ placement: 'additional-records', title: 'Additional records' }] : []),
  ]
  const chapterNumber = (placement: string) => caseNumber(chapters.findIndex((chapter) => chapter.placement === placement))
  const narrativeChapter = ({ section, placement }: (typeof narrative)[number]) => (
    <Chapter key={placement} placement={placement} number={chapterNumber(placement)} label="CASE NOTES" title={section.title}>
      <PlainText value={section.body} />
      <InlineRecords entries={imagesAt(placement)} />
    </Chapter>
  )

  return (
    <div className={`${styles.page} ${styles.detailPage}`} data-case-page>
      {preview && (
        <div className={styles.previewBanner}>
          <FileText size={16} aria-hidden="true" />
          <span>Internal preview · This view does not publish the case.</span>
        </div>
      )}
      <header className={styles.detailHero}>
        <div className={styles.wrap}>
          <nav aria-label="Breadcrumb" className={styles.breadcrumb}>
            <Link href="/">Home</Link><span aria-hidden="true">/</span>
            <Link href="/cases">Procurement cases</Link><span aria-hidden="true">/</span>
            <span>Case file</span>
          </nav>
          <div className={`${styles.detailHeading} ${c.coverImage ? styles.detailHeadingPhoto : styles.detailHeadingText}`}>
            <div className={styles.detailLead}>
              <div className={styles.eyebrow}><span className={styles.redDot} /> PROCUREMENT CASE / {c.industry || 'PROJECT RECORD'}</div>
              <h1>{c.title}</h1>
              <div className={styles.detailSynopsis}>
                <p className={styles.detailSummary}>{c.summary}</p>
                <div className={styles.detailActions}>
                  <Link href={caseInquiryHref(c.slug)} data-source={caseInquirySource(c.slug)} className={styles.caseQuoteLink}>Discuss a similar PPE order <ArrowUpRight size={17} aria-hidden="true" /></Link>
                  {chapters.length > 0 && <a href={`#${chapters[0].placement}`} className={styles.storyStart}>{c.procurement.length ? 'View products & quantities' : 'Explore the case'} <ArrowUpRight size={17} aria-hidden="true" /></a>}
                </div>
              </div>
            </div>
            {c.coverImage && (
              <figure data-case-placement="opening-record" data-case-image-index={openingIndex >= 0 ? openingIndex : undefined} className={styles.openingRecord}>
                <div className={styles.recordTopline}>
                  <span>{openingIndex >= 0 ? `RECORD / ${caseNumber(openingIndex)}` : 'PROJECT PHOTOGRAPH'}</span>
                  <OriginalImageLink url={c.coverImage} alt={openingImage?.alt || c.coverAlt} />
                </div>
                <div className={styles.openingImage}>
                  <Image src={c.coverImage} alt={openingImage?.alt || c.coverAlt} fill priority unoptimized={isCasePrivateImage(c.coverImage)} sizes="(max-width: 700px) calc(100vw - 44px), (max-width: 1000px) 46vw, 560px" className={styles.detailImage} />
                </div>
                {openingImage?.caption && <figcaption><span className={styles.recordCaptionMark} aria-hidden="true">{caseNumber(openingIndex)}</span><span>{openingImage.caption}</span></figcaption>}
              </figure>
            )}
          </div>
          {hasFacts && (
            <div className={styles.factsPanel} aria-label="Project at a glance">
              <dl className={styles.projectFacts}>
                {c.country && <div><dt>Destination</dt><dd><MapPin size={14} aria-hidden="true" />{c.country}</dd></div>}
                {c.industry && <div><dt>Industry</dt><dd>{c.industry}</dd></div>}
                {c.cooperationDate && <div><dt>Cooperation date</dt><dd><time dateTime={c.cooperationDate}>{formatCaseDate(c.cooperationDate)}</time></dd></div>}
                {c.procurement.length > 0 && <div><dt>Procurement scope</dt><dd>{c.procurement.length} product {c.procurement.length === 1 ? 'line' : 'lines'}</dd></div>}
              </dl>
            </div>
          )}
          <div className={styles.storyDivider}><span>THE PROCUREMENT RECORD</span><span>{c.country || 'CASE FILE'}</span></div>
        </div>
      </header>
      <div className={`${styles.wrap} ${styles.detailLayout}`}>
        <CaseContents chapters={chapters} />
        <article className={styles.article} aria-label="Procurement case details">
          {hasOrderOverview && (
            <Chapter placement="order-overview" number={chapterNumber('order-overview')} label="ORDER DETAILS" title="Order overview">
              {c.procurement.length > 0 && (
                <div id="procurement-scope" data-case-placement="procurement-scope" className={styles.orderBlock}>
                  <div className={styles.tableWrap}>
                    <table className={styles.procurementTable}>
                      <caption className={styles.srOnly}>Products and quantities for this procurement case</caption>
                      <thead><tr><th scope="col">Product</th><th scope="col">Quantity</th><th scope="col">Unit</th></tr></thead>
                      <tbody>{c.procurement.map((item, index) => <tr key={`${item.name}-${index}`}><th scope="row"><span className={styles.rowIndex}>{caseNumber(index)}</span><span>{item.href ? <Link href={item.href} className={styles.procurementLink}>{item.name}<ArrowUpRight size={13} aria-hidden="true" /></Link> : item.name}{item.note && <small>{item.note}</small>}</span></th><td>{item.quantity.toLocaleString('en-GB')}</td><td>{item.unit}</td></tr>)}</tbody>
                    </table>
                  </div>
                  <div className={styles.orderActions}>
                    <p className={styles.tableNote}>Quantities and units refer to this order only.</p>
                    <Link href={caseInquiryHref(c.slug)} data-source={caseInquirySource(c.slug)} className={styles.textLink}>Discuss your product list <ArrowUpRight size={16} aria-hidden="true" /></Link>
                  </div>
                  <InlineRecords entries={imagesAt('procurement-scope')} />
                </div>
              )}
              {c.buyerProfile.trim() && (
                <div id="buyer-context" data-case-placement="buyer-context" className={styles.orderBlock}>
                  <h3 className={styles.orderSubheading}>The procurement brief</h3>
                  <PlainText value={c.buyerProfile} />
                  <InlineRecords entries={imagesAt('buyer-context')} />
                </div>
              )}
              {c.customization.trim() && (
                <div id="customization" data-case-placement="customization" className={styles.orderBlock}>
                  <h3 className={styles.orderSubheading}>Customization requirements</h3>
                  <div className={styles.customizationNote}><PlainText value={c.customization} /></div>
                  <InlineRecords entries={imagesAt('customization')} />
                </div>
              )}
            </Chapter>
          )}
          {narrative.map(narrativeChapter)}
          {c.timeline.length > 0 && (
            <Chapter placement="project-timeline" number={chapterNumber('project-timeline')} label="DOCUMENTED MILESTONES" title="Project milestones">
              <ol className={styles.timeline}>{c.timeline.map((item, index) => <li key={`milestone-${index}`}><div className={styles.timelineDate}>{item.date ? <time dateTime={item.date}>{formatCaseDate(item.date)}</time> : <span>Step {caseNumber(index)}</span>}</div><div className={styles.timelineContent}><h3>{item.label}</h3>{item.description && <PlainText value={item.description} />}</div></li>)}</ol>
              <InlineRecords entries={imagesAt('project-timeline')} />
            </Chapter>
          )}
          {remainingImages.length > 0 && (
            <Chapter placement="additional-records" number={chapterNumber('additional-records')} label="SUPPORTING MATERIAL" title="Additional records">
              <InlineRecords entries={remainingImages} />
            </Chapter>
          )}
          {c.relatedLinks.length > 0 && (
            <section className={styles.articleSection} aria-labelledby="related-case-links">
              <div className={styles.resourceHeading}><span className={styles.eyebrow}>CONTINUE EXPLORING</span><h2 id="related-case-links">Related products & resources</h2></div>
              <ul className={styles.relatedLinks}>{c.relatedLinks.map((item, index) => <li key={`${item.href}-${index}`}><Link href={item.href}>{item.label}<ArrowUpRight size={18} aria-hidden="true" /></Link></li>)}</ul>
            </section>
          )}
          <div className={styles.articleEnd}><span>END OF CASE FILE</span><Link href="/cases">Back to the archive <ArrowUpRight size={17} aria-hidden="true" /></Link></div>
        </article>
      </div>
      <CaseInquiry caseSlug={c.slug} />
    </div>
  )
}

function Chapter({ placement, number, label, title, children }: { placement: string; number: string; label: string; title: string; children: ReactNode }) {
  return (
    <section id={placement} data-case-placement={placement} className={styles.articleSection}>
      <div className={styles.articleHeading}>
        <span className={styles.chapterNumber} aria-hidden="true">{number}</span>
        <div><span className={styles.eyebrow}>{label}</span><h2>{title}</h2></div>
      </div>
      {children}
    </section>
  )
}

function InlineRecords({ entries }: { entries: ReturnType<typeof caseImagesAt> }) {
  if (!entries.length) return null
  const photos = entries.filter(({ image }) => image.kind !== 'document')
  const documents = entries.filter(({ image }) => image.kind === 'document')
  return (
    <div className={styles.recordGroups} data-inline-records>
      {photos.length > 0 && (
        <div className={styles.inlineRecords} data-record-count={photos.length}>
          {photos.map((entry) => <RecordFigure key={`image-${entry.index}`} entry={entry} sizes={photos.length === 1 ? '(max-width: 700px) calc(100vw - 44px), (max-width: 1000px) calc(100vw - 279px), 640px' : '(max-width: 700px) calc((100vw - 60px) / 2), (max-width: 1000px) calc((100vw - 295px) / 2), 465px'} />)}
        </div>
      )}
      {documents.length > 0 && (
        <details className={styles.documentRecords} data-supporting-documents>
          <summary><span><FileText size={17} aria-hidden="true" /> Supporting documents <span className={styles.documentCount}>{documents.length}</span></span><ChevronDown size={17} aria-hidden="true" /></summary>
          <div className={styles.documentGrid}>
            {documents.map((entry) => <RecordFigure key={`image-${entry.index}`} entry={entry} sizes="(max-width: 700px) calc(100vw - 76px), (max-width: 1000px) calc((100vw - 327px) / 2), 290px" />)}
          </div>
        </details>
      )}
    </div>
  )
}

function RecordFigure({ entry: { image, index }, sizes }: { entry: ReturnType<typeof caseImagesAt>[number]; sizes: string }) {
  return (
    <figure data-case-image-index={index} className={`${styles.inlineRecord} ${image.kind === 'document' ? styles.documentRecord : ''}`}>
      <div className={styles.recordTopline}>
        <span>{image.kind === 'document' ? 'DOCUMENT' : 'RECORD'} / {caseNumber(index)}</span>
        <OriginalImageLink url={image.url} alt={image.alt} />
      </div>
      <div className={styles.inlineRecordImage}>
        <Image src={image.url} alt={image.alt} fill unoptimized={isCasePrivateImage(image.url)} sizes={sizes} className={styles.detailImage} />
      </div>
      {image.caption && <figcaption><span className={styles.recordCaptionMark} aria-hidden="true">{caseNumber(index)}</span><span>{image.caption}</span></figcaption>}
    </figure>
  )
}

function OriginalImageLink({ url, alt }: { url: string; alt: string }) {
  return <a href={url} target="_blank" rel="noopener noreferrer" className={styles.originalLink}>View full image <ArrowUpRight size={14} aria-hidden="true" /><span className={styles.srOnly}>: {alt} (opens in a new tab)</span></a>
}

function PlainText({ value }: { value: string }) {
  return <div className={styles.prose}>{value.split(/\n\s*\n/).filter(Boolean).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>
}
