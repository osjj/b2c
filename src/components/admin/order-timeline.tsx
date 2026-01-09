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
