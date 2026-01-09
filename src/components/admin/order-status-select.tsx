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
