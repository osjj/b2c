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
