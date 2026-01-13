'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { updateQuoteStatus } from '@/actions/admin/quotes'
import { QuoteStatus } from '@prisma/client'

const statusOptions: { value: QuoteStatus; label: string }[] = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'PROCESSING', label: 'Processing' },
  { value: 'QUOTED', label: 'Quoted' },
  { value: 'ACCEPTED', label: 'Accepted' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'EXPIRED', label: 'Expired' },
]

interface QuoteStatusSelectProps {
  quoteId: string
  currentStatus: QuoteStatus
}

export function QuoteStatusSelect({ quoteId, currentStatus }: QuoteStatusSelectProps) {
  const [status, setStatus] = useState(currentStatus)
  const [isUpdating, setIsUpdating] = useState(false)

  const handleStatusChange = async (newStatus: QuoteStatus) => {
    setIsUpdating(true)
    try {
      await updateQuoteStatus(quoteId, newStatus)
      setStatus(newStatus)
    } catch (error) {
      console.error('Failed to update status:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      {isUpdating && <Loader2 className="h-4 w-4 animate-spin" />}
      <Select
        value={status}
        onValueChange={(value) => handleStatusChange(value as QuoteStatus)}
        disabled={isUpdating}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Update Status" />
        </SelectTrigger>
        <SelectContent>
          {statusOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
