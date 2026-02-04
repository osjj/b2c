import Link from 'next/link'
import { ShoppingBag, ArrowRight } from 'lucide-react'
import { ProductCard } from '@/components/store/product-card'
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
    <section id="products" className="scroll-mt-20">
      <div className="rounded-lg border bg-card">
        <div className="flex items-center justify-between px-4 py-2.5 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">Recommended Products</h2>
            <span className="text-xs text-muted-foreground">for {industryName}</span>
          </div>
          <Link
            href="/products"
            className="flex items-center gap-1 text-xs text-primary hover:underline"
          >
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="p-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
