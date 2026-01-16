'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Package, ArrowRight, Trash2, Search } from 'lucide-react'
import { useGuestOrdersStore, type GuestOrder } from '@/stores/guest-orders'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatPrice } from '@/lib/utils'

export default function GuestOrdersPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const defaultTab = searchParams.get('tab') === 'lookup' ? 'lookup' : 'history'

  const [orders, setOrders] = useState<GuestOrder[]>([])
  const [isHydrated, setIsHydrated] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [lookupOrderNumber, setLookupOrderNumber] = useState('')
  const [lookupError, setLookupError] = useState('')
  const [isLookingUp, setIsLookingUp] = useState(false)

  const storeOrders = useGuestOrdersStore((state) => state.orders)
  const removeOrder = useGuestOrdersStore((state) => state.removeOrder)

  useEffect(() => {
    setIsHydrated(true)
    setOrders(storeOrders)
  }, [storeOrders])

  // Filter orders based on search query
  const filteredOrders = useMemo(() => {
    if (!searchQuery.trim()) return orders
    const query = searchQuery.toLowerCase()
    return orders.filter(
      (order) =>
        order.orderNumber.toLowerCase().includes(query) ||
        order.email.toLowerCase().includes(query)
    )
  }, [orders, searchQuery])

  // Lookup order by order number
  const handleLookupOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!lookupOrderNumber.trim()) return

    setIsLookingUp(true)
    setLookupError('')

    try {
      const response = await fetch(`/api/orders/lookup?orderNumber=${encodeURIComponent(lookupOrderNumber.trim())}`)
      const data = await response.json()

      if (data.orderId) {
        router.push(`/checkout/success?orderId=${data.orderId}`)
      } else {
        setLookupError('Order not found. Please check the order number and try again.')
      }
    } catch {
      setLookupError('Failed to lookup order. Please try again.')
    } finally {
      setIsLookingUp(false)
    }
  }

  if (!isHydrated) {
    return (
      <div className="container py-12 max-w-3xl">
        <h1 className="text-2xl font-bold mb-8">My Orders</h1>
        <div className="text-center py-12 text-muted-foreground">
          Loading...
        </div>
      </div>
    )
  }

  return (
    <div className="container py-12 max-w-3xl">
      <h1 className="text-2xl font-bold mb-8">My Orders</h1>

      <Tabs defaultValue={defaultTab} className="mb-8">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="history">Order History</TabsTrigger>
          <TabsTrigger value="lookup">Lookup Order</TabsTrigger>
        </TabsList>

        <TabsContent value="history" className="mt-6">
          {/* Search bar for saved orders */}
          {orders.length > 0 && (
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by order number or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          )}

          {orders.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Package className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">No orders found</p>
                <Button asChild>
                  <Link href="/products">
                    Start Shopping
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : filteredOrders.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Search className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No orders match your search</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredOrders.map((order) => (
                <Card key={order.orderId}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        Order #{order.orderNumber}
                      </CardTitle>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => removeOrder(order.orderId)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1 text-sm">
                        <p className="text-muted-foreground">
                          {new Date(order.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </p>
                        <p className="text-muted-foreground">{order.email}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <p className="font-bold">{formatPrice(order.total)}</p>
                        <Button asChild size="sm">
                          <Link href={`/checkout/success?orderId=${order.orderId}`}>
                            View Details
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              <p className="text-xs text-center text-muted-foreground mt-6">
                Orders are stored locally in your browser. They will be lost if you clear your browser data.
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="lookup" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Lookup Order by Order Number</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLookupOrder} className="space-y-4">
                <div className="space-y-2">
                  <Input
                    placeholder="Enter order number (e.g., ORD-XXXXX-XXXX)"
                    value={lookupOrderNumber}
                    onChange={(e) => {
                      setLookupOrderNumber(e.target.value)
                      setLookupError('')
                    }}
                  />
                  {lookupError && (
                    <p className="text-sm text-destructive">{lookupError}</p>
                  )}
                </div>
                <Button type="submit" disabled={isLookingUp || !lookupOrderNumber.trim()}>
                  {isLookingUp ? 'Looking up...' : 'Find Order'}
                </Button>
              </form>
              <p className="text-xs text-muted-foreground mt-4">
                Enter your order number to view order details. You can find your order number in your confirmation email.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
