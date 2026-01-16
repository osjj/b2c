'use client'

import { cn } from '@/lib/utils'
import { formatPrice } from '@/lib/utils'
import type { PriceTier } from '@/lib/pricing'

interface PriceTiersTableProps {
  tiers: PriceTier[]
  currentQuantity: number
  defaultPrice: number
}

export function PriceTiersTable({ tiers, currentQuantity, defaultPrice }: PriceTiersTableProps) {
  if (!tiers || tiers.length === 0) {
    return null
  }

  const sortedTiers = [...tiers].sort((a, b) => a.minQuantity - b.minQuantity)

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="grid grid-cols-3 text-sm font-medium bg-muted/50 px-4 py-2">
        <div>数量</div>
        <div>单价</div>
        <div className="text-right">节省</div>
      </div>
      <div className="divide-y">
        {sortedTiers.map((tier, index) => {
          const isActive =
            currentQuantity >= tier.minQuantity &&
            (tier.maxQuantity === null || currentQuantity <= tier.maxQuantity)
          const savings = Math.round((1 - tier.price / defaultPrice) * 100)
          const isLowest = index === sortedTiers.length - 1

          return (
            <div
              key={tier.id}
              className={cn(
                'grid grid-cols-3 px-4 py-3 text-sm transition-colors',
                isActive && 'bg-primary/5 font-medium'
              )}
            >
              <div>
                {tier.minQuantity}
                {tier.maxQuantity ? `-${tier.maxQuantity}` : '+'}件
              </div>
              <div className={cn(isActive && 'text-primary')}>
                {formatPrice(tier.price)}/件
              </div>
              <div className="text-right flex items-center justify-end gap-2">
                {savings > 0 ? (
                  <span className="text-green-600">{savings}%</span>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
                {isLowest && (
                  <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                    推荐
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
