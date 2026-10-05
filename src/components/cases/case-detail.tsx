import type { ReactNode } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, ArrowUpRight, FileText, MapPin } from 'lucide-react'
import type { CaseView } from '@/lib/cases/types'
import { caseImagesAt, caseSectionPlacement, caseUnplacedImages } from '@/lib/cases/layout'
import { isCasePrivateImage } from '@/lib/cases/private-image-path'
import { caseNumber, formatCaseDate } from './case-format'
import { CaseInquiry } from './case-listing'
import styles from './cases.module.css'

export function CaseDetail({ caseStudy, preview = false }: { caseStudy: CaseView; preview?: boolean }) {
  const c = caseStudy
  const openingIndex = c.coverImage ? c.gallery.findIndex((image) => image.url === c.coverImage) : -1
  const openingImage = c.gallery[openingIndex]
  const imagesAt = (placement: string) => caseImagesAt(c, placement).filter(({ index }) => index !== openingIndex)
  const remainingImages = caseUnplacedImages(c).filter(({ index }) => index !== openingIndex)
  const narrative = c.sections.map((section, index) => ({ section, placement: caseSectionPlacement(section, index) }))
  const hasFacts = Boolean(c.country || c.industry || c.cooperationDate || c.procurement.length)
  const chapters = [
    ...(c.buyerProfile.trim() ? [{ placement: 'buyer-context', title: 'The procurement brief' }] : []),
    ...narrative.slice(0, 1).map(({ section, placement }) => ({ placement, title: section.title })),
    ...(c.procurement.length ? [{ placement: 'procurement-scope', title: 'Products & quantities' }] : []),
    ...(c.customization.trim() ? [{ placement: 'customization', title: 'Customization requirements' }] : []),
    ...narrative.slice(1).map(({ section, placement }) => ({ placement, title: section.title })),
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
    <div className={`${styles.page} ${styles.detailPage}`}>
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
            </div>
            {c.coverImage && (
              <figure data-case-placement="opening-record" data-case-image-index={openingIndex >= 0 ? openingIndex : undefined} className={styles.openingRecord}>
                <div className={styles.recordTopline}>
                  <span>{openingIndex >= 0 ? `RECORD / ${caseNumber(openingIndex)}` : 'PROJECT PHOTOGRAPH'}</span>
                  {isCasePrivateImage(c.coverImage) && <a href={c.coverImage} target="_blank" rel="noopener noreferrer" className={styles.originalLink}>View original <ArrowUpRight size={14} aria-hidden="true" /><span className={styles.srOnly}>: {openingImage?.alt || c.coverAlt} (opens in a new tab)</span></a>}
                </div>
                <div className={styles.openingImage}>
                  <Image src={c.coverImage} alt={openingImage?.alt || c.coverAlt} fill priority unoptimized={isCasePrivateImage(c.coverImage)} sizes="(max-width: 700px) calc(100vw - 44px), (max-width: 1000px) 46vw, 560px" className={styles.detailImage} />
                </div>
                {openingImage?.caption && <figcaption><span className={styles.recordCaptionMark} aria-hidden="true">{caseNumber(openingIndex)}</span><span>{openingImage.caption}</span></figcaption>}
              </figure>
            )}
            <div className={styles.detailSynopsis}>
              <p className={styles.detailSummary}>{c.summary}</p>
              {chapters.length > 0 && <a href={`#${chapters[0].placement}`} className={styles.storyStart}>Explore the case <ArrowUpRight size={17} aria-hidden="true" /></a>}
            </div>
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
        <aside className={styles.contents}>
          <nav aria-label="Case contents">
            <span className={styles.eyebrow}>IN THIS CASE</span>
            <ol>{chapters.map((chapter, index) => <li key={chapter.placement}><a href={`#${chapter.placement}`}><span className={styles.contentsNumber}>{caseNumber(index)}</span><span>{chapter.title}</span></a></li>)}</ol>
          </nav>
          <Link href="/cases" className={styles.backLink}><ArrowLeft size={15} aria-hidden="true" /> All procurement cases</Link>
        </aside>
        <article className={styles.article} aria-label="Procurement case details">
          {c.buyerProfile.trim() && (
            <Chapter placement="buyer-context" number={chapterNumber('buyer-context')} label="BUYER CONTEXT" title="The procurement brief">
              <PlainText value={c.buyerProfile} />
              <InlineRecords entries={imagesAt('buyer-context')} />
            </Chapter>
          )}
          {narrative.slice(0, 1).map(narrativeChapter)}
          {c.procurement.length > 0 && (
            <Chapter placement="procurement-scope" number={chapterNumber('procurement-scope')} label="ORDER DETAILS" title="Products & quantities">
              <div className={styles.tableWrap}>
                <table className={styles.procurementTable}>
                  <caption className={styles.srOnly}>Products and quantities for this procurement case</caption>
                  <thead><tr><th scope="col">Product</th><th scope="col">Quantity</th><th scope="col">Unit</th></tr></thead>
                  <tbody>{c.procurement.map((item, index) => <tr key={`${item.name}-${index}`}><th scope="row"><span className={styles.rowIndex}>{caseNumber(index)}</span><span>{item.name}{item.note && <small>{item.note}</small>}</span></th><td>{item.quantity.toLocaleString('en-GB')}</td><td>{item.unit}</td></tr>)}</tbody>
                </table>
              </div>
              <p className={styles.tableNote}>Quantities and units refer to this order only.</p>
              <InlineRecords entries={imagesAt('procurement-scope')} />
            </Chapter>
          )}
          {c.customization.trim() && (
            <Chapter placement="customization" number={chapterNumber('customization')} label="ORDER-SPECIFIC REQUIREMENTS" title="Customization requirements">
              <div className={styles.customizationNote}><PlainText value={c.customization} /></div>
              <InlineRecords entries={imagesAt('customization')} />
            </Chapter>
          )}
          {narrative.slice(1).map(narrativeChapter)}
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
      <CaseInquiry />
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
  return (
    <div className={styles.inlineRecords} data-inline-records>
      {entries.map(({ image, index }) => (
        <figure key={`image-${index}`} data-case-image-index={index} className={styles.inlineRecord}>
          <div className={styles.recordTopline}>
            <span>RECORD / {caseNumber(index)}</span>
            {isCasePrivateImage(image.url) && <a href={image.url} target="_blank" rel="noopener noreferrer" className={styles.originalLink}>View original <ArrowUpRight size={14} aria-hidden="true" /><span className={styles.srOnly}>: {image.alt} (opens in a new tab)</span></a>}
          </div>
          <div className={styles.inlineRecordImage}>
            <Image src={image.url} alt={image.alt} fill unoptimized={isCasePrivateImage(image.url)} sizes="(max-width: 700px) calc(100vw - 44px), (max-width: 1000px) calc(100vw - 280px), 950px" className={styles.detailImage} />
          </div>
          {image.caption && <figcaption><span className={styles.recordCaptionMark} aria-hidden="true">{caseNumber(index)}</span><span>{image.caption}</span></figcaption>}
        </figure>
      ))}
    </div>
  )
}

function PlainText({ value }: { value: string }) {
  return <div className={styles.prose}>{value.split(/\n\s*\n/).filter(Boolean).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>
}
