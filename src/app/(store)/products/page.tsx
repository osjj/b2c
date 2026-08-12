import { Suspense } from 'react'
import type { LucideIcon } from 'lucide-react'
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
import {
  ChevronRight,
  Eye,
  Filter,
  Footprints,
  Hand,
  HardHat,
  Package,
  ShieldCheck,
  Shirt,
  Wind,
} from 'lucide-react'
import { buildPageTitle } from '@/lib/seo-title'
import { getSiteUrl } from '@/lib/site-url'
import { cn } from '@/lib/utils'

type Props = {
  searchParams: Promise<{
    page?: string
    category?: string
    sort?: string
    search?: string
  }>
}

type ProductCategory = Awaited<ReturnType<typeof getCategories>>[number]

const categoryIconMap: Record<string, LucideIcon> = {
  'foot-protection': Footprints,
  'body-protection': Shirt,
  'eye-protection': Eye,
  'respiratory-protection': Wind,
  'hand-protection': Hand,
  'fall-protection': ShieldCheck,
  'head-protection': HardHat,
}

function ProductCategoryNavigation({ categories }: { categories: ProductCategory[] }) {
  const topLevelCategories = categories.filter((category) => category.parentId === null)

  return (
    <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start">
      <nav
        aria-label="Product categories"
        className="[-webkit-tap-highlight-color:transparent] lg:hidden"
      >
        <div className="mb-3 flex items-end justify-between gap-4">
          <div>
            <p className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-accent">
              Product categories
            </p>
            <p className="mt-1 text-sm text-muted-foreground">Choose a protection type</p>
          </div>
          <span className="pb-0.5 text-xs font-medium text-muted-foreground">
            {topLevelCategories.length} categories
          </span>
        </div>

        <ul className="grid grid-cols-2 gap-2.5">
          <li className="col-span-2">
            <Link
              href="/products"
              aria-current="page"
              className="group flex min-h-14 items-center gap-3 rounded-md border border-accent/35 bg-accent/[0.06] px-4 text-sm font-semibold text-accent shadow-[0_10px_24px_-20px_rgba(234,88,12,0.75)] transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent motion-reduce:transition-none"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-accent text-accent-foreground">
                <Package className="h-5 w-5 stroke-[1.8]" aria-hidden="true" />
              </span>
              <span className="flex-1">All Products</span>
              <span className="text-xs font-medium text-accent/75">View all</span>
              <ChevronRight
                className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none"
                aria-hidden="true"
              />
            </Link>
          </li>

          {topLevelCategories.map((category, index) => {
            const Icon = categoryIconMap[category.slug] ?? Package
            const isLastUnpairedCategory =
              topLevelCategories.length % 2 === 1 && index === topLevelCategories.length - 1

            return (
              <li key={category.id} className={isLastUnpairedCategory ? 'col-span-2' : undefined}>
                <Link
                  href={`/categories/${category.slug}`}
                  className={cn(
                    'group relative flex overflow-hidden rounded-md border border-border/80 bg-card p-3.5 pr-9 shadow-[0_12px_28px_-24px_rgba(15,23,42,0.65)] transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-accent/45 hover:shadow-[0_16px_30px_-22px_rgba(234,88,12,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent motion-reduce:transform-none motion-reduce:transition-none',
                    isLastUnpairedCategory
                      ? 'min-h-20 flex-row items-center gap-3'
                      : 'min-h-24 flex-col items-start justify-between'
                  )}
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-sm bg-muted text-foreground/70 transition-colors duration-200 group-hover:bg-accent/10 group-hover:text-accent motion-reduce:transition-none">
                    <Icon className="h-5 w-5 stroke-[1.7]" aria-hidden="true" />
                  </span>
                  <span
                    className={cn(
                      'text-sm font-semibold leading-tight text-foreground/85 group-hover:text-accent',
                      !isLastUnpairedCategory && 'mt-3'
                    )}
                  >
                    {category.name}
                  </span>
                  <ChevronRight
                    className={cn(
                      'absolute right-3 h-4 w-4 text-muted-foreground transition-[color,transform] duration-200 group-hover:translate-x-0.5 group-hover:text-accent motion-reduce:transition-none',
                      isLastUnpairedCategory ? 'top-1/2 -translate-y-1/2' : 'top-4'
                    )}
                    aria-hidden="true"
                  />
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <nav
        aria-label="Product categories"
        className="hidden border border-border/70 bg-card shadow-[0_18px_48px_-36px_rgba(15,23,42,0.55)] [-webkit-tap-highlight-color:transparent] lg:block"
      >
        <ul>
          <li className="border-b">
            <Link
              href="/products"
              aria-current="page"
              className="group relative flex min-h-16 w-full items-center gap-3 border-l-2 border-accent bg-accent/[0.045] px-4 text-sm font-semibold text-accent transition-colors duration-200 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset motion-reduce:transition-none"
            >
              <Package className="h-5 w-5 shrink-0 stroke-[1.7]" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate">All Products</span>
              <ChevronRight
                className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none"
                aria-hidden="true"
              />
            </Link>
          </li>

          {topLevelCategories.map((category) => {
            const Icon = categoryIconMap[category.slug] ?? Package

            return (
              <li
                key={category.id}
                className="border-b last:border-b-0"
              >
                <Link
                  href={`/categories/${category.slug}`}
                  className="group flex min-h-16 w-full items-center gap-3 border-l-2 border-transparent px-4 text-sm font-semibold text-foreground/80 transition-colors duration-200 hover:border-accent/45 hover:bg-muted/55 hover:text-accent focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset motion-reduce:transition-none"
                >
                  <Icon
                    className="h-5 w-5 shrink-0 stroke-[1.7] text-muted-foreground transition-colors duration-200 group-hover:text-accent motion-reduce:transition-none"
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1 leading-tight lg:break-words">
                    {category.name}
                  </span>
                  <ChevronRight
                    className="h-4 w-4 shrink-0 text-muted-foreground transition-[color,transform] duration-200 group-hover:translate-x-0.5 group-hover:text-accent motion-reduce:transition-none"
                    aria-hidden="true"
                  />
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </aside>
  )
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

      {/* Main Content */}
      <section className="container mx-auto px-6 lg:px-8 py-8">
        <div className="grid items-start gap-7 lg:grid-cols-[14rem_minmax(0,1fr)] xl:grid-cols-[15rem_minmax(0,1fr)] xl:gap-9">
          <ProductCategoryNavigation categories={categories} />

          <div className="min-w-0">
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
              <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 xl:grid-cols-4">
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
          </div>
        </div>
      </section>
    </div>
  )
}
