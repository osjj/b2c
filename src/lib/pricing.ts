// src/lib/pricing.ts

export interface PriceTier {
  id: string
  minQuantity: number
  maxQuantity: number | null
  price: number
  sortOrder: number
}

/**
 * 根据数量计算阶梯单价
 */
export function calculateTierPrice(
  priceTiers: PriceTier[],
  quantity: number,
  defaultPrice: number
): number {
  if (!priceTiers || priceTiers.length === 0) {
    return defaultPrice
  }

  // 按 minQuantity 升序排列
  const sortedTiers = [...priceTiers].sort((a, b) => a.minQuantity - b.minQuantity)

  for (let i = sortedTiers.length - 1; i >= 0; i--) {
    const tier = sortedTiers[i]
    if (quantity >= tier.minQuantity) {
      if (tier.maxQuantity === null || quantity <= tier.maxQuantity) {
        return tier.price
      }
    }
  }

  return defaultPrice
}

/**
 * 获取下一阶梯提示信息
 */
export function getNextTierHint(
  priceTiers: PriceTier[],
  quantity: number,
  defaultPrice: number
): {
  hasNextTier: boolean
  quantityNeeded: number
  nextPrice: number
  savingsPercent: number
} | null {
  if (!priceTiers || priceTiers.length === 0) {
    return null
  }

  const sortedTiers = [...priceTiers].sort((a, b) => a.minQuantity - b.minQuantity)
  const currentPrice = calculateTierPrice(priceTiers, quantity, defaultPrice)

  // 找到下一个更优惠的阶梯
  for (const tier of sortedTiers) {
    if (tier.minQuantity > quantity && tier.price < currentPrice) {
      const quantityNeeded = tier.minQuantity - quantity
      const savingsPercent = Math.round((1 - tier.price / currentPrice) * 100)
      return {
        hasNextTier: true,
        quantityNeeded,
        nextPrice: tier.price,
        savingsPercent,
      }
    }
  }

  return null
}

/**
 * Get lowest tier price (for product card "From $XX" display)
 */
export function getLowestTierPrice(
  priceTiers: PriceTier[],
  defaultPrice: number
): number {
  if (!priceTiers || priceTiers.length === 0) {
    return defaultPrice
  }

  const prices = priceTiers.map((tier) => tier.price)
  return Math.min(...prices, defaultPrice)
}

/**
 * 验证阶梯价格配置是否有效
 */
export function validatePriceTiers(
  tiers: Array<{ minQuantity: number; maxQuantity: number | null; price: number }>
): { valid: boolean; error?: string } {
  if (tiers.length === 0) {
    return { valid: true }
  }

  if (tiers.length > 5) {
    return { valid: false, error: '最多只能设置5个阶梯' }
  }

  // 按 minQuantity 排序
  const sorted = [...tiers].sort((a, b) => a.minQuantity - b.minQuantity)

  // 检查第一个阶梯是否从1开始
  if (sorted[0].minQuantity !== 1) {
    return { valid: false, error: '第一个阶梯的起始数量必须为1' }
  }

  // 检查数量连续性和价格递减
  for (let i = 0; i < sorted.length; i++) {
    const tier = sorted[i]

    if (tier.minQuantity <= 0) {
      return { valid: false, error: '数量必须大于0' }
    }

    if (tier.price <= 0) {
      return { valid: false, error: '价格必须大于0' }
    }

    // 检查与下一个阶梯的连续性
    if (i < sorted.length - 1) {
      const nextTier = sorted[i + 1]

      if (tier.maxQuantity === null) {
        return { valid: false, error: '只有最后一个阶梯可以没有上限' }
      }

      if (nextTier.minQuantity !== tier.maxQuantity + 1) {
        return { valid: false, error: '阶梯数量范围必须连续' }
      }

      // 检查价格递减
      if (nextTier.price > tier.price) {
        return { valid: false, error: '数量越多，价格应该越低或持平' }
      }
    }
  }

  return { valid: true }
}
