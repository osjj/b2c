# Store Product Pages

## src/app/(store)/products/page.tsx

```tsx
import { Suspense } from 'react'
import { getProducts } from '@/actions/products'
import { getCategories } from '@/actions/categories'
import { ProductGrid } from '@/components/store/product-grid'
import { ProductFilters } from '@/components/store/product-filters'
import { Pagination } from '@/components/store/pagination'
import { Skeleton } from '@/components/ui/skeleton'

interface ProductsPageProps {
  searchParams: {
    page?: string
    category?: string
    search?: string
    sort?: string
  }
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const page = Number(searchParams.page) || 1
  const categoryId = searchParams.category || ''
  const search = searchParams.search || ''

  const [{ products, pagination }, categories] = await Promise.all([
    getProducts({ page, categoryId, search, isActive: true }),
    getCategories(),
  ])

  return (
    <div className="container py-8">
      <div className="flex flex-col md:flex-row gap-8">
        <aside className="w-full md:w-64 shrink-0">
          <ProductFilters categories={categories} />
        </aside>

        <main className="flex-1">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">
              {search ? `Search: "${search}"` : 'All Products'}
            </h1>
            <p className="text-muted-foreground">
              {pagination.total} products
            </p>
          </div>

          <Suspense fallback={<ProductGridSkeleton />}>
            <ProductGrid products={products} />
          </Suspense>

          <div className="mt-8">
            <Pagination {...pagination} />
          </div>
        </main>
      </div>
    </div>
  )
}

function ProductGridSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="space-y-3">
          <Skeleton className="aspect-square rounded-lg" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ))}
    </div>
  )
}
```

## src/app/(store)/products/[slug]/page.tsx

```tsx
import { notFound } from 'next/navigation'
import Image from 'next/image'
import { getProductBySlug, getFeaturedProducts } from '@/actions/products'
import { AddToCartButton } from '@/components/store/add-to-cart-button'
import { ProductGrid } from '@/components/store/product-grid'
import { formatPrice } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

interface ProductPageProps {
  params: { slug: string }
}

export default async function ProductPage({ params }: ProductPageProps) {
  const product = await getProductBySlug(params.slug)

  if (!product) {
    notFound()
  }

  const relatedProducts = await getFeaturedProducts(4)

  return (
    <div className="container py-8">
      <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
        {/* Images */}
        <div className="space-y-4">
          <div className="aspect-square relative rounded-lg overflow-hidden bg-gray-100">
            {product.images[0] ? (
              <Image
                src={product.images[0].url}
                alt={product.name}
                fill
                className="object-cover"
                priority
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                No image
              </div>
            )}
          </div>
          {product.images.length > 1 && (
            <div className="grid grid-cols-4 gap-2">
              {product.images.slice(1, 5).map((image, index) => (
                <div
                  key={image.id}
                  className="aspect-square relative rounded-lg overflow-hidden bg-gray-100"
                >
                  <Image
                    src={image.url}
                    alt={`${product.name} ${index + 2}`}
                    fill
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="space-y-6">
          <div>
            {product.category && (
              <p className="text-sm text-muted-foreground mb-2">
                {product.category.name}
              </p>
            )}
            <h1 className="text-3xl font-bold">{product.name}</h1>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-3xl font-bold">
              {formatPrice(Number(product.price))}
            </span>
            {product.comparePrice && (
              <span className="text-xl text-muted-foreground line-through">
                {formatPrice(Number(product.comparePrice))}
              </span>
            )}
            {product.comparePrice && (
              <Badge variant="destructive">
                {Math.round(
                  ((Number(product.comparePrice) - Number(product.price)) /
                    Number(product.comparePrice)) *
                    100
                )}
                % OFF
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            {product.stock > 0 ? (
              <Badge variant="secondary">In Stock ({product.stock})</Badge>
            ) : (
              <Badge variant="destructive">Out of Stock</Badge>
            )}
            {product.sku && (
              <span className="text-sm text-muted-foreground">
                SKU: {product.sku}
              </span>
            )}
          </div>

          {product.description && (
            <div className="prose prose-sm max-w-none">
              <p>{product.description}</p>
            </div>
          )}

          {/* Variants */}
          {product.variants.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Variant</label>
              <select className="w-full border rounded-md p-2">
                {product.variants.map((variant) => (
                  <option key={variant.id} value={variant.id}>
                    {variant.name} - {formatPrice(Number(variant.price))}
                  </option>
                ))}
              </select>
            </div>
          )}

          <AddToCartButton product={product} />
        </div>
      </div>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <div className="mt-16">
          <h2 className="text-2xl font-bold mb-6">You may also like</h2>
          <ProductGrid products={relatedProducts} />
        </div>
      )}
    </div>
  )
}

export async function generateMetadata({ params }: ProductPageProps) {
  const product = await getProductBySlug(params.slug)

  if (!product) {
    return { title: 'Product Not Found' }
  }

  return {
    title: product.name,
    description: product.description,
  }
}
```

## src/components/store/product-card.tsx

