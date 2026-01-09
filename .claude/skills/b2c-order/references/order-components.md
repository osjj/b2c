# Order Components

## src/components/admin/order-status-select.tsx

```tsx
'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { OrderStatus } from '@prisma/client'
import { updateOrderStatus } from '@/actions/admin/orders'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

const orderStatuses: { value: OrderStatus; label: string }[] = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'PROCESSING', label: 'Processing' },
  { value: 'SHIPPED', label: 'Shipped' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'REFUNDED', label: 'Refunded' },
]

interface OrderStatusSelectProps {
  orderId: string
  currentStatus: OrderStatus
}

export function OrderStatusSelect({
  orderId,
  currentStatus,
}: OrderStatusSelectProps) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  const handleChange = (value: OrderStatus) => {
    if (value === currentStatus) return

    startTransition(async () => {
      const result = await updateOrderStatus(orderId, value)
      if (result.success) {
        toast.success('Order status updated')
        router.refresh()
      } else {
        toast.error('Failed to update status')
      }
    })
  }

  return (
    <div className="relative">
      <Select
        value={currentStatus}
        onValueChange={handleChange}
        disabled={pending}
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {orderStatuses.map((status) => (
            <SelectItem key={status.value} value={status.value}>
              {status.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {pending && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50">
          <Loader2 className="h-4 w-4 animate-spin" />
        </div>
      )}
    </div>
  )
}
```

## src/components/admin/payment-status-select.tsx

```tsx
'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { PaymentStatus } from '@prisma/client'
import { updatePaymentStatus } from '@/actions/admin/orders'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

const paymentStatuses: { value: PaymentStatus; label: string }[] = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'PAID', label: 'Paid' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'REFUNDED', label: 'Refunded' },
]

interface PaymentStatusSelectProps {
  orderId: string
  currentStatus: PaymentStatus
}

export function PaymentStatusSelect({
  orderId,
  currentStatus,
}: PaymentStatusSelectProps) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  const handleChange = (value: PaymentStatus) => {
    if (value === currentStatus) return

    startTransition(async () => {
      const result = await updatePaymentStatus(orderId, value)
      if (result.success) {
        toast.success('Payment status updated')
        router.refresh()
      } else {
        toast.error('Failed to update payment status')
      }
    })
  }

  return (
    <div className="relative">
      <Select
        value={currentStatus}
        onValueChange={handleChange}
        disabled={pending}
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {paymentStatuses.map((status) => (
            <SelectItem key={status.value} value={status.value}>
              {status.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {pending && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50">
          <Loader2 className="h-4 w-4 animate-spin" />
        </div>
      )}
    </div>
  )
}
```

## src/components/admin/order-timeline.tsx

```tsx
import { Order } from '@prisma/client'
import {
  Clock,
  CheckCircle,
  Package,
  Truck,
  Home,
  XCircle,
  CreditCard,
} from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface OrderTimelineProps {
  order: Order
}

interface TimelineEvent {
  icon: React.ElementType
  label: string
  date: Date | null
  color: string
}

export function OrderTimeline({ order }: OrderTimelineProps) {
  const events: TimelineEvent[] = [
    {
      icon: Clock,
      label: 'Order Placed',
      date: order.createdAt,
      color: 'text-blue-500',
    },
  ]

  if (order.paidAt) {
    events.push({
      icon: CreditCard,
      label: 'Payment Received',
      date: order.paidAt,
      color: 'text-green-500',
    })
  }

  if (order.status === 'CONFIRMED' || order.shippedAt || order.deliveredAt) {
    events.push({
      icon: CheckCircle,
      label: 'Order Confirmed',
      date: order.paidAt || order.createdAt, // Approximate
      color: 'text-green-500',
    })
  }

  if (order.shippedAt) {
    events.push({
      icon: Truck,
      label: 'Order Shipped',
      date: order.shippedAt,
      color: 'text-blue-500',
    })
  }

  if (order.deliveredAt) {
    events.push({
      icon: Home,
      label: 'Order Delivered',
      date: order.deliveredAt,
      color: 'text-green-500',
    })
  }

  if (order.cancelledAt) {
    events.push({
      icon: XCircle,
      label: 'Order Cancelled',
      date: order.cancelledAt,
      color: 'text-red-500',
    })
  }

  return (
    <div className="space-y-4">
      {events.map((event, index) => {
        const Icon = event.icon
        const isLast = index === events.length - 1

        return (
          <div key={index} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center bg-gray-100 ${event.color}`}
              >
                <Icon className="h-4 w-4" />
              </div>
              {!isLast && <div className="w-0.5 h-full bg-gray-200 my-1" />}
            </div>
            <div className="pb-4">
              <p className="font-medium">{event.label}</p>
              {event.date && (
                <p className="text-sm text-muted-foreground">
                  {formatDate(event.date)}
                </p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
```

## src/components/admin/order-filters.tsx

```tsx
'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { OrderStatus, PaymentStatus } from '@prisma/client'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'

interface OrderFiltersProps {
  currentStatus?: OrderStatus
  currentPaymentStatus?: PaymentStatus
}

export function OrderFilters({
  currentStatus,
  currentPaymentStatus,
}: OrderFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const updateFilter = (key: string, value: string | undefined) => {
    const params = new URLSearchParams(searchParams)
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    params.delete('page')
    router.push(`${pathname}?${params.toString()}`)
  }

  const clearFilters = () => {
    router.push(pathname)
  }

  const hasFilters = currentStatus || currentPaymentStatus

  return (
    <div className="flex items-center gap-2">
      <Select
        value={currentStatus || ''}
        onValueChange={(value) => updateFilter('status', value || undefined)}
      >
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Order Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">All Statuses</SelectItem>
          <SelectItem value="PENDING">Pending</SelectItem>
          <SelectItem value="CONFIRMED">Confirmed</SelectItem>
          <SelectItem value="PROCESSING">Processing</SelectItem>
          <SelectItem value="SHIPPED">Shipped</SelectItem>
          <SelectItem value="DELIVERED">Delivered</SelectItem>
          <SelectItem value="CANCELLED">Cancelled</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={currentPaymentStatus || ''}
        onValueChange={(value) => updateFilter('paymentStatus', value || undefined)}
      >
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Payment Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">All Payments</SelectItem>
          <SelectItem value="PENDING">Pending</SelectItem>
          <SelectItem value="PAID">Paid</SelectItem>
          <SelectItem value="FAILED">Failed</SelectItem>
          <SelectItem value="REFUNDED">Refunded</SelectItem>
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters}>
          <X className="h-4 w-4 mr-1" />
          Clear
        </Button>
      )}
    </div>
  )
}
```
