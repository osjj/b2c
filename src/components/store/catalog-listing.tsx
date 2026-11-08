import Image from 'next/image'
import Link from 'next/link'
import { Suspense, type ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import type { getProducts } from '@/actions/products'
import type { buildProductCategoryNavigation } from '@/lib/product-category-navigation'
import { ProductCard } from './product-card'
import { ProductCategoryNavigation } from './product-category-navigation'
import { StorePagination } from './store-pagination'
import styles from './catalog-listing.module.css'

type ListingData = Awaited<ReturnType<typeof getProducts>>
type CatalogLink = { name: string; href: string }

export function CatalogListingLayout({
  categories,
  activeHref,
  children,
}: {
  categories: ReturnType<typeof buildProductCategoryNavigation>
  activeHref?: string
  children: ReactNode
}) {
  return (
    <div className={styles.layout}>
      <ProductCategoryNavigation categories={categories} activeHref={activeHref} />
      <div className={styles.content}>{children}</div>
    </div>
  )
}

export function CatalogCategoryHeader({
  name,
  description,
  image,
  breadcrumbs,
  subcategories,
  activeHref,
  isFootProtection = false,
}: {
  name: string
  description?: string | null
  image?: string | null
  breadcrumbs: CatalogLink[]
  subcategories: CatalogLink[]
  activeHref?: string
  isFootProtection?: boolean
}) {
  const bannerImage = isFootProtection ? '/catalog/foot-protection-banner.webp' : image
  const bannerKind = isFootProtection ? 'footwear' : bannerImage ? 'photo' : 'stripe'

  return (
    <header>
      <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
        {breadcrumbs.map(({ name, href }) => (
          <span key={href}>
            <Link href={href}>{name}</Link>
            <ChevronRight size={13} aria-hidden="true" />
          </span>
        ))}
        <span aria-current="page">{name}</span>
      </nav>
      <div className={styles.categoryHeading}>
        <div>
          <h1 className={styles.categoryTitle}>{name}</h1>
          {description && (
            <p className={styles.categoryDescription} data-compact={isFootProtection}>{description}</p>
          )}
        </div>
        {subcategories.length > 0 && (
          <nav aria-labelledby="catalog-subcategories-label" className={styles.subcategories}>
            <p id="catalog-subcategories-label" className={styles.subcategoriesLabel}>Browse by Type</p>
            <ul>
              {subcategories.map(({ href, name }) => (
                <li key={href}>
                  <Link href={href} aria-current={href === activeHref ? 'page' : undefined}>
                    <span>{name}</span>
                    <ChevronRight size={16} aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </div>
      <div className={styles.categoryBanner} data-category-graphic={bannerKind}>
        {bannerImage && (
          <Image
            src={bannerImage}
            alt=""
            fill
            sizes="(min-width: 1024px) 78vw, 100vw"
            priority={isFootProtection}
          />
        )}
      </div>
    </header>
  )
}

export function CatalogProductResults({
  products,
  pagination,
  toolbar,
  emptyText = 'No products found in this category.',
  variant = 'catalog',
}: ListingData & {
  toolbar?: ReactNode
  emptyText?: string
  variant?: 'catalog' | 'category'
}) {
  return (
    <section className={styles.results} id="catalog-products" aria-labelledby="catalog-results-heading">
      <h2 className="sr-only" id="catalog-results-heading">Product Results</h2>
      <div className={styles.toolbar}>
        <p>Showing <strong>{products.length}</strong> of <strong>{pagination.total}</strong> products</p>
        {toolbar}
      </div>
      {products.length > 0 ? (
        <div className={styles.productGrid}>
          {products.map((product, index) => (
            <ProductCard
              key={product.id}
              product={product}
              variant={variant}
              deferImage={variant === 'catalog' && index >= 4}
            />
          ))}
        </div>
      ) : (
        <p className={styles.empty}>{emptyText}</p>
      )}
      {pagination.totalPages > 1 && (
        <div className={styles.pagination}>
          <Suspense fallback={null}>
            <StorePagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              total={pagination.total}
            />
          </Suspense>
        </div>
      )}
    </section>
  )
}
