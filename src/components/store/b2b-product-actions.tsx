'use client'

import { useState } from 'react'
import { Lightbulb } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import { calculateTierPrice, getNextTierHint, type PriceTier } from '@/lib/pricing'
import { PriceTiersTable } from './price-tiers-table'
import { QuantitySelector } from './quantity-selector'
import { AddToQuoteButton } from './add-to-quote-button'

interface B2BProductActionsProps {
  productId: string
  productName: string
  productImage?: string
  sku?: string
  defaultPrice: number
  priceTiers: PriceTier[]
  stock: number
}

export function B2BProductActions({
  productId,
  productName,
  productImage,
  sku,
  defaultPrice,
  priceTiers,
  stock,
}: B2BProductActionsProps) {
  const [quantity, setQuantity] = useState(1)

  const currentPrice = calculateTierPrice(priceTiers, quantity, defaultPrice)
  const subtotal = currentPrice * quantity
  const nextTierHint = getNextTierHint(priceTiers, quantity, defaultPrice)

  const getCurrentTierLabel = () => {
    if (!priceTiers || priceTiers.length === 0) return undefined
    const sortedTiers = [...priceTiers].sort((a, b) => a.minQuantity - b.minQuantity)
    for (const tier of sortedTiers) {
      if (quantity >= tier.minQuantity && (tier.maxQuantity === null || quantity <= tier.maxQuantity)) {
        return tier.maxQuantity === null
          ? `Tiered price for ${tier.minQuantity}+ units`
          : `Tiered price for ${tier.minQuantity}-${tier.maxQuantity} units`
      }
    }
    return undefined
  }

  return (
    <div className="space-y-6">
      {/* Tiered pricing table */}
      {priceTiers.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Bulk Pricing</p>
          <PriceTiersTable
            tiers={priceTiers}
            currentQuantity={quantity}
            defaultPrice={defaultPrice}
          />
        </div>
      )}

      {/* Quantity selector */}
      <div className="space-y-2">
        <p className="text-sm font-medium">Quantity</p>
        <QuantitySelector
          value={quantity}
          onChange={setQuantity}
          min={1}
          max={stock}
        />
      </div>

      {/* Current unit price and subtotal */}
      <div className="flex items-baseline justify-between py-3 border-t border-b">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Unit Price</p>
          <p className="text-xl font-bold text-primary">{formatPrice(currentPrice)}</p>
        </div>
        <div className="text-right space-y-1">
          <p className="text-sm text-muted-foreground">Subtotal</p>
          <p className="text-xl font-bold">{formatPrice(subtotal)}</p>
        </div>
      </div>

      {/* Next tier hint */}
      {nextTierHint && (
        <div className="flex items-start gap-2 p-3 bg-amber-50 text-amber-800 rounded-lg text-sm">
          <Lightbulb className="h-5 w-5 shrink-0 mt-0.5" />
          <p>
            Add <strong>{nextTierHint.quantityNeeded}</strong> more units to unlock{' '}
            <strong>{formatPrice(nextTierHint.nextPrice)}/unit</strong> and save{' '}
            {nextTierHint.savingsPercent}%
          </p>
        </div>
      )}

      {/* Add to quote button */}
      <AddToQuoteButton
        productId={productId}
        productName={productName}
        productPrice={currentPrice}
        productImage={productImage}
        sku={sku}
        quantity={quantity}
        tierLabel={getCurrentTierLabel()}
        size="lg"
        className="w-full"
      >
        Add to Quote
      </AddToQuoteButton>
    </div>
  )
}
