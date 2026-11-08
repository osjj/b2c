import Link from 'next/link'
import Image from 'next/image'
import { Metadata } from 'next'
import type { LucideIcon } from 'lucide-react'
import { ArrowRight, Boxes, Ear, Eye, Flame, Footprints, Hand, HardHat, Package, ShieldCheck, Shirt, Umbrella, Wind } from 'lucide-react'
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
            <h1 className="font-extrabold text-4xl md:text-6xl mb-4 animate-fade-up stagger-1">
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
                <Link key={category.id} href={category.href} className={styles.categoryCard}>
                  <div className={styles.categoryPhoto}>
                    {category.image ? (
                      <Image
                        src={category.image}
                        alt={category.name}
                        fill
                        sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                        priority={index < 3}
                      />
                    ) : (
                      <div className={styles.categoryDrawing}>
                        <Icon size={72} strokeWidth={1.1} aria-hidden="true" />
                      </div>
                    )}
                  </div>
                  <div className={styles.categoryBody}>
                    <div className={styles.categoryTitle}>
                      <h2>{category.name}</h2>
                      <ArrowRight size={20} aria-hidden="true" />
                    </div>
                    {category.description && <p>{category.description}</p>}
                    {category.children && category.children.length > 0 && (
                      <div className={styles.categoryTags}>
                        {category.children.slice(0, 4).map((child) => (
                          <span key={child.id} title={`${category.name} / ${child.name}`}>
                            {child.name}
                          </span>
                        ))}
                        {category.children.length > 4 && <span>+{category.children.length - 4} more</span>}
                      </div>
                    )}
                  </div>
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
