# Cart Page

## src/app/(store)/cart/page.tsx

```tsx
'use client'

import Link from 'next/link'
import { ShoppingBag, ArrowRight } from 'lucide-react'
import { useCart } from '@/hooks/use-cart'
import { CartItem } from '@/components/store/cart-item'
import { CartSummary } from '@/components/store/cart-summary'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

export default function CartPage() {
  const { items, isHydrated, totalItems } = useCart()

  if (!isHydrated) {
    return <CartPageSkeleton />
  }

  if (items.length === 0) {
    return (
      <div className="container py-16">
        <div className="max-w-md mx-auto text-center">
          <ShoppingBag className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">Your cart is empty</h1>
          <p className="text-muted-foreground mb-6">
            Looks like you haven't added anything to your cart yet.
          </p>
          <Button asChild>
            <Link href="/products">
              Continue Shopping
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container py-8">
      <h1 className="text-2xl font-bold mb-8">
        Shopping Cart ({totalItems} items)
      </h1>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg border divide-y">
            {items.map((item) => (
              <CartItem
                key={`${item.productId}-${item.variantId || ''}`}
                item={item}
              />
            ))}
          </div>
        </div>

        <div className="lg:col-span-1">
          <CartSummary />
        </div>
      </div>
    </div>
  )
}

function CartPageSkeleton() {
  return (
    <div className="container py-8">
      <Skeleton className="h-8 w-48 mb-8" />
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-4 p-4 border rounded-lg">
              <Skeleton className="w-24 h-24 rounded" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-8 w-32" />
              </div>
            </div>
          ))}
        </div>
        <div className="lg:col-span-1">
          <Skeleton className="h-64 rounded-lg" />
        </div>
      </div>
    </div>
  )
}
```

## Alternative: Server-Side Cart Page

If you prefer server-side rendering for the cart:

```tsx
// src/app/(store)/cart/page.tsx (Server Component)
import { getCart } from '@/actions/cart'
import { CartPageClient } from './cart-page-client'

export default async function CartPage() {
  const items = await getCart()
  return <CartPageClient initialItems={items} />
}
```

```tsx
// src/app/(store)/cart/cart-page-client.tsx
'use client'

import { useEffect } from 'react'
import { useCartStore, type CartItem } from '@/stores/cart'
// ... rest of the client component

interface CartPageClientProps {
  initialItems: CartItem[]
}

export function CartPageClient({ initialItems }: CartPageClientProps) {
  const setCart = useCartStore((state) => state.setCart)

  // Sync server cart to client on mount
  useEffect(() => {
    setCart(initialItems)
  }, [initialItems, setCart])

  // ... rest of the component
}
```
