import Image from 'next/image'
import Link from 'next/link'
import { Metadata } from 'next'
import { permanentRedirect } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import { getProducts } from '@/actions/products'
import { getCategories } from '@/actions/categories'
import { prisma } from '@/lib/prisma'
import { ProductCard } from '@/components/store/product-card'
import { CatalogListingLayout, CatalogProductResults } from '@/components/store/catalog-listing'
import styles from '@/components/store/catalog-listing.module.css'
import { buildPageTitle } from '@/lib/seo-title'
import { getSiteUrl } from '@/lib/site-url'
import { buildProductCategoryNavigation } from '@/lib/product-category-navigation'
import { normalizeCategoryPage } from '@/lib/category-pagination'

const sortOptions = [
  { value: 'catalog', label: 'Catalog order', orderBy: 'sortOrder' },
  { value: 'newest', label: 'Newest', orderBy: 'createdAt' },
  { value: 'price-asc', label: 'Base Price: Low to High', orderBy: 'price' },
  { value: 'price-desc', label: 'Base Price: High to Low', orderBy: 'price' },
  { value: 'name', label: 'Name', orderBy: 'name' },
] as const

const spotlight = [
  { slug: 's3-black-cowhide-steel-toe-safety-shoes', label: 'Black Cowhide Steel Toe Safety Shoes' },
  { slug: 'heavy-duty-cowhide-leather-back-cotton-blend-work-gloves', label: 'Cowhide Work Gloves' },
  { slug: 'ce-en397-abs-safety-helmet-with-switchable-vents-slotted', label: 'Yellow Safety Helmet' },
  { slug: 'reflective-quick-dry-work-polo-optional-trousers', label: 'Reflective Quick-Dry Work Polo' },
]

type Props = {
  searchParams: Promise<{
    page?: string | string[]
    category?: string | string[]
    sort?: string | string[]
    search?: string | string[]
  }>
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = await searchParams
  const search = typeof params.search === 'string' ? params.search : ''
  const page = normalizeCategoryPage(params.page)

  let title = 'Wholesale PPE Products & Safety Equipment'
  let description = 'Browse PPE products from Laifappe for bulk sourcing: safety gloves, steel toe footwear, workwear, helmets, eye protection, and respiratory equipment.'

  if (search) {
    title = `Search results for "${search}"`
    description = `Find ${search} in our collection of safety equipment and PPE products.`
  }

  if (page > 1) {
    title += ` - Page ${page}`
  }

  const baseUrl = getSiteUrl()

  return {
    title: {
      absolute: buildPageTitle(title),
    },
    description,
    openGraph: {
      title,
      description,
      url: `${baseUrl}/products`,
      siteName: 'Laifappe',
      type: 'website',
    },
    robots: {
      index: !search, // Don't index search result pages
      follow: true,
    },
    alternates: {
      canonical: search ? undefined : `${baseUrl}/products`,
    },
  }
}

export default async function ProductsPage({ searchParams }: Props) {
  const params = await searchParams
  const page = normalizeCategoryPage(params.page)
  const category = typeof params.category === 'string' ? params.category : ''
  const search = typeof params.search === 'string' ? params.search : ''
  const sort = sortOptions.find(({ value }) => value === params.sort) ?? sortOptions[0]
  const showOverview = !search && page === 1

  // SEO: any `?category=` link (legacy cuid or slug) is a 301 to the canonical
  // `/categories/{slug}` URL. For child categories we go straight to the nested
  // URL so there's only one hop instead of two.
  if (category) {
    const match = await prisma.category.findFirst({
      where: {
        OR: [{ id: category }, { slug: category }],
        isActive: true,
      },
      select: {
        slug: true,
        parent: { select: { slug: true, isActive: true } },
      },
    })
    if (match) {
      const target =
        match.parent && match.parent.isActive
          ? `/categories/${match.parent.slug}/${match.slug}`
          : `/categories/${match.slug}`
      permanentRedirect(target)
    }
  }

  const [listing, categories, featured] = await Promise.all([
    getProducts({
      page,
      search: search || undefined,
      limit: 12,
      activeOnly: true,
      orderBy: sort.orderBy,
      priceDirection: sort.value === 'price-desc' ? 'desc' : 'asc',
    }),
    getCategories(),
    showOverview
      ? prisma.product.findMany({
          where: { isActive: true, slug: { in: spotlight.map(({ slug }) => slug) }, images: { some: {} } },
          include: { category: true, images: { orderBy: { sortOrder: 'asc' }, take: 1 } },
        })
      : [],
  ])
  const navigationCategories = buildProductCategoryNavigation(categories)
  const spotlightProducts = spotlight.flatMap(({ slug, label }) => {
    const product = featured.find((entry) => entry.slug === slug)
    if (!product) return []
    return [{
      label,
      product: { ...product, price: Number(product.price), comparePrice: product.comparePrice ? Number(product.comparePrice) : null },
    }]
  })
  const remainingProducts = listing.products.filter(
    (product) => !spotlightProducts.some((entry) => entry.product.id === product.id),
  )
  const featuredProducts = [
    ...spotlightProducts,
    ...remainingProducts.map((product) => ({ product, label: undefined })),
  ].slice(0, spotlight.length)

  return (
    <CatalogListingLayout categories={navigationCategories}>
      {showOverview ? (
        <header className={styles.hero}>
          <div className={styles.heroCopy}>
            <div className={styles.heroStripes} aria-hidden="true">
              <span /><span /><span />
            </div>
            <h1 className={styles.heroTitle}>All <span>Products</span></h1>
            <p className={styles.heroDescription}>Work safety equipment<br />for industrial buyers</p>
            <a href="#catalog-products" className={styles.browseButton}>
              Browse Products <ArrowRight size={19} aria-hidden="true" />
            </a>
          </div>
          <div className={styles.heroArt}>
            <Image
              src="/catalog/catalog-hero.webp"
              alt=""
              fill
              priority
              sizes="(min-width: 960px) 56vw, (min-width: 640px) 70vw, 100vw"
            />
          </div>
        </header>
      ) : (
        <h1 className={styles.categoryTitle}>{search ? `Search results for “${search}”` : 'All Products'}</h1>
      )}
      {showOverview && featuredProducts.length > 0 && (
        <section className={styles.featureSection} aria-labelledby="featured-products">
          <h2 className="sr-only" id="featured-products">Featured Products</h2>
          <div className={styles.featureStrip}>
            {featuredProducts.map(({ product, label }) => (
              <ProductCard key={product.id} product={product} variant="featured" featuredLabel={label} />
            ))}
          </div>
        </section>
      )}
      <CatalogProductResults
        {...listing}
        emptyText={search ? 'No products match your search.' : 'No products found.'}
        toolbar={
          <form className={styles.sortForm} action="/products#catalog-products">
            {search && <input type="hidden" name="search" value={search} />}
            <label htmlFor="catalog-sort">Sort by</label>
            <select id="catalog-sort" name="sort" defaultValue={sort.value}>
              {sortOptions.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
            </select>
            <button type="submit">Apply</button>
          </form>
        }
      />
      {search && listing.products.length === 0 && (
        <Link href="/products" className={styles.browseButton}>View All Products <ArrowRight size={19} aria-hidden="true" /></Link>
      )}
    </CatalogListingLayout>
  )
}
