import Link from 'next/link'
import { ShoppingBag } from 'lucide-react'
import { ProductCard } from '@/components/store/product-card'
import { Button } from '@/components/ui/button'
import type { ProductImage, Category } from '@prisma/client'

interface Product {
  id: string
  name: string
  slug: string
  description: string | null
  price: number
  comparePrice: number | null
  stock: number
  isActive: boolean
  isFeatured: boolean
  images: ProductImage[]
  category: Category | null
  priceTiers?: Array<{
    id: string
    minQuantity: number
    maxQuantity: number | null
    price: number
    sortOrder: number
  }>
}

interface ProductsSectionProps {
  products: Product[]
  industryName: string
}

export function ProductsSection({ products, industryName }: ProductsSectionProps) {
  if (!products?.length) return null

  return (
    <section id="products" className="scroll-mt-28 py-12 md:py-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Product Fit
          </p>
          <h2 className="mt-2 text-2xl md:text-3xl font-serif font-bold">
            Recommended Products
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Top PPE products for {industryName}
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full border bg-background/80 px-3 py-1 text-xs text-muted-foreground">
          <ShoppingBag className="h-4 w-4 text-primary" />
          {products.length} products
        </div>
      </div>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          Review the most requested equipment for this industry.
        </p>
        <Button variant="outline" asChild>
          <Link href="/products">View All Products</Link>
        </Button>
      </div>
      <div className="mt-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  )
}
