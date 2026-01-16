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
          ? `${tier.minQuantity}件及以上阶梯价`
          : `${tier.minQuantity}-${tier.maxQuantity}件阶梯价`
      }
    }
    return undefined
  }

  return (
    <div className="space-y-6">
      {/* 阶梯价格表 */}
      {priceTiers.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">批量价格</p>
          <PriceTiersTable
            tiers={priceTiers}
            currentQuantity={quantity}
            defaultPrice={defaultPrice}
          />
        </div>
      )}

      {/* 数量选择 */}
      <div className="space-y-2">
        <p className="text-sm font-medium">数量</p>
        <QuantitySelector
          value={quantity}
          onChange={setQuantity}
          min={1}
          max={stock}
        />
      </div>

      {/* 当前价格和小计 */}
      <div className="flex items-baseline justify-between py-3 border-t border-b">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">当前单价</p>
          <p className="text-xl font-bold text-primary">{formatPrice(currentPrice)}</p>
        </div>
        <div className="text-right space-y-1">
          <p className="text-sm text-muted-foreground">小计</p>
          <p className="text-xl font-bold">{formatPrice(subtotal)}</p>
        </div>
      </div>

      {/* 下一阶梯提示 */}
      {nextTierHint && (
        <div className="flex items-start gap-2 p-3 bg-amber-50 text-amber-800 rounded-lg text-sm">
          <Lightbulb className="h-5 w-5 shrink-0 mt-0.5" />
          <p>
            再加 <strong>{nextTierHint.quantityNeeded}</strong> 件即可享受{' '}
            <strong>{formatPrice(nextTierHint.nextPrice)}/件</strong> 的优惠价，
            节省 {nextTierHint.savingsPercent}%
          </p>
        </div>
      )}

      {/* 加入询价单按钮 */}
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
        加入询价单
      </AddToQuoteButton>
    </div>
  )
}
