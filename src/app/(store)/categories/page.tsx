import Link from 'next/link'
import Image from 'next/image'
import { Metadata } from 'next'
import type { LucideIcon } from 'lucide-react'
import { Boxes, Ear, Eye, Flame, Footprints, Hand, HardHat, Package, ShieldCheck, Shirt, Umbrella, Wind } from 'lucide-react'
import { getCategories } from '@/actions/categories'
import { buildProductCategoryNavigation } from '@/lib/product-category-navigation'
import { buildPageTitle } from '@/lib/seo-title'
import { getSiteUrl } from '@/lib/site-url'
import { getCategorySeoContent } from '@/lib/category-seo-content'
import { CatalogBackground, CatalogHero } from '@/components/store/catalog-background'
import styles from '@/components/store/catalog-background.module.css'

// Categories can be reordered or renamed outside an application release.
// Render the current catalog instead of retaining a build-time taxonomy snapshot.
export const dynamic = 'force-dynamic'

const categoryIcons: Record<string, LucideIcon> = {
  'fall-protection': ShieldCheck,
  'respiratory-protection': Wind,
  'body-protection': Shirt,
  'hand-protection': Hand,
  'hearing-protection': Ear,
  'head-protection': HardHat,
  'firefighting-equipment': Flame,
  'eye-protection': Eye,
  rainwear: Umbrella,
  'foot-protection': Footprints,
  'other-supplies': Boxes,
}

const categoryUrl = `${getSiteUrl()}/categories`

export const metadata: Metadata = {
  title: { absolute: buildPageTitle('Product Categories') },
  description: 'Browse our complete range of PPE products organized by category. Find safety gloves, shoes, workwear, and more protective equipment.',
  openGraph: {
    title: 'Product Categories',
    description: 'Browse our complete range of PPE products organized by category.',
    url: categoryUrl,
    type: 'website',
  },
  alternates: { canonical: categoryUrl },
}

export default async function CategoriesPage() {
  const catalog = await getCategories()
  const categoriesById = new Map(catalog.map((category) => [category.id, category]))
  const categories = buildProductCategoryNavigation(catalog).flatMap((entry) => {
    const category = categoriesById.get(entry.id)
    if (!category) return []

    return [{
      ...category,
      href: entry.href,
      description: getCategorySeoContent(category, category.parent).heroDescription ?? category.description,
    }]
  })

  return (
    <CatalogBackground>
      {/* Hero Banner */}
      <CatalogHero className="py-20">
        <div className="container mx-auto px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-sm tracking-[0.2em] uppercase text-primary mb-2 animate-fade-up">
              Browse
            </p>
            <h1 className="font-serif text-4xl md:text-6xl mb-4 animate-fade-up stagger-1">
              Categories
            </h1>
            <p className="text-muted-foreground animate-fade-up stagger-2">
              Explore our collections organized by category.
            </p>
          </div>
        </div>
      </CatalogHero>

      <div className="container mx-auto px-6 lg:px-8 py-12">
        {categories.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {categories.map((category, index) => {
              const Icon = categoryIcons[category.slug] ?? Package

              return (
              <Link
                key={category.id}
                href={category.href}
                className={`${styles.categoryCard} group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4`}
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-muted rounded-lg">
                  {category.image ? (
                    <Image
                      src={category.image}
                      alt={category.name}
                      fill
                      sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      priority={index < 3}
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-start justify-end bg-gradient-to-br from-foreground via-foreground/90 to-primary/50 p-8">
                      <Icon className="h-24 w-24 text-background/30" strokeWidth={1.1} aria-hidden="true" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                  <div className="absolute bottom-6 left-6 right-6 text-white">
                    <h2 className="font-serif text-2xl mb-2 group-hover:text-primary-foreground/90 transition-colors">
                      {category.name}
                    </h2>
                    {category.description && (
                      <p className="text-sm text-white/80 line-clamp-2">
                        {category.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Subcategories */}
                {category.children && category.children.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {category.children.slice(0, 4).map((child) => (
                      <span
                        key={child.id}
                        className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded"
                        title={`${category.name} / ${child.name}`}
                      >
                        {child.name}
                      </span>
                    ))}
                    {category.children.length > 4 && (
                      <span className="text-xs text-muted-foreground">
                        +{category.children.length - 4} more
                      </span>
                    )}
                  </div>
                )}
              </Link>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-muted-foreground">No categories found.</p>
          </div>
        )}
      </div>
    </CatalogBackground>
  )
}
