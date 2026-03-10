# Core Files

Code templates for core library files, types, and stores.

## src/lib/prisma.ts

```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

## src/lib/utils.ts

```typescript
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(price: number | string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(Number(price))
}

export function generateOrderNumber() {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 8)
  return `ORD-${timestamp}-${random}`.toUpperCase()
}

export function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '')
}
```

## src/types/index.ts

```typescript
export interface User {
  id: string
  email: string
  name: string | null
  role: 'ADMIN' | 'CUSTOMER'
}

export interface Product {
  id: string
  name: string
  slug: string
  description: string | null
  sku: string
  price: number
  comparePrice: number | null
  quantity: number
  categoryId: string | null
  isActive: boolean
  isFeatured: boolean
  images: ProductImage[]
}

export interface ProductImage {
  id: string
  url: string
  alt: string | null
  sortOrder: number
}

export interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  image: string | null
  parentId: string | null
  isActive: boolean
}

export interface CartItem {
  id: string
  productId: string
  variantId: string | null
  quantity: number
  product: Product
}

export interface Order {
  id: string
  orderNumber: string
  status: OrderStatus
  paymentStatus: PaymentStatus
  subtotal: number
  shippingFee: number
  tax: number
  total: number
  items: OrderItem[]
  createdAt: Date
}

export interface OrderItem {
  id: string
  productId: string
  name: string
  sku: string
  price: number
  quantity: number
}

export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'

export type PaymentStatus =
  | 'PENDING'
  | 'PAID'
  | 'FAILED'
  | 'REFUNDED'
```

## src/stores/cart.ts

```typescript
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface CartItem {
  productId: string
  variantId?: string
  quantity: number
  name: string
  price: number
  image?: string
}

interface CartStore {
  items: CartItem[]
  addItem: (item: CartItem) => void
  removeItem: (productId: string, variantId?: string) => void
  updateQuantity: (productId: string, quantity: number, variantId?: string) => void
  clearCart: () => void
  getTotal: () => number
  getItemCount: () => number
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item) => {
        set((state) => {
          const existingIndex = state.items.findIndex(
            (i) => i.productId === item.productId && i.variantId === item.variantId
          )

          if (existingIndex > -1) {
            const newItems = [...state.items]
            newItems[existingIndex].quantity += item.quantity
            return { items: newItems }
          }

          return { items: [...state.items, item] }
        })
      },

      removeItem: (productId, variantId) => {
        set((state) => ({
          items: state.items.filter(
            (i) => !(i.productId === productId && i.variantId === variantId)
          ),
        }))
      },

      updateQuantity: (productId, quantity, variantId) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.productId === productId && item.variantId === variantId
              ? { ...item, quantity }
              : item
          ),
        }))
      },

      clearCart: () => set({ items: [] }),

      getTotal: () => {
        return get().items.reduce(
          (total, item) => total + item.price * item.quantity,
          0
        )
      },

      getItemCount: () => {
        return get().items.reduce((count, item) => count + item.quantity, 0)
      },
    }),
    {
      name: 'cart-storage',
    }
  )
)
```

## .env.example

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/b2c_shop"

# NextAuth
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```
