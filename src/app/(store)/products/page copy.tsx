import { Suspense } from 'react'
import Link from 'next/link'
import { getProducts } from '@/actions/products'
import { getCategories } from '@/actions/categories'
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

  const [{ products, pagination }, categories] = await Promise.all([
    getProducts({
      page,
      categoryId: category || undefined,
      search: search || undefined,
      limit: 12,
      activeOnly: true,
    }),
    getCategories(),
  ])

  const currentCategory = categories.find(c => c.id === category)

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
            {currentCategory && (
              <>
                <ChevronRight className="w-4 h-4" />
                <span className="text-primary">{currentCategory.name}</span>
              </>
            )}
          </nav>

          <div className="flex items-start justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 bg-primary/20 text-primary px-3 py-1.5 rounded-full text-sm font-medium mb-4 animate-fade-up">
                <ShieldCheck className="w-4 h-4" />
                Professional Protective Equipment
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-primary-foreground mb-4 animate-fade-up stagger-1">
                {currentCategory ? currentCategory.name : 'All Products'}
              </h1>
              <p className="text-primary-foreground/70 text-lg animate-fade-up stagger-2">
                {currentCategory?.description || 'We provide high-quality industrial safety equipment that meets international standards and protects every worker.'}
              </p>
            </div>

            {/* Stats */}
            <div className="hidden lg:flex items-center gap-8 animate-fade-up stagger-2">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">{pagination.total}</div>
                <div className="text-sm text-primary-foreground/60">Total Products</div>
              </div>
              <div className="w-px h-12 bg-primary-foreground/20" />
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">{categories.length}</div>
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
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                !category
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'bg-secondary hover:bg-secondary/80 text-secondary-foreground'
              }`}
            >
              <Package className="w-4 h-4" />
              All
            </Link>
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/products?category=${cat.id}`}
                className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                  category === cat.id
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'bg-secondary hover:bg-secondary/80 text-secondary-foreground'
                }`}
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
              <input type="hidden" name="category" value={category} />
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
