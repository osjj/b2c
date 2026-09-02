import { Prisma } from '@prisma/client'

import type { QuotationItemInput } from './schemas'
import { QuotationError } from './errors'

type RoundingMode = 'HALF_UP' | 'HALF_EVEN' | 'DOWN' | 'UP'

type DecimalRounding = 0 | 1 | 4 | 6

const ROUNDING_MODE: Record<RoundingMode, DecimalRounding> = {
  UP: 0,
  DOWN: 1,
  HALF_UP: 4,
  HALF_EVEN: 6,
}

export type QuotationMoneyInput = {
  items: QuotationItemInput[]
  currency: string
  currencyMinorUnit: number
  roundingMode: RoundingMode
  discountAmount: string
  discountPercent?: string | null
  shippingFee: string
  otherFee: string
  taxRate: string
  roundingAdjustment: string
}

export type CalculatedQuotationItem = QuotationItemInput & {
  lineTotal: string
  lineCost: string | null
}

export type CalculatedQuotationMoney = {
  items: CalculatedQuotationItem[]
  subtotal: string
  discountAmount: string
  shippingFee: string
  otherFee: string
  taxAmount: string
  roundingAdjustment: string
  total: string
  totalCost: string | null
  profit: string | null
  profitMarginPercent: string | null
}

function decimal(value: string): Prisma.Decimal {
  return new Prisma.Decimal(value)
}

function round(value: Prisma.Decimal, precision: number, mode: RoundingMode): Prisma.Decimal {
  return value.toDecimalPlaces(precision, ROUNDING_MODE[mode])
}

function fixed(value: Prisma.Decimal, precision: number): string {
  return value.toFixed(precision)
}

export function calculateQuotationMoney(input: QuotationMoneyInput): CalculatedQuotationMoney {
  const precision = input.currencyMinorUnit
  const items = input.items.map((item): CalculatedQuotationItem => {
    const gross = decimal(item.quantity).times(decimal(item.unitPrice))
    const lineDiscount = item.discountPercent
      ? gross.times(decimal(item.discountPercent)).dividedBy(100)
      : decimal(item.discountAmount)
    const lineTotal = round(Prisma.Decimal.max(gross.minus(lineDiscount), 0), precision, input.roundingMode)

    let lineCost: Prisma.Decimal | null = null
    if (item.unitCost && item.costCurrency === input.currency) {
      lineCost = round(decimal(item.quantity).times(decimal(item.unitCost)), precision, input.roundingMode)
    } else if (item.unitCost && item.exchangeRate) {
      lineCost = round(
        decimal(item.quantity).times(decimal(item.unitCost)).times(decimal(item.exchangeRate)),
        precision,
        input.roundingMode,
      )
    }

    return {
      ...item,
      lineTotal: fixed(lineTotal, precision),
      lineCost: lineCost ? fixed(lineCost, precision) : null,
    }
  })

  const subtotalRaw = items.reduce(
    (total, item) => total.plus(decimal(item.lineTotal)),
    decimal('0'),
  )
  const subtotal = round(subtotalRaw, precision, input.roundingMode)
  const discount = input.discountPercent
    ? subtotal.times(decimal(input.discountPercent)).dividedBy(100)
    : decimal(input.discountAmount)
  const boundedDiscount = round(Prisma.Decimal.min(Prisma.Decimal.max(discount, 0), subtotal), precision, input.roundingMode)
  const shipping = round(decimal(input.shippingFee), precision, input.roundingMode)
  const other = round(decimal(input.otherFee), precision, input.roundingMode)
  const taxable = Prisma.Decimal.max(subtotal.minus(boundedDiscount).plus(shipping).plus(other), 0)
  const tax = round(taxable.times(decimal(input.taxRate)).dividedBy(100), precision, input.roundingMode)
  const adjustment = round(decimal(input.roundingAdjustment), precision, input.roundingMode)
  const total = round(taxable.plus(tax).plus(adjustment), precision, input.roundingMode)
  if (total.isNegative()) {
    throw new QuotationError('VALIDATION_FAILED', 'Rounding adjustment cannot make the quotation total negative')
  }

  const hasCompleteCost = items.every((item) => item.lineCost !== null)
  const totalCost = hasCompleteCost
    ? round(items.reduce((sum, item) => sum.plus(decimal(item.lineCost ?? '0')), decimal('0')), precision, input.roundingMode)
    : null
  const profit = totalCost ? round(total.minus(totalCost), precision, input.roundingMode) : null
  const margin = profit && !total.isZero()
    ? profit.dividedBy(total).times(100).toDecimalPlaces(4, ROUNDING_MODE[input.roundingMode])
    : null

  return {
    items,
    subtotal: fixed(subtotal, precision),
    discountAmount: fixed(boundedDiscount, precision),
    shippingFee: fixed(shipping, precision),
    otherFee: fixed(other, precision),
    taxAmount: fixed(tax, precision),
    roundingAdjustment: fixed(adjustment, precision),
    total: fixed(total, precision),
    totalCost: totalCost ? fixed(totalCost, precision) : null,
    profit: profit ? fixed(profit, precision) : null,
    profitMarginPercent: margin ? margin.toFixed(4) : null,
  }
}
