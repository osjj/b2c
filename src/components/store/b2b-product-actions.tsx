'use client'

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Lightbulb } from 'lucide-react'
import { cn, formatPrice } from '@/lib/utils'
import { calculateTierPrice, getNextTierHint, type PriceTier } from '@/lib/pricing'
import { PriceTiersTable } from './price-tiers-table'
import { QuantitySelector } from './quantity-selector'
import { AddToQuoteButton } from './add-to-quote-button'

type ProductVariantOptionValue = string | number | boolean | null

export interface B2BProductVariant {
  id: string
  name: string
  sku: string
  price: number
  stock: number
  options: Record<string, ProductVariantOptionValue>
}

interface B2BProductActionsProps {
  productId: string
  productName: string
  productImage?: string
  sku?: string
  defaultPrice: number
  priceTiers: PriceTier[]
  variants?: B2BProductVariant[]
  children?: ReactNode
  className?: string
}

const OPTION_LABELS: Record<string, string> = {
  color: 'Color',
  size: 'Size',
  fit: 'Fit',
  style: 'Style',
  material: 'Material',
  weightRange: 'Fit weight',
}

const OPTION_KEY_ORDER = ['color', 'style', 'size', 'material', 'fit', 'weightRange']

function formatOptionKey(key: string) {
  return OPTION_LABELS[key] || key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function optionValueToString(value: ProductVariantOptionValue) {
  return value === null ? '' : String(value)
}

function getVariantSelection(
  variant: B2BProductVariant | undefined,
  optionKeys: string[]
) {
  if (!variant) return {}

  return optionKeys.reduce<Record<string, string>>((selection, key) => {
    const value = optionValueToString(variant.options[key] ?? null)
    if (value) {
      selection[key] = value
    }
    return selection
  }, {})
}

export function B2BProductActions({
  productId,
  productName,
  productImage,
  sku,
  defaultPrice,
  priceTiers,
  variants = [],
  children,
  className,
}: B2BProductActionsProps) {
  const variantOptions = useMemo(
    () => variants.filter((variant) => Object.keys(variant.options).length > 0),
    [variants]
  )
  const optionKeys = useMemo(() => {
    const keys = new Set<string>()
    variantOptions.forEach((variant) => {
      Object.entries(variant.options).forEach(([key, value]) => {
        if (optionValueToString(value).length > 0) {
          keys.add(key)
        }
      })
    })
    return Array.from(keys).sort((a, b) => {
      const aIndex = OPTION_KEY_ORDER.indexOf(a)
      const bIndex = OPTION_KEY_ORDER.indexOf(b)
      if (aIndex === -1 && bIndex === -1) {
        return a.localeCompare(b)
      }
      if (aIndex === -1) return 1
      if (bIndex === -1) return -1
      return aIndex - bIndex
    })
  }, [variantOptions])
  const hasVariants = variantOptions.length > 0 && optionKeys.length > 0
  const initialVariant = useMemo(
    () => variantOptions.find((variant) => variant.stock > 0) || variantOptions[0],
    [variantOptions]
  )
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({})
  const fallbackSelectedOptions = useMemo(
    () => getVariantSelection(initialVariant, optionKeys),
    [initialVariant, optionKeys]
  )
  const effectiveSelectedOptions = hasVariants
    && optionKeys.every((key) => selectedOptions[key])
    ? selectedOptions
    : fallbackSelectedOptions

  const optionValuesByKey = useMemo(() => {
    return optionKeys.map((key) => {
      const values = new Set<string>()
      variantOptions.forEach((variant) => {
        const value = optionValueToString(variant.options[key] ?? null)
        if (value) {
          values.add(value)
        }
      })
      return { key, values: Array.from(values) }
    })
  }, [optionKeys, variantOptions])

  const selectedVariant = useMemo(() => {
    if (!hasVariants) return undefined

    return variantOptions.find((variant) => (
      optionKeys.every((key) => (
        optionValueToString(variant.options[key] ?? null) === effectiveSelectedOptions[key]
      ))
    )) || initialVariant
  }, [effectiveSelectedOptions, hasVariants, initialVariant, optionKeys, variantOptions])

  const activeDefaultPrice = selectedVariant?.price ?? defaultPrice
  const activePriceTiers = useMemo(
    () => {
      const variantPriceOffset = activeDefaultPrice - defaultPrice
      return priceTiers.map((tier) => ({
        ...tier,
        // Variants have one base price, so apply their difference consistently
        // without discarding the product's volume-pricing discount structure.
        price: Math.max(0, tier.price + variantPriceOffset),
      }))
    },
    [activeDefaultPrice, defaultPrice, priceTiers]
  )
  const sortedPriceTiers = useMemo(
    () => [...activePriceTiers].sort((a, b) => a.minQuantity - b.minQuantity),
    [activePriceTiers]
  )
  const minimumQuantity = sortedPriceTiers[0]?.minQuantity ?? 1
  const [quantity, setQuantity] = useState(minimumQuantity)
  const selectedQuantity = Math.max(quantity, minimumQuantity)

  const currentPrice = calculateTierPrice(activePriceTiers, selectedQuantity, activeDefaultPrice)
  const subtotal = currentPrice * selectedQuantity
  const nextTierHint = getNextTierHint(activePriceTiers, selectedQuantity, activeDefaultPrice)

  const isOptionAvailable = (key: string, value: string) => (
    variantOptions.some((variant) => (
      optionKeys.every((optionKey) => {
        const variantValue = optionValueToString(variant.options[optionKey] ?? null)
        if (optionKey === key) {
          return variantValue === value
        }
        return !effectiveSelectedOptions[optionKey] || variantValue === effectiveSelectedOptions[optionKey]
      })
    ))
  )

  const handleOptionChange = (key: string, value: string) => {
    setSelectedOptions((currentSelection) => {
      const completeSelection = optionKeys.every((optionKey) => currentSelection[optionKey])
        ? currentSelection
        : fallbackSelectedOptions
      const nextSelection = { ...completeSelection, [key]: value }
      const hasExactVariant = variantOptions.some((variant) => (
        optionKeys.every((optionKey) => (
          optionValueToString(variant.options[optionKey] ?? null) === nextSelection[optionKey]
        ))
      ))

      if (hasExactVariant) {
        return nextSelection
      }

      const fallbackVariant = variantOptions.find((variant) => (
        optionValueToString(variant.options[key] ?? null) === value
      ))
      return getVariantSelection(fallbackVariant, optionKeys)
    })
  }

  const getCurrentTierLabel = () => {
    if (sortedPriceTiers.length === 0) return undefined
    for (const tier of sortedPriceTiers) {
      if (
        selectedQuantity >= tier.minQuantity
        && (tier.maxQuantity === null || selectedQuantity <= tier.maxQuantity)
      ) {
        return tier.maxQuantity === null
          ? `Tiered price for ${tier.minQuantity}+ units`
          : `Tiered price for ${tier.minQuantity}-${tier.maxQuantity} units`
      }
    }
    return undefined
  }

  const hasPanelHeader = Boolean(children)
  const panelRef = useRef<HTMLDivElement>(null)
  const [panelMaxHeight, setPanelMaxHeight] = useState<number | undefined>()

  useEffect(() => {
    if (!hasPanelHeader) return

    const mediaQuery = window.matchMedia('(min-width: 1024px)')
    let frameId = 0

    const updatePanelHeight = () => {
      if (!mediaQuery.matches || !panelRef.current) {
        setPanelMaxHeight(undefined)
        return
      }

      const panelTop = panelRef.current.getBoundingClientRect().top
      const viewportGap = 8
      setPanelMaxHeight(Math.max(0, Math.floor(window.innerHeight - panelTop - viewportGap)))
    }

    const scheduleUpdate = () => {
      if (frameId) return
      frameId = window.requestAnimationFrame(() => {
        frameId = 0
        updatePanelHeight()
      })
    }

    updatePanelHeight()
    window.addEventListener('resize', scheduleUpdate)
    window.addEventListener('scroll', scheduleUpdate, { passive: true })
    mediaQuery.addEventListener('change', scheduleUpdate)

    return () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId)
      }
      window.removeEventListener('resize', scheduleUpdate)
      window.removeEventListener('scroll', scheduleUpdate)
      mediaQuery.removeEventListener('change', scheduleUpdate)
    }
  }, [hasPanelHeader])

  return (
    <div
      ref={panelRef}
      style={hasPanelHeader && panelMaxHeight !== undefined ? { maxHeight: panelMaxHeight } : undefined}
      className={cn(
        hasPanelHeader ? 'lg:flex lg:max-h-[calc(100dvh-7rem)] lg:flex-col' : 'space-y-6',
        className
      )}
    >
      <div
        className={cn(
          'space-y-6',
          hasPanelHeader && 'lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pb-4 lg:pr-2 lg:[scrollbar-color:rgba(203,213,225,0.5)_transparent] lg:[scrollbar-width:thin] lg:[&::-webkit-scrollbar]:w-1 lg:[&::-webkit-scrollbar-thumb]:rounded-full lg:[&::-webkit-scrollbar-thumb]:bg-slate-300/40 lg:[&::-webkit-scrollbar-thumb:hover]:bg-slate-300/60 lg:[&::-webkit-scrollbar-track]:bg-transparent'
        )}
      >
        {children}

        {/* Tiered pricing table */}
        {priceTiers.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Bulk Pricing</p>
            <PriceTiersTable
              tiers={activePriceTiers}
              currentQuantity={selectedQuantity}
              defaultPrice={activeDefaultPrice}
            />
          </div>
        )}

        {hasVariants && (
          <div className="space-y-4">
            {optionValuesByKey.map(({ key, values }) => (
              <div key={key} className="space-y-2">
                <p className="text-sm font-medium">{formatOptionKey(key)}</p>
                <div className="flex flex-wrap gap-2">
                  {values.map((value) => {
                    const isSelected = effectiveSelectedOptions[key] === value
                    const isAvailable = isOptionAvailable(key, value)
                    return (
                      <button
                        key={value}
                        type="button"
                        aria-pressed={isSelected}
                        disabled={!isAvailable}
                        onClick={() => handleOptionChange(key, value)}
                        className={cn(
                          'min-h-11 rounded-md border px-3 py-2 text-sm font-medium transition-colors [-webkit-tap-highlight-color:transparent]',
                          isSelected
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border bg-background hover:border-primary/60 hover:bg-muted',
                          !isAvailable && 'cursor-not-allowed opacity-40 hover:border-border hover:bg-background'
                        )}
                      >
                        {value}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}

          </div>
        )}

        {/* Quantity selector */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Quantity</p>
          <QuantitySelector
            value={selectedQuantity}
            onChange={setQuantity}
            min={minimumQuantity}
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
      </div>

      {/* Add to quote button */}
      <div
        className={cn(
          hasPanelHeader && 'lg:sticky lg:bottom-0 lg:z-20 lg:shrink-0 lg:border-t lg:bg-background lg:pb-1 lg:pt-3 lg:shadow-[0_-14px_24px_-22px_rgba(15,23,42,0.7)]'
        )}
      >
        <AddToQuoteButton
          productId={productId}
          productName={selectedVariant ? `${productName} - ${selectedVariant.name}` : productName}
          productPrice={currentPrice}
          productImage={productImage}
          sku={selectedVariant?.sku ?? sku}
          variantId={selectedVariant?.id}
          quantity={selectedQuantity}
          tierLabel={getCurrentTierLabel()}
          size="lg"
          className="w-full"
        >
          Add to Quote
        </AddToQuoteButton>
      </div>
    </div>
  )
}
