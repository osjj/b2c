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

  return (
    <div>
      {/* Hero Banner */}
      <section className="relative py-20 bg-secondary/30">
        <div className="container mx-auto px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-sm tracking-[0.2em] uppercase text-primary mb-2 animate-fade-up">
              Our Collection
            </p>
            <h1 className="font-serif text-4xl md:text-6xl mb-4 animate-fade-up stagger-1">
              All Products
            </h1>
            <p className="text-muted-foreground animate-fade-up stagger-2">
              Discover our curated selection of thoughtfully designed pieces for modern living.
            </p>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-6 lg:px-8 py-12">
        <div className="flex gap-12">
          {/* Desktop Sidebar */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="space-y-8">
              <div>
                <h4 className="font-serif text-lg mb-4">Categories</h4>
                <div className="space-y-2">
                  <Link
                    href="/products"
                    className={`block text-sm transition-colors editorial-link ${
                      !category ? 'text-foreground font-medium' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    All Products
                  </Link>
                  {categories.map((cat) => (
                    <Link
                      key={cat.id}
                      href={`/products?category=${cat.id}`}
                      className={`block text-sm transition-colors editorial-link ${
                        category === cat.id ? 'text-foreground font-medium' : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {cat.name}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <div className="flex-1">
            {/* Toolbar */}
            <div className="flex items-center justify-between mb-8 pb-6 border-b">
              <p className="text-sm text-muted-foreground">
                Showing <span className="text-foreground font-medium">{products.length}</span> of{' '}
                <span className="text-foreground font-medium">{pagination.total}</span> products
              </p>

              <div className="flex items-center gap-4">
                {/* Mobile Category Filter */}
                <div className="lg:hidden">
                  <Select defaultValue={category || 'all'}>
                    <SelectTrigger className="w-40 h-9">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Sort */}
                <form>
                  <input type="hidden" name="category" value={category} />
                  <Select name="sort" defaultValue={sort}>
                    <SelectTrigger className="w-40 h-9">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest">Newest</SelectItem>
                      <SelectItem value="price-asc">Price: Low to High</SelectItem>
                      <SelectItem value="price-desc">Price: High to Low</SelectItem>
                      <SelectItem value="name">Alphabetical</SelectItem>
                    </SelectContent>
                  </Select>
                </form>
              </div>
            </div>

            {/* Products Grid */}
            {products.length > 0 ? (
              <div className="grid gap-6 lg:gap-8 grid-cols-2 lg:grid-cols-3">
                {products.map((product, index) => (
                  <ProductCard key={product.id} product={product} index={index} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <p className="text-muted-foreground">No products found.</p>
              </div>
            )}

            {/* Pagination */}
            <div className="mt-16">
              <Suspense fallback={null}>
                <StorePagination
                  currentPage={pagination.page}
                  totalPages={pagination.totalPages}
                  total={pagination.total}
                />
              </Suspense>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
