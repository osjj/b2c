import Image from 'next/image'
import Link from 'next/link'
import { Suspense, type ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import type { getProducts } from '@/actions/products'
import { catalogSortOptions, type CatalogSortValue } from '@/lib/catalog-sort'
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
}: {
  name: string
  description?: string | null
  image?: string | null
  breadcrumbs: CatalogLink[]
  subcategories: CatalogLink[]
  activeHref?: string
}) {
  return (
    <header className={styles.categoryHeader}>
      <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
        {breadcrumbs.map(({ name, href }) => (
          <span key={href}>
            <Link href={href}>{name}</Link>
            <ChevronRight size={13} aria-hidden="true" />
          </span>
        ))}
        <span aria-current="page">{name}</span>
      </nav>
      <div className={styles.categoryHero} data-has-image={Boolean(image)}>
        <div className={styles.categoryHeading}>
          <h1 className={styles.categoryTitle}>{name}</h1>
          {description && <p className={styles.categoryDescription}>{description}</p>}
        </div>
        {image && (
          <div className={styles.categoryHeroArt}>
            <Image
              src={image}
              alt=""
              fill
              sizes="(min-width: 1440px) 735px, (min-width: 960px) 51vw, (min-width: 768px) 66vw, 100vw"
              preload
            />
          </div>
        )}
      </div>
      {subcategories.length > 0 && (
        <nav aria-label="Browse by Type" className={styles.subcategories}>
          <ul>
            {subcategories.map(({ href, name }) => (
              <li key={href}>
                <Link href={href} aria-current={href === activeHref ? 'page' : undefined}>
                  {name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
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

export function CatalogSortForm({
  path,
  sort,
  search,
}: {
  path: string
  sort: CatalogSortValue
  search?: string
}) {
  return (
    <form className={styles.sortForm} action={`${path}#catalog-products`}>
      {search && <input type="hidden" name="search" value={search} />}
      <label htmlFor="catalog-sort">Sort by</label>
      <select id="catalog-sort" name="sort" defaultValue={sort}>
        {catalogSortOptions.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
      </select>
      <button type="submit">Apply</button>
    </form>
  )
}
