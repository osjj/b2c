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
