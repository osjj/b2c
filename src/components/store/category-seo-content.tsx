import Link from 'next/link'
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  FolderTree,
  HelpCircle,
  Layers3,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { extractCatalogSignals, getCategorySeoContent } from '@/lib/category-seo-content'
import styles from './category-seo-content.module.css'

type CategoryLink = {
  name: string
  href: string
}

type ProductLink = {
  name: string
  href: string
}

type TopicClusterItem = {
  title: string
  description: string
  href: string
}

type CategorySeoContentProps = {
  category: {
    name: string
    slug: string
    description?: string | null
  }
  parent?: {
    name: string
    slug: string
  } | null
  productCount: number
  childCount: number
  relatedLinks: CategoryLink[]
  popularProductLinks: ProductLink[]
  productNames: string[]
}

export function CategorySeoContent({
  category,
  parent,
  productCount,
  childCount,
  relatedLinks,
  popularProductLinks,
  productNames,
}: CategorySeoContentProps) {
  const content = getCategorySeoContent(category, parent)
  const catalogSignals = extractCatalogSignals(productNames)
  const subcategoryClusterItems: TopicClusterItem[] = relatedLinks.slice(0, 4).map((item) => ({
    title: parent
      ? `Explore ${item.name} in ${parent.name}`
      : `Explore ${item.name} under ${category.name}`,
    description: parent
      ? `Compare ${item.name.toLowerCase()} with other options in the ${parent.name.toLowerCase()} range.`
      : `Compare ${item.name.toLowerCase()} for your team's tasks and equipment requirements.`,
    href: item.href,
  }))
  const productClusterItems: TopicClusterItem[] = popularProductLinks.slice(0, 4).map((item) => ({
    title: `View ${item.name}`,
    description: `Open the product page to review specifications, images, and use details for this item.`,
    href: item.href,
  }))
  const architectureClusterItems: TopicClusterItem[] = parent
    ? [
        {
          title: `Return to ${parent.name}`,
          description: `Compare more ${parent.name.toLowerCase()} options for the same workplace or PPE kit.`,
          href: `/categories/${parent.slug}`,
        },
      ]
    : []
  const topicClusterGroups = [
    {
      key: 'subcategories',
      title: parent ? 'Related categories' : 'Subcategories',
      icon: FolderTree,
      items: subcategoryClusterItems,
    },
    {
      key: 'products',
      title: 'Product examples',
      icon: Sparkles,
      items: productClusterItems,
    },
    {
      key: 'architecture',
      title: 'Parent category',
      icon: Layers3,
      items: architectureClusterItems,
    },
  ].filter((group) => group.items.length > 0)

  return (
    <div className={styles.guide}>
      <section className={styles.lead}>
        <div>
          <p className={styles.eyebrow}>{content.eyebrow}</p>
          <h2>{content.leadTitle}</h2>
          <div className={styles.intro}>
            {content.intro.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </div>

        <aside className={styles.facts}>
          <div className={styles.fact}>
            <ShieldCheck aria-hidden="true" />
            <div>
              <p className={styles.factLabel}>Products in this range</p>
              <p>
                {productCount} product{productCount === 1 ? '' : 's'} currently listed in this category
              </p>
            </div>
          </div>

          <div className={styles.fact}>
            <Layers3 aria-hidden="true" />
            <div>
              <p className={styles.factLabel}>Compare product types</p>
              <p>
                {childCount > 0
                  ? `${childCount} product families to explore`
                  : 'Review product details or send us your requirements'}
              </p>
            </div>
          </div>

          <p className={styles.factNote}>
            {parent ? (
              <>
                Compare more options in{' '}
                <Link href={`/categories/${parent.slug}`}>{parent.name}</Link>{' '}
                when selecting equipment for the same team or task.
              </>
            ) : (
              'Compare the relevant product family, then review individual models for the fit, materials, and details your task requires.'
            )}
          </p>
        </aside>
      </section>

      <div className={styles.comparison}>
        <section className={styles.panel}>
          <h2>{content.guideTitle}</h2>
          <ol className={styles.steps}>
            {content.guideSteps.map((step, index) => (
              <li key={step}>
                <span aria-hidden="true">{index + 1}</span>
                <p>{step}</p>
              </li>
            ))}
          </ol>
        </section>

        <div className={styles.comparisonSide}>
          <section className={styles.panel}>
            <h2>{content.applicationsTitle}</h2>
            <ul className={styles.tags}>
              {content.applications.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className={styles.panel}>
            <h2>{content.differentiatorsTitle}</h2>
            <ul className={styles.checklist}>
              {content.differentiators.map((item) => (
                <li key={item}>
                  <CheckCircle2 aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>

      {catalogSignals.length > 0 && (
        <section className={styles.panel}>
          <h2>{category.name} product highlights</h2>
          <p>
            Explore the product types and named features shown here. Review each model&apos;s details when comparing options for your workplace.
          </p>
          <ul className={styles.tags}>
            {catalogSignals.map((signal) => (
              <li key={signal}>{signal}</li>
            ))}
          </ul>
        </section>
      )}

      {topicClusterGroups.length > 0 && (
        <section className={styles.panel}>
          <h2>Related products and categories</h2>
          <p>Compare related product families and individual models before preparing your enquiry.</p>

          <div className={styles.related}>
            {topicClusterGroups.map((group) => {
              const Icon = group.icon

              return (
                <div key={group.key}>
                  <h3>
                    <Icon aria-hidden="true" />
                    {group.title}
                  </h3>
                  <ul>
                    {group.items.map((item) => (
                      <li key={item.href}>
                        <Link href={item.href}>
                          <div>
                            <strong>{item.title}</strong>
                            <p>{item.description}</p>
                          </div>
                          <ArrowRight aria-hidden="true" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        </section>
      )}

      <section className={styles.panel}>
        <h2 className={styles.faqTitle}>
          <HelpCircle aria-hidden="true" />
          {content.faqTitle}
        </h2>
        <div className={styles.faq}>
          {content.faqs.map((item) => (
            <details key={item.question}>
              <summary>
                {item.question}
                <ChevronDown aria-hidden="true" />
              </summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  )
}
