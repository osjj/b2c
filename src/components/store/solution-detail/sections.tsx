import { Fragment, type ReactNode } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import type { ProductImage, Category } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { ProductCard } from '@/components/store/product-card'
import { BodyLinkMapSection } from './body-link-map-section'
import { isBodyLinkedList } from '@/lib/body-link-map'
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
      const isInternal = href.startsWith('/')
      if (isInternal) {
        return (
          <Link key={key} href={href} className={INLINE_CONTENT_LINK_CLASS}>
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
    <div className="space-y-10">
      {sections.map((section) => {
        const products = productsBySectionKey[section.key] || []
        return (
          <div key={section.key} className="space-y-6">
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
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
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
    <div className="grid gap-4 md:grid-cols-2">
      {cards.map((card) => {
        const preset = getTaskScenePreset(card.scene)
        return (
          <article key={card.scene} className="overflow-hidden rounded-xl border bg-card">
            <div className="relative aspect-video w-full">
              <Image
                src={card.image || preset.image}
                alt={card.title || preset.title}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
              />
            </div>
            <div className="space-y-3 p-4">
              <h3 className="text-base font-semibold text-foreground">{card.title || preset.title}</h3>
              {card.description && (
                <p className="text-sm text-muted-foreground">{card.description}</p>
              )}
              <ul className="space-y-2 border-t pt-3 text-sm text-foreground">
                {card.items.map((item, index) => (
                  <li key={`${card.scene}-${index}`} className="flex items-start gap-2">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary" />
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
    <section id={section.key} className="scroll-mt-24 space-y-4">
      {section.title && (
        <h2 className="text-xl md:text-2xl font-semibold text-foreground">
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
        <div className="space-y-3">
          {data?.intro && (
            <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
              {renderRichText(data.intro, `${section.key}-intro`)}
            </p>
          )}
          {bullets.length > 0 && (
            <ul className="space-y-2 text-sm text-foreground">
              {bullets.map((bullet, index) => (
                <li key={`${bullet}-${index}`} className="flex items-start gap-2">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary" />
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
        <div className="space-y-3">
          {paragraphs.map((paragraph, index) => (
            <p key={`${section.key}-p-${index}`} className="text-sm md:text-base text-muted-foreground leading-relaxed">
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
        <ul className="space-y-3">
          {items.map((item, index) => (
            <li key={`${section.key}-i-${index}`} className="flex items-start gap-3">
              <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary" />
              <div className="space-y-1">
                {item.title && (
                  <p className="text-sm font-medium text-foreground">
                    {renderRichText(item.title, `${section.key}-title-${index}`)}
                  </p>
                )}
                {item.text && (
                  <p className="text-sm text-muted-foreground leading-relaxed">
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
        <div className="overflow-x-auto border rounded-lg">
          <table className="min-w-full text-sm">
            {headers.length > 0 && (
              <thead className="bg-muted/50">
                <tr>
                  {headers.map((header, index) => (
                    <th key={`${section.key}-h-${index}`} className="px-4 py-2 text-left font-semibold text-foreground">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={`${section.key}-r-${rowIndex}`} className="border-t">
                  {row.map((cell, cellIndex) => (
                    <td key={`${section.key}-c-${rowIndex}-${cellIndex}`} className="px-4 py-2 text-muted-foreground">
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
        <div className="grid gap-4 md:grid-cols-2">
          {groups.map((group, index) => {
            const items = Array.isArray(group.items) ? group.items : []
            if (items.length === 0) return null
            return (
            <div key={`${section.key}-g-${index}`} className="rounded-xl border bg-card p-4 space-y-3">
              <h3 className="text-base font-semibold text-foreground">
                {renderRichText(group.title, `${section.key}-g-title-${index}`)}
              </h3>
              {group.description && (
                <p className="text-sm text-muted-foreground">
                  {renderRichText(group.description, `${section.key}-g-description-${index}`)}
                </p>
              )}
              <ul className="space-y-2 border-t pt-3 text-sm text-foreground">
                {items.map((item, itemIndex) => (
                  <li key={`${section.key}-g-${index}-${itemIndex}`} className="flex items-start gap-2">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary" />
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
        <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-foreground">
          {data?.text ? renderRichText(data.text, `${section.key}-callout`) : null}
        </div>
      )
    }
    case 'cta': {
      const data = section.data as SectionCtaData
      const ctaTitle = typeof data?.title === 'string' ? data.title.trim() : ''
      const sectionTitle = typeof section.title === 'string' ? section.title.trim() : ''
      return common(
        <div className="rounded-2xl border bg-foreground text-background px-6 py-6">
          {ctaTitle && ctaTitle !== sectionTitle && (
            <h3 className="text-lg font-semibold">
              {renderRichText(ctaTitle, `${section.key}-cta-title`)}
            </h3>
          )}
          {data?.text && (
            <p className="mt-2 text-sm text-background/80">
              {renderRichText(data.text, `${section.key}-cta-text`)}
            </p>
          )}
          <div className="mt-4 flex flex-wrap items-stretch gap-3">
            {data?.primaryLabel && data?.primaryHref && (
              <Button asChild className="h-auto min-h-10 whitespace-normal text-center">
                <Link href={normalizePublicCtaHref(data.primaryHref)}>{data.primaryLabel}</Link>
              </Button>
            )}
            {data?.secondaryLabel && data?.secondaryHref && (
              <Button variant="secondary" asChild className="h-auto min-h-10 whitespace-normal text-center">
                <Link href={normalizePublicCtaHref(data.secondaryHref)}>{data.secondaryLabel}</Link>
              </Button>
            )}
          </div>
        </div>
      )
    }
    case 'faq': {
      const data = section.data as SectionFaqData
      const items = Array.isArray(data?.items) ? data.items : []
      return common(
        <div className="space-y-4">
          {items.map((item, index) => (
            <div key={`${section.key}-f-${index}`} className="rounded-lg border bg-background p-4">
              <h3 className="text-sm font-semibold text-foreground">
                {renderRichText(item.q, `${section.key}-q-${index}`)}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
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
