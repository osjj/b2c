import { Suspense } from 'react'
import Link from 'next/link'
import { Metadata } from 'next'
import { permanentRedirect } from 'next/navigation'
import { getProducts } from '@/actions/products'
import { getCategories } from '@/actions/categories'
import { prisma } from '@/lib/prisma'
import { ProductCard } from '@/components/store/product-card'
import { StorePagination } from '@/components/store/store-pagination'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ShieldCheck, Filter, Package, ChevronRight } from 'lucide-react'
import { buildPageTitle } from '@/lib/seo-title'
import { getSiteUrl } from '@/lib/site-url'

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

  let title = 'All Products'
  let description = 'Browse our complete selection of professional protective equipment. Safety gloves, shoes, workwear and more.'

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

  return (
    <div className="min-h-screen">
      {/* Hero Section - Industrial Style */}
      <section className="relative bg-gradient-to-br from-foreground via-foreground/95 to-foreground/90 overflow-hidden">
        {/* Geometric Pattern Background */}
        <div className="absolute inset-0 opacity-[0.03]">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        {/* Diagonal Accent */}
        <div className="absolute -right-20 top-0 w-96 h-full bg-primary/20 transform skew-x-12" />

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
                <div className="text-3xl font-bold text-accent">{categories.filter((c) => c.parentId === null).length}</div>
                <div className="text-sm text-primary-foreground/60">Categories</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Category Pills - Horizontal Scroll on Mobile */}
      <section className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-6 lg:px-8">
          <div className="flex items-center gap-2 py-4 overflow-x-auto scrollbar-hide">
            <Link
              href="/products"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all bg-primary text-primary-foreground shadow-md"
            >
              <Package className="w-4 h-4" />
              All
            </Link>
            {categories
              .filter((cat) => cat.parentId === null)
              .map((cat) => (
                <Link
                  key={cat.id}
                  href={`/categories/${cat.slug}`}
                  className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all bg-secondary hover:bg-secondary/80 text-secondary-foreground"
                >
                  {cat.name}
                </Link>
              ))}
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="container mx-auto px-6 lg:px-8 py-8">
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b">
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
          <div className="grid gap-4 sm:gap-6 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {products.map((product, index) => (
              <ProductCard key={product.id} product={product} index={index} />
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
      </section>
    </div>
  )
}
