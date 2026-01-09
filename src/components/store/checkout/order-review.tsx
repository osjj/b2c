'use client'

import Image from 'next/image'
import { type CartItem } from '@/stores/cart'
import { formatPrice } from '@/lib/utils'

interface OrderReviewProps {
  items: CartItem[]
}

export function OrderReview({ items }: OrderReviewProps) {
  return (
    <div className="space-y-3 max-h-64 overflow-y-auto">
      {items.map((item) => (
        <div
          key={`${item.productId}-${item.variantId || ''}`}
          className="flex gap-3"
        >
          <div className="w-16 h-16 relative rounded overflow-hidden bg-gray-100 shrink-0">
            {item.image ? (
              <Image
                src={item.image}
                alt={item.name}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                No img
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm line-clamp-2">{item.name}</p>
            <p className="text-sm text-muted-foreground">
              {item.quantity} x {formatPrice(item.price)}
            </p>
          </div>
          <div className="text-sm font-medium">
            {formatPrice(item.price * item.quantity)}
          </div>
        </div>
      ))}
    </div>
  )
}
