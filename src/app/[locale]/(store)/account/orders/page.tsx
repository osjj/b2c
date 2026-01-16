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
  searchParams: Promise<{ page?: string }>
}

export default async function OrdersPage({ searchParams }: OrdersPageProps) {
  const params = await searchParams
  const page = Number(params.page) || 1
  const { orders, pagination } = await getUserOrders(page)

  if (orders.length === 0) {
    return (
      <div>
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
    <div>
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
