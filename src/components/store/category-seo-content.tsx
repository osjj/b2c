import Link from 'next/link'
import {
  ArrowRight,
  CheckCircle2,
  FolderTree,
  HelpCircle,
  Layers3,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { extractCatalogSignals, getCategorySeoContent } from '@/lib/category-seo-content'

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
      ? `Follow this path to compare ${item.name.toLowerCase()} alongside the rest of the ${parent.name.toLowerCase()} range.`
      : `Use this subcategory to narrow ${category.name.toLowerCase()} intent into a more specific buying path.`,
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
          description: `Use the parent category to understand how ${category.name.toLowerCase()} fits into the broader ${parent.name.toLowerCase()} architecture.`,
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
      title: 'Popular products',
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
    <div className="space-y-10">
      <section className="grid gap-6 rounded-[28px] border border-border/60 bg-gradient-to-br from-secondary/50 via-background to-secondary/20 p-6 md:grid-cols-[minmax(0,1.6fr)_minmax(260px,0.9fr)] md:p-8">
        <div className="space-y-5">
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-primary">
              {content.eyebrow}
            </p>
            <h2 className="font-serif text-2xl md:text-3xl">
              {content.leadTitle}
            </h2>
          </div>

          <div className="space-y-4 text-sm leading-7 text-muted-foreground md:text-base">
            {content.intro.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </div>

        <aside className="grid gap-3 rounded-[24px] border border-border/60 bg-background/95 p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-semibold text-foreground">Catalog depth</p>
              <p className="text-sm text-muted-foreground">
                {productCount} product{productCount === 1 ? '' : 's'} currently listed in this category
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Layers3 className="mt-0.5 h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-semibold text-foreground">Navigation strength</p>
              <p className="text-sm text-muted-foreground">
                {childCount > 0
                  ? `${childCount} subcategory links help users refine intent`
                  : 'Focused page targeting with direct product and FAQ content'}
              </p>
            </div>
          </div>

          {parent ? (
            <div className="rounded-2xl bg-secondary/60 p-4 text-sm text-muted-foreground">
              This category sits inside{' '}
              <Link href={`/categories/${parent.slug}`} className="font-medium text-foreground underline-offset-4 hover:underline">
                {parent.name}
              </Link>{' '}
              so buyers can move back to the broader range when they want to compare nearby product families.
            </div>
          ) : (
            <div className="rounded-2xl bg-secondary/60 p-4 text-sm text-muted-foreground">
              Use the sections below to compare product types, narrow down the right subcategory, and move into more detailed product pages.
            </div>
          )}
        </aside>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-[24px] border border-border/60 bg-background p-6">
          <h2 className="mb-4 font-serif text-2xl">{content.guideTitle}</h2>
          <ol className="space-y-4">
            {content.guideSteps.map((step, index) => (
              <li key={step} className="flex gap-3">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {index + 1}
                </span>
                <p className="text-sm leading-7 text-muted-foreground">{step}</p>
              </li>
            ))}
          </ol>
        </div>

        <div className="grid gap-6">
          <div className="rounded-[24px] border border-border/60 bg-background p-6">
            <h2 className="mb-4 font-serif text-2xl">{content.applicationsTitle}</h2>
            <div className="flex flex-wrap gap-2.5">
              {content.applications.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-border/70 bg-secondary/50 px-3 py-2 text-sm text-foreground"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-[24px] border border-border/60 bg-background p-6">
            <h2 className="mb-4 font-serif text-2xl">{content.differentiatorsTitle}</h2>
            <ul className="space-y-3">
              {content.differentiators.map((item) => (
                <li key={item} className="flex gap-3 text-sm leading-7 text-muted-foreground">
                  <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-primary" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {catalogSignals.length > 0 && (
        <section className="rounded-[24px] border border-border/60 bg-background p-6">
          <h2 className="mb-3 font-serif text-2xl">{category.name} catalog signals</h2>
          <p className="mb-5 text-sm leading-7 text-muted-foreground">
            The products currently listed here share the following themes, which gives buyers a quicker summary of what shows up most often in this range.
          </p>
          <div className="flex flex-wrap gap-2.5">
            {catalogSignals.map((signal) => (
              <span
                key={signal}
                className="rounded-full border border-border/70 bg-secondary/50 px-3 py-2 text-sm text-foreground"
              >
                {signal}
              </span>
            ))}
          </div>
        </section>
      )}

      {topicClusterGroups.length > 0 && (
        <section className="rounded-[24px] border border-border/60 bg-background p-6">
          <div className="mb-6 flex items-start gap-3">
            <FolderTree className="mt-1 h-5 w-5 text-primary" />
            <div>
              <h2 className="font-serif text-2xl">Useful next paths</h2>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-muted-foreground">
                Use these links to move into the most relevant nearby categories, product pages, or the broader parent range when you need a wider comparison.
              </p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {topicClusterGroups.map((group) => {
              const Icon = group.icon

              return (
                <div
                  key={group.key}
                  className="rounded-[22px] border border-border/60 bg-secondary/20 p-5"
                >
                  <div className="mb-4 flex items-center gap-2">
                    <Icon className="h-4 w-4 text-primary" />
                    <h3 className="text-base font-semibold text-foreground">
                      {group.title}
                    </h3>
                  </div>

                  <div className="space-y-3">
                    {group.items.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="block rounded-2xl border border-border/60 bg-background px-4 py-3 transition-colors hover:bg-secondary/30"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1.5">
                            <p className="text-sm font-medium text-foreground">
                              {item.title}
                            </p>
                            <p className="text-sm leading-6 text-muted-foreground">
                              {item.description}
                            </p>
                          </div>
                          <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      <section className="rounded-[24px] border border-border/60 bg-background p-6">
        <div className="mb-5 flex items-center gap-3">
          <HelpCircle className="h-5 w-5 text-primary" />
          <h2 className="font-serif text-2xl">{content.faqTitle}</h2>
        </div>
        <div className="space-y-3">
          {content.faqs.map((item) => (
            <details
              key={item.question}
              className="group rounded-2xl border border-border/60 bg-secondary/20 p-4"
            >
              <summary className="cursor-pointer list-none text-sm font-medium text-foreground">
                {item.question}
              </summary>
              <p className="pt-3 text-sm leading-7 text-muted-foreground">{item.answer}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  )
}
