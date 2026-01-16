import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { ArrowLeft, User, Mail, Phone, MapPin } from 'lucide-react'
import { getAdminOrder } from '@/actions/admin/orders'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { formatPrice, formatDate } from '@/lib/utils'
import { OrderStatusSelect } from '@/components/admin/order-status-select'
import { PaymentStatusSelect } from '@/components/admin/payment-status-select'
import { OrderTimeline } from '@/components/admin/order-timeline'

interface OrderDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function AdminOrderDetailPage({ params }: OrderDetailPageProps) {
  const { id } = await params
  const order = await getAdminOrder(id)

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
    zipCode?: string
  } | null

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/orders">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Order #{order.orderNumber}</h1>
          <p className="text-muted-foreground">
            Placed on {formatDate(order.createdAt)}
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Items */}
          <Card>
            <CardHeader>
              <CardTitle>Order Items ({order.items.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {order.items.map((item) => (
                  <div key={item.id} className="flex gap-4">
                    <div className="w-16 h-16 relative rounded overflow-hidden bg-gray-100 shrink-0">
                      {item.product.images[0] ? (
                        <Image
                          src={item.product.images[0].url}
                          alt={item.name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                          No img
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/admin/products/${item.productId}`}
                        className="font-medium hover:text-primary"
                      >
                        {item.name}
                      </Link>
                      {item.variant && (
                        <p className="text-sm text-muted-foreground">
                          Variant: {item.variant.name}
                        </p>
                      )}
                      {item.sku && (
                        <p className="text-sm text-muted-foreground">
                          SKU: {item.sku}
                        </p>
                      )}
                      <p className="text-sm">
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

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Order Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <OrderTimeline order={order} />
            </CardContent>
          </Card>

          {/* Order Note */}
          {order.note && (
            <Card>
              <CardHeader>
                <CardTitle>Customer Note</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{order.note}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Management */}
          <Card>
            <CardHeader>
              <CardTitle>Order Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Order Status</label>
                <OrderStatusSelect
                  orderId={order.id}
                  currentStatus={order.status}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Payment Status</label>
                <PaymentStatusSelect
                  orderId={order.id}
                  currentStatus={order.paymentStatus}
                />
              </div>
            </CardContent>
          </Card>

          {/* Customer Info */}
          <Card>
            <CardHeader>
              <CardTitle>Customer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>{order.user?.name || 'Guest'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{order.email}</span>
              </div>
              {order.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{order.phone}</span>
                </div>
              )}
              {order.user && (
                <Button variant="outline" size="sm" asChild className="w-full mt-2">
                  <Link href={`/admin/customers/${order.user.id}`}>
                    View Customer
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Shipping Address */}
          {shippingAddress && (
            <Card>
              <CardHeader>
                <CardTitle>Shipping Address</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium">{shippingAddress.name}</p>
                    <p className="text-muted-foreground">{shippingAddress.phone}</p>
                    <p className="text-muted-foreground mt-1">
                      {shippingAddress.province} {shippingAddress.city}{' '}
                      {shippingAddress.district}
                    </p>
                    <p className="text-muted-foreground">{shippingAddress.street}</p>
                    {shippingAddress.zipCode && (
                      <p className="text-muted-foreground">{shippingAddress.zipCode}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
