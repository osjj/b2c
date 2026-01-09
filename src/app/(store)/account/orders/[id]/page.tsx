import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { ArrowLeft, Package, Truck, CheckCircle, XCircle } from 'lucide-react'
import { getOrder } from '@/actions/orders'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { formatPrice, formatDate } from '@/lib/utils'
import { CancelOrderButton } from '@/components/store/cancel-order-button'

interface OrderDetailPageProps {
  params: Promise<{ id: string }>
}

const statusSteps = [
  { key: 'PENDING', label: 'Pending', icon: Package },
  { key: 'CONFIRMED', label: 'Confirmed', icon: CheckCircle },
  { key: 'PROCESSING', label: 'Processing', icon: Package },
  { key: 'SHIPPED', label: 'Shipped', icon: Truck },
  { key: 'DELIVERED', label: 'Delivered', icon: CheckCircle },
]

export default async function OrderDetailPage({ params }: OrderDetailPageProps) {
  const { id } = await params
  const order = await getOrder(id)

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
    <div>
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
