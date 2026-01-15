'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ProductImage, Category } from '@prisma/client'
import { formatPrice } from '@/lib/utils'
import { AddToCartButton } from './add-to-cart-button'
import { AddToQuoteButton } from './add-to-quote-button'

type ProductWithRelations = {
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
}

interface ProductCardProps {
  product: ProductWithRelations
  index?: number
}

export function ProductCard({ product, index = 0 }: ProductCardProps) {
  const imageUrl = product.images[0]?.url || '/placeholder.jpg'
  const hasDiscount = product.comparePrice && Number(product.comparePrice) > Number(product.price)

  return (
    <div
      className="group animate-fade-up"
      style={{ animationDelay: `${0.05 + index * 0.05}s`, animationFillMode: 'both' }}
    >
      <Link href={`/products/${product.slug}`}>
        <div className="relative aspect-[3/4] overflow-hidden bg-white mb-4">
          <Image
            src={imageUrl}
            alt={product.name}
            fill
            className="object-contain transition-transform duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/5 transition-colors" />

          {/* Badges */}
          {product.isFeatured && (
            <span className="absolute top-4 left-4 bg-primary text-primary-foreground text-xs px-3 py-1 tracking-wider uppercase">
              Featured
            </span>
          )}

          {hasDiscount && (
            <span className="absolute top-4 right-4 bg-red-500 text-white text-xs px-3 py-1 tracking-wider uppercase">
              Sale
            </span>
          )}

          {product.stock === 0 && (
            <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
              <span className="text-sm font-medium">Out of Stock</span>
            </div>
          )}
        </div>
      </Link>

      <p className="text-xs text-muted-foreground tracking-wide mb-1">
        {product.category?.name || 'Uncategorized'}
      </p>
      <Link href={`/products/${product.slug}`}>
        <h3 className="font-serif text-lg mb-1 group-hover:text-primary transition-colors">
          {product.name}
        </h3>
      </Link>
      <div className="flex items-center gap-2 mb-3">
        <p className="text-sm font-medium">{formatPrice(Number(product.price))}</p>
        {hasDiscount && (
          <p className="text-sm text-muted-foreground line-through">
            {formatPrice(Number(product.comparePrice))}
          </p>
        )}
      </div>

      {product.stock > 0 && (
        <div className="flex gap-2">
          <AddToCartButton productId={product.id} variant="outline" size="sm" className="flex-1" />
          <AddToQuoteButton
            productId={product.id}
            productName={product.name}
            productPrice={Number(product.price)}
            productImage={imageUrl}
            variant="outline"
            size="sm"
            className="flex-1"
          />
        </div>
      )}
    </div>
  )
}
