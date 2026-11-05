import { Suspense } from 'react'
import Link from 'next/link'
import { Metadata } from 'next'
import { permanentRedirect } from 'next/navigation'
import { getProducts } from '@/actions/products'
import { getCategories } from '@/actions/categories'
import { prisma } from '@/lib/prisma'
import { ProductCard } from '@/components/store/product-card'
import { ProductCategoryNavigation } from '@/components/store/product-category-navigation'
import { StorePagination } from '@/components/store/store-pagination'
import { CatalogBackground, CatalogHero } from '@/components/store/catalog-background'
import styles from '@/components/store/catalog-background.module.css'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ChevronRight,
  Filter,
  Package,
  ShieldCheck,
} from 'lucide-react'
import { buildPageTitle } from '@/lib/seo-title'
import { getSiteUrl } from '@/lib/site-url'
import { buildProductCategoryNavigation } from '@/lib/product-category-navigation'

type Props = {
  searchParams: Promise<{
    page?: string
    category?: string
    sort?: string
    search?: string
  }>
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = await searchParams
  const { search, page } = params

  let title = 'Wholesale PPE Products & Safety Equipment'
  let description = 'Browse PPE products from Laifappe for bulk sourcing: safety gloves, steel toe footwear, workwear, helmets, eye protection, and respiratory equipment.'

  if (search) {
    title = `Search results for "${search}"`
    description = `Find ${search} in our collection of safety equipment and PPE products.`
  }

  if (page && Number(page) > 1) {
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

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string
    category?: string
    sort?: string
    search?: string
  }>
}) {
  const params = await searchParams
  const page = Number(params.page) || 1
  const category = params.category || ''
  const sort = params.sort || 'newest'
  const search = params.search || ''

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

  const [{ products, pagination }, categories] = await Promise.all([
    getProducts({
      page,
      search: search || undefined,
      limit: 12,
      activeOnly: true,
    }),
    getCategories(),
  ])
  const navigationCategories = buildProductCategoryNavigation(categories)

  return (
    <CatalogBackground className="min-h-screen">
      {/* Hero Section - Industrial Style */}
      <CatalogHero tone="dark">
        <div className="container mx-auto px-6 lg:px-8 py-16 relative">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-primary-foreground/60 mb-8 animate-fade-up">
            <Link href="/" className="hover:text-primary-foreground transition-colors">Home</Link>
            <ChevronRight className="w-4 h-4" />
            <span className="text-primary-foreground">Products</span>
          </nav>

          <div className="flex items-start justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 bg-accent/20 text-accent px-3 py-1.5 rounded-full text-sm font-medium mb-4 animate-fade-up">
                <ShieldCheck className="w-4 h-4" />
                Professional Protective Equipment
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-primary-foreground mb-4 animate-fade-up stagger-1">
                All Products
              </h1>
              <p className="text-primary-foreground/70 text-lg animate-fade-up stagger-2">
                We provide high-quality industrial safety equipment that meets international standards and protects every worker.
              </p>
            </div>

            {/* Stats */}
            <div className="hidden lg:flex items-center gap-8 animate-fade-up stagger-2">
              <div className="text-center">
                <div className="text-3xl font-bold text-accent">{pagination.total}</div>
                <div className="text-sm text-primary-foreground/60">Total Products</div>
              </div>
              <div className="w-px h-12 bg-primary-foreground/20" />
              <div className="text-center">
                <div className="text-3xl font-bold text-accent">{navigationCategories.length}</div>
                <div className="text-sm text-primary-foreground/60">Categories</div>
              </div>
            </div>
          </div>
        </div>
      </CatalogHero>

      {/* Main Content */}
      <section className="container mx-auto px-6 lg:px-8 py-8">
        <div className="grid items-start gap-7 lg:grid-cols-[14rem_minmax(0,1fr)] xl:grid-cols-[15rem_minmax(0,1fr)] xl:gap-9">
          <ProductCategoryNavigation categories={navigationCategories} />

          <div className="min-w-0">
            {/* Toolbar */}
            <div className={`${styles.toolbar} flex flex-wrap items-center justify-between gap-3`}>
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">{pagination.total}</span> products
                </span>
                {search && (
                  <span className="text-sm bg-primary/10 text-primary px-2 py-0.5 rounded">
                    Search: {search}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <form>
                  {search && <input type="hidden" name="search" value={search} />}
                  <Select name="sort" defaultValue={sort}>
                    <SelectTrigger className="w-36 h-9 text-sm">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest">Newest</SelectItem>
                      <SelectItem value="price-asc">Price: Low to High</SelectItem>
                      <SelectItem value="price-desc">Price: High to Low</SelectItem>
                      <SelectItem value="name">Name</SelectItem>
                    </SelectContent>
                  </Select>
                </form>
              </div>
            </div>

            {/* Products Grid */}
            {products.length > 0 ? (
              <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 xl:grid-cols-4">
                {products.map((product, index) => (
                  <ProductCard key={product.id} product={product} index={index} deferImage={index >= 4} />
                ))}
              </div>
            ) : (
              <div className="text-center py-20">
                <Package className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No products found</h3>
                <p className="text-muted-foreground mb-6">No products are currently available in this category. Please check other categories.</p>
                <Link
                  href="/products"
                  className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors"
                >
                  View All Products
                </Link>
              </div>
            )}

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="mt-12">
                <Suspense fallback={null}>
                  <StorePagination
                    currentPage={pagination.page}
                    totalPages={pagination.totalPages}
                    total={pagination.total}
                  />
                </Suspense>
              </div>
            )}
          </div>
        </div>
      </section>
    </CatalogBackground>
  )
}