```tsx
import Link from 'next/link'
import Image from 'next/image'
import { Product, ProductImage } from '@prisma/client'
import { formatPrice } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

type ProductWithImages = Product & {
  images: ProductImage[]
}

interface ProductCardProps {
  product: ProductWithImages
}

export function ProductCard({ product }: ProductCardProps) {
  const hasDiscount =
    product.comparePrice && Number(product.comparePrice) > Number(product.price)

  return (
    <Link href={`/products/${product.slug}`} className="group">
      <div className="aspect-square relative rounded-lg overflow-hidden bg-gray-100 mb-3">
        {product.images[0] ? (
          <Image
            src={product.images[0].url}
            alt={product.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            No image
          </div>
        )}
        {hasDiscount && (
          <Badge className="absolute top-2 left-2" variant="destructive">
            Sale
          </Badge>
        )}
        {product.stock === 0 && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <Badge variant="secondary">Out of Stock</Badge>
          </div>
        )}
      </div>
      <h3 className="font-medium group-hover:text-primary transition-colors line-clamp-2">
        {product.name}
      </h3>
      <div className="flex items-center gap-2 mt-1">
        <span className="font-bold">{formatPrice(Number(product.price))}</span>
        {hasDiscount && (
          <span className="text-sm text-muted-foreground line-through">
            {formatPrice(Number(product.comparePrice))}
          </span>
        )}
      </div>
    </Link>
  )
}
```

## src/components/store/product-grid.tsx

```tsx
import { Product, ProductImage } from '@prisma/client'
import { ProductCard } from './product-card'

type ProductWithImages = Product & {
  images: ProductImage[]
}

interface ProductGridProps {
  products: ProductWithImages[]
}

export function ProductGrid({ products }: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No products found</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  )
}
```

## src/components/store/product-filters.tsx

```tsx
'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Category } from '@prisma/client'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Search, X } from 'lucide-react'

interface ProductFiltersProps {
  categories: (Category & { _count: { products: number } })[]
}

export function ProductFilters({ categories }: ProductFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const currentCategory = searchParams.get('category') || ''
  const currentSearch = searchParams.get('search') || ''

  const updateFilters = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams)
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    params.delete('page')
    router.push(`${pathname}?${params.toString()}`)
  }

  const clearFilters = () => {
    router.push(pathname)
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Search</Label>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            const formData = new FormData(e.currentTarget)
            updateFilters('search', formData.get('search') as string)
          }}
        >
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              name="search"
              placeholder="Search products..."
              defaultValue={currentSearch}
              className="pl-10"
            />
          </div>
        </form>
      </div>

      <div className="space-y-2">
        <Label>Categories</Label>
        <div className="space-y-1">
          <button
            onClick={() => updateFilters('category', '')}
            className={`block w-full text-left px-3 py-2 rounded-md text-sm ${
              !currentCategory
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted'
            }`}
          >
            All Categories
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => updateFilters('category', category.id)}
              className={`block w-full text-left px-3 py-2 rounded-md text-sm ${
                currentCategory === category.id
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted'
              }`}
            >
              {category.name}
              <span className="text-xs ml-1 opacity-60">
                ({category._count.products})
              </span>
            </button>
          ))}
        </div>
      </div>

      {(currentCategory || currentSearch) && (
        <Button variant="outline" size="sm" onClick={clearFilters}>
          <X className="h-4 w-4 mr-2" />
          Clear Filters
        </Button>
      )}
    </div>
  )
}
```

## src/components/store/add-to-cart-button.tsx

```tsx
'use client'

import { useState } from 'react'
import { ShoppingCart, Minus, Plus } from 'lucide-react'
import { Product } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { useCartStore } from '@/stores/cart'
import { toast } from 'sonner'

interface AddToCartButtonProps {
  product: Product
}

export function AddToCartButton({ product }: AddToCartButtonProps) {
  const [quantity, setQuantity] = useState(1)
  const addItem = useCartStore((state) => state.addItem)

  const handleAddToCart = () => {
    addItem({
      productId: product.id,
      name: product.name,
      price: Number(product.price),
      image: '', // Will be set from product images
      quantity,
    })
    toast.success('Added to cart')
  }

  const isOutOfStock = product.stock === 0

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="flex items-center border rounded-md">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            disabled={quantity <= 1}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <span className="w-12 text-center">{quantity}</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
            disabled={quantity >= product.stock}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Button
        size="lg"
        className="w-full"
        onClick={handleAddToCart}
        disabled={isOutOfStock}
      >
        <ShoppingCart className="mr-2 h-5 w-5" />
        {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
      </Button>
    </div>
  )
}
```

## src/components/store/pagination.tsx

```tsx
'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PaginationProps {
  page: number
  totalPages: number
}

export function Pagination({ page, totalPages }: PaginationProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const createPageUrl = (pageNum: number) => {
    const params = new URLSearchParams(searchParams)
    params.set('page', pageNum.toString())
    return `${pathname}?${params.toString()}`
  }

  if (totalPages <= 1) return null

  return (
    <div className="flex items-center justify-center gap-2">
      <Button
        variant="outline"
        size="icon"
        disabled={page <= 1}
        asChild={page > 1}
      >
        {page > 1 ? (
          <Link href={createPageUrl(page - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Link>
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
      </Button>

      <div className="flex items-center gap-1">
        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
          let pageNum: number
          if (totalPages <= 5) {
            pageNum = i + 1
          } else if (page <= 3) {
            pageNum = i + 1
          } else if (page >= totalPages - 2) {
            pageNum = totalPages - 4 + i
          } else {
            pageNum = page - 2 + i
          }

          return (
            <Button
              key={pageNum}
              variant={page === pageNum ? 'default' : 'outline'}
              size="icon"
              asChild={page !== pageNum}
            >
              {page !== pageNum ? (
                <Link href={createPageUrl(pageNum)}>{pageNum}</Link>
              ) : (
                <span>{pageNum}</span>
              )}
            </Button>
          )
        })}
      </div>

      <Button
        variant="outline"
        size="icon"
        disabled={page >= totalPages}
        asChild={page < totalPages}
      >
        {page < totalPages ? (
          <Link href={createPageUrl(page + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Link>
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
      </Button>
    </div>
  )
}
```
