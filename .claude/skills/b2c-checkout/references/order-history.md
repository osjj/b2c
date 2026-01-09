# Order History Pages

## src/app/(store)/account/orders/page.tsx

```tsx
import Link from 'next/link'
import Image from 'next/image'
import { Package, ChevronRight } from 'lucide-react'
import { getUserOrders } from '@/actions/orders'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatPrice, formatDate } from '@/lib/utils'

const statusColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  PENDING: 'secondary',
  CONFIRMED: 'default',
  PROCESSING: 'default',
  SHIPPED: 'default',
  DELIVERED: 'default',
  CANCELLED: 'destructive',
  REFUNDED: 'outline',
}

interface OrdersPageProps {
  searchParams: { page?: string }
}

export default async function OrdersPage({ searchParams }: OrdersPageProps) {
  const page = Number(searchParams.page) || 1
  const { orders, pagination } = await getUserOrders(page)

  if (orders.length === 0) {
    return (
      <div className="container py-12 max-w-3xl">
        <h1 className="text-2xl font-bold mb-8">My Orders</h1>
        <div className="text-center py-12">
          <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">You haven't placed any orders yet.</p>
          <Button asChild>
            <Link href="/products">Start Shopping</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container py-8 max-w-3xl">
      <h1 className="text-2xl font-bold mb-8">My Orders</h1>

      <div className="space-y-4">
        {orders.map((order) => (
          <Link key={order.id} href={`/account/orders/${order.id}`}>
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-medium">#{order.orderNumber}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(order.createdAt)}
                    </p>
                  </div>
                  <Badge variant={statusColors[order.status] || 'secondary'}>
                    {order.status}
                  </Badge>
                </div>

                <div className="flex items-center gap-2 mb-3">
                  {order.items.slice(0, 3).map((item) => (
                    <div
                      key={item.id}
                      className="w-12 h-12 relative rounded overflow-hidden bg-gray-100"
                    >
                      {item.product.images[0] ? (
                        <Image
                          src={item.product.images[0].url}
                          alt={item.name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs">
                          ?
                        </div>
                      )}
                    </div>
                  ))}
                  {order._count.items > 3 && (
                    <div className="w-12 h-12 rounded bg-gray-100 flex items-center justify-center text-sm text-muted-foreground">
                      +{order._count.items - 3}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {order._count.items} item{order._count.items > 1 ? 's' : ''}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="font-bold">
                      {formatPrice(Number(order.total))}
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-8">
          {Array.from({ length: pagination.totalPages }, (_, i) => (
            <Button
              key={i + 1}
              variant={page === i + 1 ? 'default' : 'outline'}
              size="sm"
              asChild
            >
              <Link href={`/account/orders?page=${i + 1}`}>{i + 1}</Link>
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}
```

## src/app/(store)/account/orders/[id]/page.tsx

