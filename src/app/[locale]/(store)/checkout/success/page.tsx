import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { CheckCircle, Package, ArrowRight } from 'lucide-react'
import { getOrder } from '@/actions/orders'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { formatPrice, formatDate } from '@/lib/utils'
import { SaveGuestOrder } from '@/components/store/save-guest-order'
import { ClearCart } from '@/components/store/clear-cart'

interface SuccessPageProps {
  searchParams: Promise<{ orderId?: string }>
}

export default async function CheckoutSuccessPage({
  searchParams,
}: SuccessPageProps) {
  const params = await searchParams

  if (!params.orderId) {
    notFound()
  }

  const order = await getOrder(params.orderId)

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

  return (
    <div className="container py-12 max-w-3xl">
      {/* Clear cart from localStorage */}
      <ClearCart />

      {/* Save guest order to localStorage */}
      {!order.userId && (
        <SaveGuestOrder
          order={{
            orderId: order.id,
            orderNumber: order.orderNumber,
            email: order.email,
            total: Number(order.total),
            createdAt: order.createdAt.toISOString(),
          }}
        />
      )}

      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold">Order Confirmed!</h1>
        <p className="text-muted-foreground mt-2">
          Thank you for your order. We've sent a confirmation email to {order.email}
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Order #{order.orderNumber}
            </CardTitle>
            <Badge variant="secondary">{order.status}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Placed on {formatDate(order.createdAt)}
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Order Items */}
          <div>
            <h3 className="font-medium mb-3">Items</h3>
            <div className="space-y-3">
              {order.items.map((item) => (
                <div key={item.id} className="flex gap-3">
                  <div className="w-16 h-16 relative rounded overflow-hidden bg-gray-100 shrink-0">
                    {item.product.images[0] ? (
                      <Image
                        src={item.product.images[0].url}
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
                  <div className="flex-1">
                    <p className="font-medium">{item.name}</p>
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
          </div>

          <Separator />

          {/* Order Summary */}
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
            <div className="flex justify-between font-bold">
              <span>Total</span>
              <span>{formatPrice(Number(order.total))}</span>
            </div>
          </div>

          <Separator />

          {/* Shipping Address */}
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium mb-2">Shipping Address</h3>
              <div className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground">{shippingAddress.name}</p>
                <p>{shippingAddress.phone}</p>
                <p>
                  {shippingAddress.province} {shippingAddress.city}{' '}
                  {shippingAddress.district}
                </p>
                <p>{shippingAddress.street}</p>
              </div>
            </div>
            <div>
              <h3 className="font-medium mb-2">Contact</h3>
              <div className="text-sm text-muted-foreground">
                <p>{order.email}</p>
                {order.phone && <p>{order.phone}</p>}
              </div>
            </div>
          </div>

          {order.note && (
            <>
              <Separator />
              <div>
                <h3 className="font-medium mb-2">Order Note</h3>
                <p className="text-sm text-muted-foreground">{order.note}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Button asChild variant="outline">
          <Link href="/account/orders">
            View All Orders
          </Link>
        </Button>
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
