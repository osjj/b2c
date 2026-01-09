'use client'

import { Address } from '@prisma/client'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AddressSelectorProps {
  addresses: Address[]
  selectedId: string | null
  onSelect: (id: string) => void
}

export function AddressSelector({
  addresses,
  selectedId,
  onSelect,
}: AddressSelectorProps) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {addresses.map((address) => (
        <button
          key={address.id}
          type="button"
          onClick={() => onSelect(address.id)}
          className={cn(
            'relative text-left p-4 border rounded-lg transition-colors',
            selectedId === address.id
              ? 'border-primary bg-primary/5'
              : 'hover:border-gray-400'
          )}
        >
          {selectedId === address.id && (
            <div className="absolute top-2 right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
              <Check className="h-3 w-3 text-primary-foreground" />
            </div>
          )}
          <p className="font-medium">{address.name}</p>
          <p className="text-sm text-muted-foreground">{address.phone}</p>
          <p className="text-sm text-muted-foreground mt-1">
            {address.province} {address.city} {address.district}
          </p>
          <p className="text-sm text-muted-foreground line-clamp-1">
            {address.street}
          </p>
          {address.isDefault && (
            <span className="inline-block mt-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
              Default
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