```tsx
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { ArrowLeft, Package, Truck, CheckCircle, XCircle } from 'lucide-react'
import { getOrder, cancelOrder } from '@/actions/orders'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { formatPrice, formatDate } from '@/lib/utils'
import { CancelOrderButton } from '@/components/store/cancel-order-button'

interface OrderDetailPageProps {
  params: { id: string }
}

const statusSteps = [
  { key: 'PENDING', label: 'Pending', icon: Package },
  { key: 'CONFIRMED', label: 'Confirmed', icon: CheckCircle },
  { key: 'PROCESSING', label: 'Processing', icon: Package },
  { key: 'SHIPPED', label: 'Shipped', icon: Truck },
  { key: 'DELIVERED', label: 'Delivered', icon: CheckCircle },
]

export default async function OrderDetailPage({ params }: OrderDetailPageProps) {
  const order = await getOrder(params.id)

  if (!order) {
    notFound()
  }

  const shippingAddress = order.shippingAddress as {
    name: string
    phone: string
    province: string
    city: string
    district: string
    street: string
  }

  const currentStepIndex = statusSteps.findIndex((s) => s.key === order.status)
  const isCancelled = order.status === 'CANCELLED'
  const canCancel = ['PENDING', 'CONFIRMED'].includes(order.status)

  return (
    <div className="container py-8 max-w-3xl">
      <Link
        href="/account/orders"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Orders
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Order #{order.orderNumber}</h1>
          <p className="text-muted-foreground">
            Placed on {formatDate(order.createdAt)}
          </p>
        </div>
        <Badge
          variant={isCancelled ? 'destructive' : 'default'}
          className="text-sm"
        >
          {order.status}
        </Badge>
      </div>

      {/* Order Status Timeline */}
      {!isCancelled && (
        <Card className="mb-6">
          <CardContent className="py-6">
            <div className="flex justify-between">
              {statusSteps.map((step, index) => {
                const Icon = step.icon
                const isActive = index <= currentStepIndex
                const isCurrent = index === currentStepIndex

                return (
                  <div
                    key={step.key}
                    className="flex flex-col items-center flex-1"
                  >
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-gray-100 text-muted-foreground'
                      } ${isCurrent ? 'ring-4 ring-primary/20' : ''}`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <span
                      className={`text-xs mt-2 ${
                        isActive ? 'font-medium' : 'text-muted-foreground'
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cancelled Notice */}
      {isCancelled && (
        <Card className="mb-6 border-destructive">
          <CardContent className="py-4 flex items-center gap-3">
            <XCircle className="h-5 w-5 text-destructive" />
            <div>
              <p className="font-medium text-destructive">Order Cancelled</p>
              {order.cancelledAt && (
                <p className="text-sm text-muted-foreground">
                  Cancelled on {formatDate(order.cancelledAt)}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Order Items */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Order Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {order.items.map((item) => (
              <div key={item.id} className="flex gap-4">
                <div className="w-20 h-20 relative rounded overflow-hidden bg-gray-100 shrink-0">
                  {item.product.images[0] ? (
                    <Image
                      src={item.product.images[0].url}
                      alt={item.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      ?
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <Link
                    href={`/products/${item.product.slug}`}
                    className="font-medium hover:text-primary"
                  >
                    {item.name}
                  </Link>
                  {item.sku && (
                    <p className="text-sm text-muted-foreground">
                      SKU: {item.sku}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    {item.quantity} x {formatPrice(Number(item.price))}
                  </p>
                </div>
                <div className="font-medium">
                  {formatPrice(Number(item.total))}
                </div>
              </div>
            ))}
          </div>

          <Separator className="my-4" />

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatPrice(Number(order.subtotal))}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Shipping</span>
              <span>
                {Number(order.shippingFee) === 0 ? (
                  <span className="text-green-600">Free</span>
                ) : (
                  formatPrice(Number(order.shippingFee))
                )}
              </span>
            </div>
            {Number(order.discount) > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Discount</span>
                <span className="text-green-600">
                  -{formatPrice(Number(order.discount))}
                </span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between font-bold text-lg">
              <span>Total</span>
              <span>{formatPrice(Number(order.total))}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Shipping & Contact */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Shipping Address</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <p className="font-medium">{shippingAddress.name}</p>
            <p className="text-muted-foreground">{shippingAddress.phone}</p>
            <p className="text-muted-foreground mt-1">
              {shippingAddress.province} {shippingAddress.city}{' '}
              {shippingAddress.district}
            </p>
            <p className="text-muted-foreground">{shippingAddress.street}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <p>{order.email}</p>
            {order.phone && (
              <p className="text-muted-foreground">{order.phone}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Order Note */}
      {order.note && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">Order Note</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{order.note}</p>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      {canCancel && (
        <div className="flex justify-end">
          <CancelOrderButton orderId={order.id} />
        </div>
      )}
    </div>
  )
}
```

## src/components/store/cancel-order-button.tsx

```tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { cancelOrder } from '@/actions/orders'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'

interface CancelOrderButtonProps {
  orderId: string
}

export function CancelOrderButton({ orderId }: CancelOrderButtonProps) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  const handleCancel = () => {
    startTransition(async () => {
      const result = await cancelOrder(orderId)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Order cancelled successfully')
        router.refresh()
      }
      setOpen(false)
    })
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive">Cancel Order</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel Order?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to cancel this order? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep Order</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleCancel}
            disabled={pending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Cancel Order'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
```

## src/app/(store)/account/layout.tsx

```tsx
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { User, Package, MapPin, Settings } from 'lucide-react'

const accountLinks = [
  { href: '/account', label: 'Profile', icon: User },
  { href: '/account/orders', label: 'Orders', icon: Package },
  { href: '/account/addresses', label: 'Addresses', icon: MapPin },
  { href: '/account/settings', label: 'Settings', icon: Settings },
]

export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user) {
    redirect('/login?callbackUrl=/account')
  }

  return (
    <div className="container py-8">
      <div className="flex flex-col md:flex-row gap-8">
        <aside className="w-full md:w-64 shrink-0">
          <nav className="space-y-1">
            {accountLinks.map((link) => {
              const Icon = link.icon
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-muted transition-colors"
                >
                  <Icon className="h-5 w-5" />
                  {link.label}
                </Link>
              )
            })}
          </nav>
        </aside>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  )
}
```
