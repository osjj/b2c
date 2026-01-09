# Dashboard Statistics

## src/app/admin/page.tsx

```tsx
import Link from 'next/link'
import {
  DollarSign,
  ShoppingCart,
  Package,
  Users,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Clock,
} from 'lucide-react'
import { getOrderStats, getRecentOrders } from '@/actions/admin/orders'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatPrice, formatDate } from '@/lib/utils'
import { prisma } from '@/lib/prisma'

async function getProductStats() {
  const [total, lowStock, outOfStock] = await Promise.all([
    prisma.product.count({ where: { isActive: true } }),
    prisma.product.count({
      where: { isActive: true, stock: { lte: 5, gt: 0 } },
    }),
    prisma.product.count({ where: { isActive: true, stock: 0 } }),
  ])
  return { total, lowStock, outOfStock }
}

async function getCustomerStats() {
  const total = await prisma.user.count({ where: { role: 'CUSTOMER' } })
  const thisMonth = new Date()
  thisMonth.setDate(1)
  thisMonth.setHours(0, 0, 0, 0)
  const newThisMonth = await prisma.user.count({
    where: { role: 'CUSTOMER', createdAt: { gte: thisMonth } },
  })
  return { total, newThisMonth }
}

export default async function AdminDashboard() {
  const [orderStats, recentOrders, productStats, customerStats] =
    await Promise.all([
      getOrderStats(),
      getRecentOrders(5),
      getProductStats(),
      getCustomerStats(),
    ])

  const revenueChange =
    orderStats.lastMonthRevenue > 0
      ? ((orderStats.thisMonthRevenue - orderStats.lastMonthRevenue) /
          orderStats.lastMonthRevenue) *
        100
      : 0

  const orderChange =
    orderStats.lastMonthOrders > 0
      ? ((orderStats.thisMonthOrders - orderStats.lastMonthOrders) /
          orderStats.lastMonthOrders) *
        100
      : 0

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              This Month Revenue
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatPrice(orderStats.thisMonthRevenue)}
            </div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              {revenueChange >= 0 ? (
                <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
              )}
              <span className={revenueChange >= 0 ? 'text-green-500' : 'text-red-500'}>
                {revenueChange >= 0 ? '+' : ''}
                {revenueChange.toFixed(1)}%
              </span>
              <span className="ml-1">from last month</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Orders This Month
            </CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orderStats.thisMonthOrders}</div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              {orderChange >= 0 ? (
                <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
              )}
              <span className={orderChange >= 0 ? 'text-green-500' : 'text-red-500'}>
                {orderChange >= 0 ? '+' : ''}
                {orderChange.toFixed(1)}%
              </span>
              <span className="ml-1">from last month</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Products
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{productStats.total}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {productStats.lowStock > 0 && (
                <span className="text-yellow-600">
                  {productStats.lowStock} low stock
                </span>
              )}
              {productStats.lowStock > 0 && productStats.outOfStock > 0 && ' · '}
              {productStats.outOfStock > 0 && (
                <span className="text-red-500">
                  {productStats.outOfStock} out of stock
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Customers
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customerStats.total}</div>
            <div className="text-xs text-muted-foreground mt-1">
              +{customerStats.newThisMonth} new this month
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Orders Alert */}
      {(orderStats.pendingOrders > 0 || orderStats.processingOrders > 0) && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-yellow-600" />
                <div>
                  <p className="font-medium text-yellow-800">
                    Orders Need Attention
                  </p>
                  <p className="text-sm text-yellow-600">
                    {orderStats.pendingOrders} pending
                    {orderStats.processingOrders > 0 &&
                      ` · ${orderStats.processingOrders} processing`}
                  </p>
                </div>
              </div>
              <Button asChild size="sm">
                <Link href="/admin/orders?status=PENDING">View Orders</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Orders */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Orders</CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/admin/orders">
              View All
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentOrders.map((order) => (
              <Link
                key={order.id}
                href={`/admin/orders/${order.id}`}
                className="flex items-center justify-between py-2 hover:bg-muted -mx-2 px-2 rounded-md transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div>
                    <p className="font-medium">{order.orderNumber}</p>
                    <p className="text-sm text-muted-foreground">
                      {order.user?.name || order.email}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-medium">
                      {formatPrice(Number(order.total))}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(order.createdAt)}
                    </p>
                  </div>
                  <Badge
                    variant={
                      order.status === 'PENDING'
                        ? 'secondary'
                        : order.status === 'CANCELLED'
                        ? 'destructive'
                        : 'default'
                    }
                  >
                    {order.status}
                  </Badge>
                </div>
              </Link>
            ))}

            {recentOrders.length === 0 && (
              <p className="text-center text-muted-foreground py-4">
                No orders yet
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
```

## Quick Stats Component (Reusable)

```tsx
// src/components/admin/stat-card.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, TrendingDown, LucideIcon } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  change?: number
  changeLabel?: string
  subtitle?: string
}

export function StatCard({
  title,
  value,
  icon: Icon,
  change,
  changeLabel = 'from last month',
  subtitle,
}: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change !== undefined && (
          <div className="flex items-center text-xs text-muted-foreground mt-1">
            {change >= 0 ? (
              <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
            ) : (
              <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
            )}
            <span className={change >= 0 ? 'text-green-500' : 'text-red-500'}>
              {change >= 0 ? '+' : ''}
              {change.toFixed(1)}%
            </span>
            <span className="ml-1">{changeLabel}</span>
          </div>
        )}
        {subtitle && (
          <div className="text-xs text-muted-foreground mt-1">{subtitle}</div>
        )}
      </CardContent>
    </Card>
  )
}
```
