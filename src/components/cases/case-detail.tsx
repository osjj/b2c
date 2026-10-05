import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, ArrowUpRight, FileText, MapPin } from 'lucide-react'
import type { CaseView } from '@/lib/cases/types'
import { isCasePrivateImage } from '@/lib/cases/private-image-path'
import { caseNumber, formatCaseDate } from './case-format'
import { CaseInquiry } from './case-listing'
import styles from './cases.module.css'

export function CaseDetail({ caseStudy, preview = false }: { caseStudy: CaseView; preview?: boolean }) {
  const c = caseStudy
  return (
    <div className={styles.page}>
      {preview && <div className={styles.previewBanner}><FileText size={16} aria-hidden="true" /><span>Internal preview · This view does not publish the case.</span></div>}
      <header className={styles.detailHero}>
        <div className={styles.wrap}>
          <nav aria-label="Breadcrumb" className={styles.breadcrumb}><Link href="/">Home</Link><span aria-hidden="true">/</span><Link href="/cases">Procurement cases</Link><span aria-hidden="true">/</span><span>Case file</span></nav>
          <div className={styles.detailHeading}>
            <div><div className={styles.eyebrow}><span className={styles.redDot} /> PROCUREMENT CASE / {c.industry || 'PROJECT RECORD'}</div><h1>{c.title}</h1><p className={styles.detailSummary}>{c.summary}</p></div>
            <dl className={styles.projectFacts}>{c.country && <div><dt>Destination</dt><dd><MapPin size={14} aria-hidden="true" />{c.country}</dd></div>}{c.industry && <div><dt>Industry</dt><dd>{c.industry}</dd></div>}{c.cooperationDate && <div><dt>Cooperation date</dt><dd>{formatCaseDate(c.cooperationDate)}</dd></div>}<div><dt>Procurement scope</dt><dd>{c.procurement.length} product {c.procurement.length === 1 ? 'line' : 'lines'}</dd></div></dl>
          </div>
          {c.coverImage && <figure className={styles.detailCover}><Image src={c.coverImage} alt={c.coverAlt} fill priority unoptimized={isCasePrivateImage(c.coverImage)} sizes="(max-width: 1200px) 100vw, 1200px" className={styles.detailImage} /></figure>}
        </div>
      </header>
      <div className={`${styles.wrap} ${styles.detailLayout}`}>
        <aside className={styles.contents}>
          <nav aria-label="Case contents"><span className={styles.eyebrow}>IN THIS CASE</span><ol>{c.buyerProfile && <li><a href="#buyer-context">Buyer context</a></li>}{c.procurement.length > 0 && <li><a href="#procurement-scope">Procurement scope</a></li>}{c.customization && <li><a href="#customization">Customization</a></li>}{c.sections.map((section, index) => <li key={`toc-${index}`}><a href={`#narrative-${index + 1}`}>{section.title}</a></li>)}{c.timeline.length > 0 && <li><a href="#project-timeline">Project timeline</a></li>}{c.gallery.length > 0 && <li><a href="#project-gallery">Project images</a></li>}</ol></nav>
          <Link href="/cases" className={styles.backLink}><ArrowLeft size={15} aria-hidden="true" /> All procurement cases</Link>
        </aside>
        <article className={styles.article} aria-label="Procurement case details">
          {c.buyerProfile && <section id="buyer-context" className={styles.articleSection}><SectionTitle label="BUYER CONTEXT" title="The starting point" /><PlainText value={c.buyerProfile} /></section>}
          {c.procurement.length > 0 && <section id="procurement-scope" className={styles.articleSection}><SectionTitle label="ORDER DETAILS" title="Procurement scope" /><div className={styles.tableWrap}><table className={styles.procurementTable}><caption className={styles.srOnly}>Products and quantities for this procurement case</caption><thead><tr><th scope="col">Product</th><th scope="col">Quantity</th><th scope="col">Unit</th></tr></thead><tbody>{c.procurement.map((item, index) => <tr key={`${item.name}-${index}`}><th scope="row"><span className={styles.rowIndex}>{caseNumber(index)}</span><span>{item.name}{item.note && <small>{item.note}</small>}</span></th><td>{item.quantity.toLocaleString('en-GB')}</td><td>{item.unit}</td></tr>)}</tbody></table></div><p className={styles.tableNote}>Quantities and units refer to this order only.</p></section>}
          {c.customization && <section id="customization" className={`${styles.articleSection} ${styles.customizationSection}`}><SectionTitle label="ORDER-SPECIFIC REQUIREMENTS" title="Customization details" /><PlainText value={c.customization} /></section>}
          {c.sections.map((section, index) => <section id={`narrative-${index + 1}`} key={`section-${index}`} className={styles.articleSection}><SectionTitle label={`PROJECT NOTES / ${caseNumber(index)}`} title={section.title} /><PlainText value={section.body} /></section>)}
          {c.timeline.length > 0 && <section id="project-timeline" className={styles.articleSection}><SectionTitle label="DOCUMENTED MILESTONES" title="Project timeline" /><ol className={styles.timeline}>{c.timeline.map((item, index) => <li key={`milestone-${index}`}><div className={styles.timelineDate}>{item.date ? <time dateTime={item.date}>{formatCaseDate(item.date)}</time> : <span>Step {caseNumber(index)}</span>}</div><div className={styles.timelineContent}><h3>{item.label}</h3>{item.description && <PlainText value={item.description} />}</div></li>)}</ol></section>}
          {c.gallery.length > 0 && <section id="project-gallery" className={styles.articleSection}><SectionTitle label="PROJECT RECORD" title="A closer look" /><div className={styles.gallery}>{c.gallery.map((item, index) => <figure key={`image-${index}`}><div className={styles.galleryImage}><Image src={item.url} alt={item.alt} fill unoptimized={isCasePrivateImage(item.url)} sizes="(max-width: 700px) 100vw, 50vw" className={styles.detailImage} /></div>{item.caption && <figcaption><span>{caseNumber(index)}</span>{item.caption}</figcaption>}</figure>)}</div></section>}
          {c.relatedLinks.length > 0 && <section className={styles.articleSection} aria-labelledby="related-case-links"><SectionTitle label="CONTINUE EXPLORING" title="Related products & resources" id="related-case-links" /><ul className={styles.relatedLinks}>{c.relatedLinks.map((item, index) => <li key={`${item.href}-${index}`}><Link href={item.href}>{item.label}<ArrowUpRight size={18} aria-hidden="true" /></Link></li>)}</ul></section>}
          <div className={styles.articleEnd}><span>END OF CASE FILE</span><Link href="/cases">Back to the archive <ArrowUpRight size={17} aria-hidden="true" /></Link></div>
        </article>
      </div>
      <CaseInquiry />
    </div>
  )
}

function SectionTitle({ label, title, id }: { label: string; title: string; id?: string }) {
  return <div className={styles.articleHeading}><span className={styles.eyebrow}>{label}</span><h2 id={id}>{title}</h2></div>
}

function PlainText({ value }: { value: string }) {
  return <div className={styles.prose}>{value.split(/\n\s*\n/).filter(Boolean).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>
}
