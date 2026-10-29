import { z } from 'zod'
import { usdToCnyRateSchema } from './schemas'

const currencySnapshotSchema = z.object({
  quotationCurrency: z.object({ usdToCnyRate: usdToCnyRateSchema }),
})

/** Read internal quotation metadata, including legacy snapshots without a saved rate. */
export function readQuotationCurrencyRate(snapshot: unknown): string | null {
  const result = currencySnapshotSchema.safeParse(snapshot)
  return result.success ? result.data.quotationCurrency.usdToCnyRate : null
}

/** Omitted input preserves a saved rate; explicit null removes it. */
export function quotationCurrencyMetadata(rate: string | null | undefined, previousSnapshot?: unknown) {
  const nextRate = rate === undefined ? readQuotationCurrencyRate(previousSnapshot) : rate
  return nextRate === null
    ? {}
    : { quotationCurrency: { usdToCnyRate: usdToCnyRateSchema.parse(nextRate) } }
}
