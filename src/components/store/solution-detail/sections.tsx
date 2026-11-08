import { Fragment, type ReactNode } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import type { ProductImage, Category } from '@prisma/client'
import { ProductCard } from '@/components/store/product-card'
import { BodyLinkMapSection } from './body-link-map-section'
import { isBodyLinkedList } from '@/lib/body-link-map'
import { normalizeInternalAttributionLink } from '@/lib/seo-links'
import { getTaskScenePreset, normalizeTaskCards } from '@/lib/task-cards'
import { normalizePublicCtaHref } from '@/lib/store-solution-categories'
import type {
  SolutionSectionItem,
  SectionHeroData,
  SectionParagraphsData,
  SectionListData,
  SectionTableData,
  SectionGroupData,
  SectionTaskCardsData,
  SectionCalloutData,
  SectionCtaData,
  SectionFaqData,
} from '@/types/solution'
import styles from './solution-detail.module.css'

interface SolutionSectionsProps {
  sections: SolutionSectionItem[]
  productsBySectionKey?: Record<string, RecommendedProduct[]>
}

type RecommendedProduct = {
  id: string
  name: string
  slug: string
  description: string | null
  price: number
  comparePrice: number | null
  stock: number
  isActive: boolean
  isFeatured: boolean
  images: ProductImage[]
  category: Category | null
  priceTiers?: Array<{
    id: string
    minQuantity: number
    maxQuantity: number | null
    price: number
    sortOrder: number
  }>
}

const INLINE_CONTENT_LINK_CLASS =
  'content-inline-link'

function renderRichText(text: string, keyPrefix: string) {
  const pattern = /(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g
  const parts = text.split(pattern).filter(Boolean)

  return parts.map((part, index) => {
    const key = `${keyPrefix}-${index}`
    const linkMatch = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part)
    if (linkMatch) {
      const [, label, href] = linkMatch
      const isInternal = href.startsWith('/') && !href.startsWith('//')
      if (isInternal) {
        const normalizedLink = normalizeInternalAttributionLink(href)
        return (
          <Link
            key={key}
            href={normalizedLink.href}
            data-source={normalizedLink.source}
            className={INLINE_CONTENT_LINK_CLASS}
          >
            {label}
          </Link>
        )
      }

      return (
        <a
          key={key}
          href={href}
          target="_blank"
          rel="noreferrer"
          className={INLINE_CONTENT_LINK_CLASS}
        >
          {label}
        </a>
      )
    }

    const boldMatch = /^\*\*([^*]+)\*\*$/.exec(part)
    if (boldMatch) {
      return (
        <strong key={key} className="font-semibold text-foreground">
          {boldMatch[1]}
        </strong>
      )
    }

    return <Fragment key={key}>{part}</Fragment>
  })
}

export function SolutionSections({ sections, productsBySectionKey = {} }: SolutionSectionsProps) {
  if (!sections || sections.length === 0) return null

  return (
    <div className={styles.sectionStack}>
      {sections.map((section) => {
        const products = productsBySectionKey[section.key] || []
        return (
          <div key={section.key} className={styles.sectionUnit}>
            <SectionRenderer section={section} />
            {products.length > 0 && <SectionProducts products={products} />}
          </div>
        )
      })}
    </div>
  )
}

function SectionProducts({ products }: { products: RecommendedProduct[] }) {
  return (
    <div className={styles.productGrid}>
      {products.map((product, index) => (
        <ProductCard key={product.id} product={product} index={index} />
      ))}
    </div>
  )
}

