# Order Server Actions

## src/actions/orders.ts

```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { z } from 'zod'
import { clearCart, getCart } from './cart'

const shippingAddressSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().min(1, 'Phone is required'),
  province: z.string().min(1, 'Province is required'),
  city: z.string().min(1, 'City is required'),
  district: z.string().min(1, 'District is required'),
  street: z.string().min(1, 'Street address is required'),
  zipCode: z.string().optional(),
})

const checkoutSchema = z.object({
  email: z.string().email('Invalid email'),
  phone: z.string().optional(),
  shippingAddress: shippingAddressSchema,
  note: z.string().optional(),
  saveAddress: z.boolean().optional(),
})

export type CheckoutState = {
  error?: string
  errors?: Record<string, string[]>
  orderId?: string
}

// Generate unique order number
function generateOrderNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `ORD-${timestamp}-${random}`
}

// Create order from checkout
export async function createOrder(
  prevState: CheckoutState,
  formData: FormData
): Promise<CheckoutState> {
  const session = await auth()
  const userId = session?.user?.id

  // Get cart items
  const cartItems = await getCart()
  if (cartItems.length === 0) {
    return { error: 'Your cart is empty' }
  }

  // Parse form data
  const rawData = {
    email: formData.get('email'),
    phone: formData.get('phone') || '',
    shippingAddress: {
      name: formData.get('shippingName'),
      phone: formData.get('shippingPhone'),
      province: formData.get('province'),
      city: formData.get('city'),
      district: formData.get('district'),
      street: formData.get('street'),
      zipCode: formData.get('zipCode') || '',
    },
    note: formData.get('note') || '',
    saveAddress: formData.get('saveAddress') === 'true',
  }

  const result = checkoutSchema.safeParse(rawData)
  if (!result.success) {
    return { errors: result.error.flatten().fieldErrors }
  }

  const { email, phone, shippingAddress, note, saveAddress } = result.data

  // Calculate totals
  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  )
  const shippingFee = subtotal >= 100 ? 0 : 10
  const discount = 0
  const total = subtotal + shippingFee - discount

  // Verify stock availability
  for (const item of cartItems) {
    const product = await prisma.product.findUnique({
      where: { id: item.productId },
      select: { stock: true, name: true },
    })

    if (!product || product.stock < item.quantity) {
      return {
        error: `Insufficient stock for ${item.name}. Available: ${product?.stock || 0}`,
      }
    }
  }

  try {
    // Create order in transaction
    const order = await prisma.$transaction(async (tx) => {
      // Create order
      const newOrder = await tx.order.create({
        data: {
          orderNumber: generateOrderNumber(),
          userId,
          email,
          phone,
          status: 'PENDING',
          paymentStatus: 'PENDING',
          subtotal,
          shippingFee,
          discount,
          total,
          note,
          shippingAddress,
          items: {
            create: cartItems.map((item) => ({
              productId: item.productId,
              variantId: item.variantId || null,
              name: item.name,
              sku: '',
              price: item.price,
              quantity: item.quantity,
              total: item.price * item.quantity,
            })),
          },
        },
      })

      // Update product stock
      for (const item of cartItems) {
        if (item.variantId) {
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { stock: { decrement: item.quantity } },
          })
        } else {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { decrement: item.quantity } },
          })
        }
      }

      // Save address if requested
      if (saveAddress && userId) {
        await tx.address.create({
          data: {
            userId,
            ...shippingAddress,
            isDefault: false,
          },
        })
      }

      return newOrder
    })

    // Clear cart
    await clearCart()

    revalidatePath('/account/orders')
    redirect(`/checkout/success?orderId=${order.id}`)
  } catch (error) {
    console.error('Create order error:', error)
    return { error: 'Failed to create order. Please try again.' }
  }
}

// Get order by ID
export async function getOrder(orderId: string) {
  const session = await auth()

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          product: {
            include: { images: { take: 1 } },
          },
        },
      },
    },
  })

  if (!order) return null

  // Check access: owner or admin
  if (order.userId !== session?.user?.id && session?.user?.role !== 'ADMIN') {
    return null
  }

  return order
}

// Get order by order number
export async function getOrderByNumber(orderNumber: string) {
  return prisma.order.findUnique({
    where: { orderNumber },
    include: {
      items: {
        include: {
          product: { include: { images: { take: 1 } } },
        },
      },
    },
  })
}

// Get user orders
export async function getUserOrders(page = 1, limit = 10) {
  const session = await auth()
  if (!session?.user?.id) return { orders: [], pagination: { page: 1, totalPages: 1, total: 0 } }

  const where = { userId: session.user.id }

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        items: {
          include: {
            product: { include: { images: { take: 1 } } },
          },
          take: 3,
        },
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.order.count({ where }),
  ])

  return {
    orders,
    pagination: {
      page,
      totalPages: Math.ceil(total / limit),
      total,
    },
  }
}

// Cancel order
export async function cancelOrder(orderId: string) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: 'Unauthorized' }
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  })

  if (!order) {
    return { error: 'Order not found' }
  }

  if (order.userId !== session.user.id) {
    return { error: 'Unauthorized' }
  }

  if (!['PENDING', 'CONFIRMED'].includes(order.status)) {
    return { error: 'Order cannot be cancelled' }
  }

  await prisma.$transaction(async (tx) => {
    // Restore stock
    for (const item of order.items) {
      if (item.variantId) {
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: { stock: { increment: item.quantity } },
        })
      } else {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        })
      }
    }

    // Update order status
    await tx.order.update({
      where: { id: orderId },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
      },
    })
  })

  revalidatePath('/account/orders')
  revalidatePath(`/account/orders/${orderId}`)

  return { success: true }
}
```
