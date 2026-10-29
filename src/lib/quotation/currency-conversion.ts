import { currencySchema, quotationItemInputSchema, usdToCnyRateSchema } from './schemas'
import type { SimpleQuotation } from './simple-input'

type LineMoney = Pick<SimpleQuotation['items'][number], 'unitPrice' | 'unitCost'>

export type CurrencyConversionBase = Pick<
  SimpleQuotation,
  'currency' | 'usdToCnyRate' | 'shippingFee' | 'discountAmount' | 'otherFee'
> & { items: LineMoney[] }

type Fraction = { numerator: bigint; denominator: bigint }

const MONEY_FACTOR = BigInt(1_000_000)
const ZERO = BigInt(0)
const ONE = BigInt(1)

function fraction(value: string): Fraction {
  const [whole, decimal = ''] = value.split('.')
  return { numerator: BigInt(whole + decimal), denominator: BigInt(10) ** BigInt(decimal.length) }
}

function money(value: string, label: string): string {
  const result = quotationItemInputSchema.shape.unitPrice.safeParse(value)
  if (!result.success) throw new Error(`${label}无效，请填写非负数，最多 12 位整数和 6 位小数`)
  return result.data
}

function rate(value: string): string {
  const result = usdToCnyRateSchema.safeParse(value)
  if (!result.success) throw new Error('请填写有效汇率：1 USD 对应的人民币金额必须大于 0，最多 10 位整数和 8 位小数')
  return result.data.includes('.') ? result.data.replace(/0+$/, '').replace(/\.$/, '') : result.data
}

function currency(value: string): string {
  const result = currencySchema.safeParse(value)
  if (!result.success) throw new Error('报价币种无效')
  return result.data
}

function supported(value: string): boolean {
  return value === 'USD' || value === 'CNY'
}

function transform(value: string, factor: Fraction, label: string): string {
  const input = money(value, label)
  // Returning the source text on identity also restores its entered precision on a round trip.
  if (factor.numerator === factor.denominator) return input
  const amount = fraction(input)
  const numerator = amount.numerator * factor.numerator * MONEY_FACTOR
  const denominator = amount.denominator * factor.denominator
  const rounded = (numerator * BigInt(2) + denominator) / (denominator * BigInt(2))
  const integer = rounded / MONEY_FACTOR
  const decimals = (rounded % MONEY_FACTOR).toString().padStart(6, '0').replace(/0+$/, '')
  const output = decimals ? `${integer}.${decimals}` : integer.toString()
  const parsed = quotationItemInputSchema.shape.unitPrice.safeParse(output)
  if (!parsed.success) throw new Error(`${label}换算后超出支持范围，请调整金额或汇率`)
  return parsed.data
}

function checkAmounts(value: CurrencyConversionBase): void {
  money(value.shippingFee, '运费')
  money(value.discountAmount, '折扣金额')
  money(value.otherFee, '其他费用')
  value.items.forEach((item, index) => {
    money(item.unitPrice, `产品 ${index + 1} 单价`)
    if (item.unitCost != null) money(item.unitCost, `产品 ${index + 1} 成本单价`)
  })
}

/** Capture entered money only; partially edited amounts are validated when conversion is requested. */
export function captureCurrencyConversionBase(value: SimpleQuotation): CurrencyConversionBase {
  return {
    currency: value.currency,
    usdToCnyRate: value.usdToCnyRate,
    shippingFee: value.shippingFee,
    discountAmount: value.discountAmount,
    otherFee: value.otherFee,
    items: value.items.map((item) => ({
      unitPrice: item.unitPrice,
      ...('unitCost' in item ? { unitCost: item.unitCost } : {}),
    })),
  }
}

/** Changes to text, quantities, image references or saved IDs do not invalidate the money basis. */
export function quotationMoneyFingerprint(value: SimpleQuotation): string {
  return JSON.stringify([
    value.currency, value.usdToCnyRate ?? null,
    value.shippingFee, value.discountAmount, value.otherFee,
    value.items.map((item) => [item.unitPrice, item.unitCost ?? null]),
  ])
}

/** Convert a reusable product default with the fixed convention 1 USD = rate CNY. */
export function convertCurrencyAmount(amount: string, fromCurrency: string, toCurrency: string, usdToCnyRate: string): string {
  const from = currency(fromCurrency)
  const to = currency(toCurrency)
  if (from === to) return money(amount, '金额')
  if (!supported(from) || !supported(to)) throw new Error('仅支持 USD 与人民币 CNY 之间自动换算，请手动填写此币种的金额')
  const parsedRate = fraction(rate(usdToCnyRate))
  return transform(amount, from === 'USD'
    ? parsedRate
    : { numerator: parsedRate.denominator, denominator: parsedRate.numerator }, '金额')
}

/** Revalue every money field from one stable source; never convert the rounded last display again. */
export function convertQuotationCurrency(
  value: SimpleQuotation,
  targetCurrency: string,
  usdToCnyRate: string,
  base: CurrencyConversionBase = captureCurrencyConversionBase(value),
): SimpleQuotation {
  const target = currency(targetCurrency)
  const source = currency(base.currency)
  if (!supported(source) || !supported(target)) throw new Error('仅支持 USD 与人民币 CNY 之间自动换算，请保留原币种或手动填写金额')
  if (base.items.length !== value.items.length) throw new Error('产品明细已变化，请重新确认当前金额后换算')
  checkAmounts(value)
  checkAmounts(base)
  const newRate = rate(usdToCnyRate)
  const targetRate = fraction(newRate)
  // A CNY source needs its original applied rate. Legacy CNY can use the first entered rate.
  const sourceRate = source === 'CNY' ? fraction(rate(base.usdToCnyRate ?? newRate)) : { numerator: ONE, denominator: ONE }
  const factor: Fraction = source === 'USD'
    ? target === 'USD' ? { numerator: ONE, denominator: ONE } : targetRate
    : target === 'USD'
      ? { numerator: sourceRate.denominator, denominator: sourceRate.numerator }
      : { numerator: targetRate.numerator * sourceRate.denominator, denominator: targetRate.denominator * sourceRate.numerator }
  if (factor.denominator === ZERO) throw new Error('汇率必须大于 0')
  const items = value.items.map((item, index) => {
    const sourceItem = base.items[index]
    const next = { ...item, unitPrice: transform(sourceItem.unitPrice, factor, `产品 ${index + 1} 单价`) }
    if ('unitCost' in sourceItem) {
      next.unitCost = sourceItem.unitCost == null ? sourceItem.unitCost : transform(sourceItem.unitCost, factor, `产品 ${index + 1} 成本单价`)
    } else {
      delete next.unitCost
    }
    return next
  })
  return {
    ...value,
    currency: target,
    usdToCnyRate: newRate,
    shippingFee: transform(base.shippingFee, factor, '运费'),
    discountAmount: transform(base.discountAmount, factor, '折扣金额'),
    otherFee: transform(base.otherFee, factor, '其他费用'),
    items,
  }
}
