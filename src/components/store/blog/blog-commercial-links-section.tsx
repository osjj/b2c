import Link from 'next/link'
import {
  ArrowRight,
  Boxes,
  FileText,
  ShoppingBag,
  Tags,
  type LucideIcon,
} from 'lucide-react'
import type { BlogCommercialLink, BlogCommercialLinks } from '@/lib/blog-commercial-links'
import styles from './blog-commercial-links-section.module.css'

interface BlogCommercialLinksSectionProps {
  links: BlogCommercialLinks | undefined
}

export function BlogCommercialLinksSection({ links }: BlogCommercialLinksSectionProps) {
  if (!links) {
    return null
  }

  const showConstructionChecklist =
    links.solution.href !== '/solutions/ppe-safety-equipment-for-mining-quarrying'

  return (
    <section className={styles.section} aria-labelledby="article-related-ppe">
      <header className={styles.header}>
        <p className={styles.kicker}>Related PPE</p>
        <h2 id="article-related-ppe" className={styles.title}>Source the PPE covered in this guide</h2>
        <p className={styles.intro}>
          Move from research to a buyer shortlist with the matching solution page,
          category paths, selected PPE options, and RFQ next steps.
        </p>
      </header>

      <div className={styles.directory}>
        <div className={styles.column}>
          <div className={styles.group}>
            <SectionLabel icon={Boxes} label="Solution" />
            <ul className={styles.links}>
              <SourcingLink link={links.solution} />
            </ul>
          </div>
          {(showConstructionChecklist || Boolean(links.resources?.length)) && (
            <div className={styles.group}>
              <SectionLabel icon={FileText} label="Buyer resources" />
              <ul className={styles.links}>
                {showConstructionChecklist && (
                  <li>
                    <Link
                      data-download-asset="construction-ppe-checklist"
                      data-download-source="blog-commercial-links"
                      href="/downloads/construction-ppe-checklist.pdf"
                      className={styles.link}
                    >
                      <span>Download checklist</span>
                      <ArrowRight size={15} aria-hidden="true" />
                    </Link>
                  </li>
                )}
                {links.resources?.map((resource) => (
                  <SourcingLink key={`${resource.href}-${resource.label}`} link={resource} />
                ))}
              </ul>
            </div>
          )}
        </div>

        {links.categories.length > 0 && (
          <div className={styles.group}>
            <SectionLabel icon={Tags} label="PPE categories" />
            <ul className={styles.links}>
              {links.categories.map((category) => (
                <SourcingLink key={category.href} link={category} />
              ))}
            </ul>
          </div>
        )}

        {links.products.length > 0 && (
          <div className={`${styles.group} ${styles.shortlist}`}>
            <SectionLabel icon={ShoppingBag} label="Buyer shortlist" />
            <ul className={styles.links}>
              {links.products.map((product) => (
                <SourcingLink key={product.href} link={product} />
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  )
}

function SourcingLink({ link }: { link: BlogCommercialLink }) {
  return (
    <li>
      <Link href={link.href} data-source={link.source} className={styles.link}>
        <span>{link.label}</span>
        <ArrowRight size={15} aria-hidden="true" />
      </Link>
    </li>
  )
}

function SectionLabel({
  icon: Icon,
  label,
}: {
  icon: LucideIcon
  label: string
}) {
  return (
    <h3 className={styles.label}>
      <Icon size={15} aria-hidden="true" />
      {label}
    </h3>
  )
}
