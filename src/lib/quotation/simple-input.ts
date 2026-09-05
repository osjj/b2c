import { z } from 'zod'
import { createSalesQuotationInputSchema, currencySchema, quotationItemInputSchema } from './schemas'
import type { WorkbenchSettings } from './workbench-config'
import { quotationCurrencyMinorUnit } from './workbench-config'

export const simpleImageSchema = z.object({ id: z.string(), kind: z.enum(['source', 'asset']), name: z.string().max(240) })
export const simpleLineSchema = z.object({
  id: z.string().cuid().optional(),
  quotationProductId: z.string().cuid().nullable().optional(),
  name: z.string().trim().min(1, '请输入产品名称').max(500),
  description: z.string().max(30000),
  quantity: quotationItemInputSchema.shape.quantity,
  unit: z.string().trim().min(1).max(40),
  unitPrice: quotationItemInputSchema.shape.unitPrice,
  images: z.array(simpleImageSchema).max(8),
})
export const simpleQuotationSchema = z.object({
  customerId: z.string().cuid().optional(),
  customerName: z.string().trim().min(1, '请输入客户名称').max(240),
  quotationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((date) => { const parsed = new Date(date); return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date }, '请选择有效的报价日期'),
  currency: currencySchema,
  terms: z.string().max(4000),
  internalNotes: z.string().max(10000),
  shippingFee: quotationItemInputSchema.shape.unitPrice,
  discountAmount: quotationItemInputSchema.shape.unitPrice,
  otherFee: quotationItemInputSchema.shape.unitPrice,
  items: z.array(simpleLineSchema).min(1).max(100),
})
export type SimpleQuotation = z.infer<typeof simpleQuotationSchema>
export type SimpleLine = z.infer<typeof simpleLineSchema>
export type SimpleImage = z.infer<typeof simpleImageSchema>
export const commonProductSchema = simpleLineSchema.omit({ quantity: true, images: true, quotationProductId: true }).extend({
  currency: currencySchema,
  active: z.boolean(),
  expectedUpdatedAt: z.string().datetime().optional(),
})
export type CommonProductInput = z.infer<typeof commonProductSchema>
export type CommonProductOption = CommonProductInput & { id: string; images: SimpleImage[] }

export function blankLine(): SimpleLine { return { name: '', description: '', quantity: '1', unit: 'pcs', unitPrice: '0', images: [] } }
export function blankQuotation(settings: WorkbenchSettings): SimpleQuotation {
  return { customerName: '', quotationDate: new Date().toISOString().slice(0, 10), currency: settings.currency, terms: settings.defaultTerms, internalNotes: '', shippingFee: '0', discountAmount: '0', otherFee: '0', items: [blankLine()] }
}
export function toQuotationInput(value: SimpleQuotation) {
  const data = simpleQuotationSchema.parse(value)
  return createSalesQuotationInputSchema.parse({
    customerId: data.customerId, customerName: data.customerName, quotationDate: data.quotationDate,
    currency: data.currency, currencyMinorUnit: quotationCurrencyMinorUnit(data.currency),
    publicTerms: { Terms: data.terms }, internalNotes: data.internalNotes,
    shippingFee: data.shippingFee, discountAmount: data.discountAmount, otherFee: data.otherFee,
    items: data.items.map((item, index) => ({
      id: item.id, quotationProductId: item.quotationProductId, sortOrder: index, nameEn: item.name,
      specifications: item.description.split(/\r?\n/).map((line) => line.trim()).filter(Boolean),
      quantity: item.quantity, unit: item.unit, unitPrice: item.unitPrice,
      imageSourceIds: item.images.filter((image) => image.kind === 'source').map((image) => image.id),
      imageAssetIds: item.images.filter((image) => image.kind === 'asset').map((image) => image.id),
    })),
  })
}

// BigInt fixed-point arithmetic mirrors the simple HALF_UP line rounding used by the server.
export function simpleTotals(value: SimpleQuotation): { lines: string[]; total: string } | null {
  try {
    const scale = quotationCurrencyMinorUnit(value.currency)
    const factor = BigInt(10) ** BigInt(scale)
    const decimal = (text: string) => {
      if (!/^\d{1,14}(?:\.\d{1,6})?$/.test(text)) throw new Error('Invalid number')
      const [whole, fraction = ''] = text.split('.')
      return { amount: BigInt(whole + fraction), factor: BigInt(10) ** BigInt(fraction.length) }
    }
    const rounded = (amount: bigint, denominator: bigint) => (amount * factor * BigInt(2) + denominator) / (denominator * BigInt(2))
    const fee = (text: string) => { const n = decimal(text); return rounded(n.amount, n.factor) }
    const lines = value.items.map((line) => { const qty = decimal(line.quantity); const price = decimal(line.unitPrice); return rounded(qty.amount * price.amount, qty.factor * price.factor) })
    const subtotal = lines.reduce((sum, line) => sum + line, BigInt(0))
    const net = subtotal > fee(value.discountAmount) ? subtotal - fee(value.discountAmount) : BigInt(0)
    const format = (n: bigint) => scale ? `${n / factor}.${(n % factor).toString().padStart(scale, '0')}` : n.toString()
    return { lines: lines.map(format), total: format(net + fee(value.shippingFee) + fee(value.otherFee)) }
  } catch { return null }
}
