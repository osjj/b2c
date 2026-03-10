# Admin Order Actions

## src/actions/admin/orders.ts

```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-utils'
import { OrderStatus, PaymentStatus } from '@prisma/client'

// Get all orders with filters
export async function getAdminOrders({
  page = 1,
  limit = 20,
  search = '',
  status,
  paymentStatus,
  startDate,
  endDate,
}: {
  page?: number
  limit?: number
  search?: string
  status?: OrderStatus
  paymentStatus?: PaymentStatus
  startDate?: Date
  endDate?: Date
} = {}) {
  await requireAdmin()

  const where: any = {}

  if (search) {
    where.OR = [
      { orderNumber: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search } },
    ]
  }

  if (status) {
    where.status = status
  }

  if (paymentStatus) {
    where.paymentStatus = paymentStatus
  }

  if (startDate || endDate) {
    where.createdAt = {}
    if (startDate) where.createdAt.gte = startDate
    if (endDate) where.createdAt.lte = endDate
  }

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        user: { select: { name: true, email: true } },
        items: { take: 1 },
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
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }
}

// Get single order for admin
export async function getAdminOrder(id: string) {
  await requireAdmin()

  return prisma.order.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true, phone: true } },
      items: {
        include: {
          product: { include: { images: { take: 1 } } },
          variant: true,
        },
      },
    },
  })
}

// Update order status
export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus
) {
  await requireAdmin()

  const updateData: any = { status }

  // Set timestamp based on status
  switch (status) {
    case 'SHIPPED':
      updateData.shippedAt = new Date()
      break
    case 'DELIVERED':
      updateData.deliveredAt = new Date()
      break
    case 'CANCELLED':
      updateData.cancelledAt = new Date()
      // Restore stock
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { items: true },
      })
      if (order) {
        for (const item of order.items) {
          if (item.variantId) {
            await prisma.productVariant.update({
              where: { id: item.variantId },
              data: { stock: { increment: item.quantity } },
            })
          } else {
            await prisma.product.update({
              where: { id: item.productId },
              data: { stock: { increment: item.quantity } },
            })
          }
        }
      }
      break
  }

  await prisma.order.update({
    where: { id: orderId },
    data: updateData,
  })

  revalidatePath('/admin/orders')
  revalidatePath(`/admin/orders/${orderId}`)

  return { success: true }
}

// Update payment status
export async function updatePaymentStatus(
  orderId: string,
  paymentStatus: PaymentStatus
) {
  await requireAdmin()

  const updateData: any = { paymentStatus }

  if (paymentStatus === 'PAID') {
    updateData.paidAt = new Date()
    // Auto confirm order if pending
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { status: true },
    })
    if (order?.status === 'PENDING') {
      updateData.status = 'CONFIRMED'
    }
  }

  await prisma.order.update({
    where: { id: orderId },
    data: updateData,
  })

  revalidatePath('/admin/orders')
  revalidatePath(`/admin/orders/${orderId}`)

  return { success: true }
}

// Get order statistics
export async function getOrderStats() {
  await requireAdmin()

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1)
  const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
  const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0)

  const [
    totalOrders,
    todayOrders,
    thisMonthOrders,
    lastMonthOrders,
    pendingOrders,
    processingOrders,
    thisMonthRevenue,
    lastMonthRevenue,
  ] = await Promise.all([
    prisma.order.count(),
    prisma.order.count({ where: { createdAt: { gte: today } } }),
    prisma.order.count({ where: { createdAt: { gte: thisMonth } } }),
    prisma.order.count({
      where: { createdAt: { gte: lastMonth, lte: lastMonthEnd } },
    }),
    prisma.order.count({ where: { status: 'PENDING' } }),
    prisma.order.count({
      where: { status: { in: ['CONFIRMED', 'PROCESSING'] } },
    }),
    prisma.order.aggregate({
      where: {
        createdAt: { gte: thisMonth },
        paymentStatus: 'PAID',
      },
      _sum: { total: true },
    }),
    prisma.order.aggregate({
      where: {
        createdAt: { gte: lastMonth, lte: lastMonthEnd },
        paymentStatus: 'PAID',
      },
      _sum: { total: true },
    }),
  ])

  return {
    totalOrders,
    todayOrders,
    thisMonthOrders,
    lastMonthOrders,
    pendingOrders,
    processingOrders,
    thisMonthRevenue: Number(thisMonthRevenue._sum.total || 0),
    lastMonthRevenue: Number(lastMonthRevenue._sum.total || 0),
  }
}

// Get recent orders
export async function getRecentOrders(limit = 5) {
  await requireAdmin()

  return prisma.order.findMany({
    include: {
      user: { select: { name: true, email: true } },
      _count: { select: { items: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
}

// Get orders by status for chart
export async function getOrdersByStatus() {
  await requireAdmin()

  const statuses = await prisma.order.groupBy({
    by: ['status'],
    _count: { status: true },
  })

  return statuses.map((s) => ({
    status: s.status,
    count: s._count.status,
  }))
}

// Export orders (returns data for CSV)
export async function exportOrders(filters: {
  status?: OrderStatus
  startDate?: Date
  endDate?: Date
}) {
  await requireAdmin()

  const where: any = {}

  if (filters.status) where.status = filters.status
  if (filters.startDate || filters.endDate) {
    where.createdAt = {}
    if (filters.startDate) where.createdAt.gte = filters.startDate
    if (filters.endDate) where.createdAt.lte = filters.endDate
  }

  const orders = await prisma.order.findMany({
    where,
    include: {
      user: { select: { name: true, email: true } },
      items: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  return orders.map((order) => ({
    orderNumber: order.orderNumber,
    date: order.createdAt.toISOString(),
    customer: order.user?.name || order.email,
    email: order.email,
    status: order.status,
    paymentStatus: order.paymentStatus,
    items: order.items.length,
    subtotal: Number(order.subtotal),
    shipping: Number(order.shippingFee),
    discount: Number(order.discount),
    total: Number(order.total),
  }))
}
```
