'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ProductImage, Category } from '@prisma/client'
import { formatPrice } from '@/lib/utils'
import { getLowestTierPrice } from '@/lib/pricing'
import { AddToCartButton } from './add-to-cart-button'
import { AddToQuoteButton } from './add-to-quote-button'
import { ShieldCheck, Zap } from 'lucide-react'

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
  priceTiers?: Array<{
    id: string
    minQuantity: number
    maxQuantity: number | null
    price: number
    sortOrder: number
  }>
}

interface ProductCardProps {
  product: ProductWithRelations
  index?: number
}

export function ProductCard({ product, index = 0 }: ProductCardProps) {
  const imageUrl = product.images[0]?.url || '/placeholder.jpg'
  const hasDiscount = product.comparePrice && Number(product.comparePrice) > Number(product.price)
  const isB2B = process.env.NEXT_PUBLIC_PROJECT_TYPE === 'B2B'
  const displayPrice = isB2B && product.priceTiers && product.priceTiers.length > 0
    ? getLowestTierPrice(
        product.priceTiers.map(t => ({
          id: t.id,
          minQuantity: t.minQuantity,
          maxQuantity: t.maxQuantity,
          price: Number(t.price),
          sortOrder: t.sortOrder,
        })),
        Number(product.price)
      )
    : Number(product.price)
  const showFromPrice = isB2B && product.priceTiers && product.priceTiers.length > 0
  const discountPercent = hasDiscount
    ? Math.round((1 - Number(product.price) / Number(product.comparePrice)) * 100)
    : 0

  return (
    <div
      className="group animate-fade-up"
      style={{ animationDelay: `${0.02 + index * 0.03}s`, animationFillMode: 'both' }}
    >
      {/* Card Container */}
      <div className="relative bg-card rounded-lg border border-border/60 overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:border-primary/20">
        {/* Image Section */}
        <Link href={`/products/${product.slug}`}>
          <div className="relative aspect-square overflow-hidden bg-gradient-to-b from-secondary/30 to-secondary/60 p-4">
            <Image
              src={imageUrl}
              alt={product.name}
              fill
              className="object-contain transition-transform duration-500 group-hover:scale-105 drop-shadow-sm"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />

            {/* Hover Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-foreground/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            {/* Badges */}
            <div className="absolute top-3 left-3 flex flex-col gap-2">
              {product.isFeatured && (
                <span className="inline-flex items-center gap-1 bg-primary text-primary-foreground text-[10px] font-semibold px-2 py-1 rounded">
                  <Zap className="w-3 h-3" />
                  HOT
                </span>
              )}
              {hasDiscount && (
                <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded">
                  -{discountPercent}%
                </span>
              )}
            </div>

            {/* Stock Status */}
            {product.stock === 0 && (
              <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center">
                <span className="text-sm font-semibold text-muted-foreground">缺货</span>
              </div>
            )}

            {product.stock > 0 && product.stock <= 10 && (
              <span className="absolute bottom-3 right-3 bg-amber-500 text-white text-[10px] font-medium px-2 py-0.5 rounded">
                仅剩 {product.stock} 件
              </span>
            )}
          </div>
        </Link>

        {/* Content Section */}
        <div className="p-4">
          {/* Category */}
          <div className="flex items-center gap-1.5 mb-2">
            <ShieldCheck className="w-3 h-3 text-primary" />
            <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
              {product.category?.name || '未分类'}
            </span>
          </div>

          {/* Product Name */}
          <Link href={`/products/${product.slug}`}>
            <h3 className="font-semibold text-sm leading-tight mb-2 line-clamp-2 group-hover:text-primary transition-colors min-h-[2.5rem]">
              {product.name}
            </h3>
          </Link>

          {/* Price */}
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-lg font-bold text-accent">
              {showFromPrice && <span className="text-sm font-normal">From </span>}
              {formatPrice(displayPrice)}
            </span>
            {!showFromPrice && hasDiscount && (
              <span className="text-xs text-muted-foreground line-through">
                {formatPrice(Number(product.comparePrice))}
              </span>
            )}
          </div>

          {/* Actions */}
          {product.stock > 0 && (
            <div className="flex gap-2">
              {process.env.NEXT_PUBLIC_PROJECT_TYPE === 'B2B' ? (
                <AddToQuoteButton
                  productId={product.id}
                  productName={product.name}
                  productPrice={Number(product.price)}
                  productImage={imageUrl}
                  variant="default"
                  size="sm"
                  className="flex-1 text-xs h-8"
                />
              ) : (
                <AddToCartButton
                  productId={product.id}
                  variant="default"
                  size="sm"
                  className="flex-1 text-xs h-8"
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