function TaskCardsGrid({ data }: { data: SectionTaskCardsData }) {
  const cards = (data.cards || [])
    .map((card) => ({
      ...card,
      items: (card.items || []).map((item) => item.trim()).filter(Boolean),
    }))
    .filter((card) => card.checked && card.items.length > 0)
  if (cards.length === 0) return null

  return (
    <div className={styles.subCards}>
      {cards.map((card) => {
        const preset = getTaskScenePreset(card.scene)
        return (
          <article key={card.scene} className={`${styles.subCard} ${styles.taskCard}`}>
            <div className={styles.taskImage}>
              <Image
                src={card.image || preset.image}
                alt={card.title || preset.title}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
            <div className={styles.taskBody}>
              <h3>{card.title || preset.title}</h3>
              {card.description && <p>{card.description}</p>}
              <ul className={styles.bodyList}>
                {card.items.map((item, index) => (
                  <li key={`${card.scene}-${index}`}>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </article>
        )
      })}
    </div>
  )
}

function SectionRenderer({ section }: { section: SolutionSectionItem }) {
  const common = (children: ReactNode) => (
    <section id={section.key} className={styles.section}>
      {section.title && (
        <h2 className={styles.sectionTitle}>
          {renderRichText(section.title, `${section.key}-title`)}
        </h2>
      )}
      {children}
    </section>
  )

  switch (section.type) {
    case 'hero': {
      const data = section.data as SectionHeroData
      const bullets = Array.isArray(data?.bullets) ? data.bullets : []
      return common(
        <div className={styles.bodyCopy}>
          {data?.intro && (
            <p>
              {renderRichText(data.intro, `${section.key}-intro`)}
            </p>
          )}
          {bullets.length > 0 && (
            <ul className={styles.bodyList}>
              {bullets.map((bullet, index) => (
                <li key={`${bullet}-${index}`}>
                  <span>{renderRichText(bullet, `${section.key}-bullet-${index}`)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )
    }
    case 'paragraphs': {
      const data = section.data as SectionParagraphsData
      const paragraphs = Array.isArray(data?.paragraphs) ? data.paragraphs : []
      return common(
        <div className={styles.bodyCopy}>
          {paragraphs.map((paragraph, index) => (
            <p key={`${section.key}-p-${index}`}>
              {renderRichText(paragraph, `${section.key}-p-${index}`)}
            </p>
          ))}
        </div>
      )
    }
    case 'list': {
      const data = section.data as SectionListData
      const items = Array.isArray(data?.items) ? data.items : []
      if (isBodyLinkedList(section.key, items)) {
        return common(
          <BodyLinkMapSection imageSrc={data?.image} imageAlt={data?.imageAlt} items={items} />
        )
      }
      return common(
        <ul className={styles.bodyList}>
          {items.map((item, index) => (
            <li key={`${section.key}-i-${index}`}>
              <div>
                {item.title && (
                  <p className={styles.bodyListTitle}>
                    {renderRichText(item.title, `${section.key}-title-${index}`)}
                  </p>
                )}
                {item.text && (
                  <p>
                    {renderRichText(item.text, `${section.key}-text-${index}`)}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )
    }
    case 'table': {
      const data = section.data as SectionTableData
      const headers = Array.isArray(data?.headers) ? data.headers : []
      const rows = Array.isArray(data?.rows) ? data.rows : []
      return common(
        <div className={styles.tableFrame} tabIndex={0} role="region" aria-label={section.title || 'Solution comparison table'}>
          <table>
            {headers.length > 0 && (
              <thead>
                <tr>
                  {headers.map((header, index) => (
                    <th key={`${section.key}-h-${index}`} scope="col">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={`${section.key}-r-${rowIndex}`}>
                  {row.map((cell, cellIndex) => (
                    <td key={`${section.key}-c-${rowIndex}-${cellIndex}`}>
                      {renderRichText(cell, `${section.key}-c-${rowIndex}-${cellIndex}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    }
    case 'group': {
      const data = section.data as SectionGroupData
      const groups = Array.isArray(data?.groups) ? data.groups : []
      return common(
        <div className={styles.subCards}>
          {groups.map((group, index) => {
            const items = Array.isArray(group.items) ? group.items : []
            if (items.length === 0) return null
            return (
            <div key={`${section.key}-g-${index}`} className={styles.subCard}>
              <h3>
                {renderRichText(group.title, `${section.key}-g-title-${index}`)}
              </h3>
              {group.description && (
                <p>
                  {renderRichText(group.description, `${section.key}-g-description-${index}`)}
                </p>
              )}
              <ul className={styles.bodyList}>
                {items.map((item, itemIndex) => (
                  <li key={`${section.key}-g-${index}-${itemIndex}`}>
                    <span>{renderRichText(item, `${section.key}-g-item-${index}-${itemIndex}`)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )})}
        </div>
      )
    }
    case 'taskCards': {
      const data = normalizeTaskCards(section.data as SectionTaskCardsData)
      return common(<TaskCardsGrid data={data} />)
    }
    case 'callout': {
      const data = section.data as SectionCalloutData
      return common(
        <div className={styles.callout}>
          {data?.text ? renderRichText(data.text, `${section.key}-callout`) : null}
        </div>
      )
    }
    case 'cta': {
      const data = section.data as SectionCtaData
      const ctaTitle = typeof data?.title === 'string' ? data.title.trim() : ''
      const sectionTitle = typeof section.title === 'string' ? section.title.trim() : ''
      return common(
        <div className={styles.callToAction}>
          {ctaTitle && ctaTitle !== sectionTitle && (
            <h3>
              {renderRichText(ctaTitle, `${section.key}-cta-title`)}
            </h3>
          )}
          {data?.text && (
            <p>
              {renderRichText(data.text, `${section.key}-cta-text`)}
            </p>
          )}
          <div className={styles.actions}>
            {data?.primaryLabel && data?.primaryHref && (
              <Link className={styles.button} href={normalizePublicCtaHref(data.primaryHref)}>{data.primaryLabel}</Link>
            )}
            {data?.secondaryLabel && data?.secondaryHref && (
              <Link className={styles.button} data-variant="outline" href={normalizePublicCtaHref(data.secondaryHref)}>{data.secondaryLabel}</Link>
            )}
          </div>
        </div>
      )
    }
    case 'faq': {
      const data = section.data as SectionFaqData
      const items = Array.isArray(data?.items) ? data.items : []
      return common(
        <div className={styles.faqGrid}>
          {items.map((item, index) => (
            <div key={`${section.key}-f-${index}`} className={styles.faqItem}>
              <h3>
                {renderRichText(item.q, `${section.key}-q-${index}`)}
              </h3>
              <p>
                {renderRichText(item.a, `${section.key}-a-${index}`)}
              </p>
            </div>
          ))}
        </div>
      )
    }
    default:
      return null
  }
}
