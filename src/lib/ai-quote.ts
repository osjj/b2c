import type { ProductSearchResult } from './vector-search'
import type { AiQuoteSelection, QuoteItem } from '@/types/ai-quote'

export function buildQuoteItemsFromSelections(
  selections: AiQuoteSelection[],
  candidates: ProductSearchResult[]
): QuoteItem[] {
  const productMap = new Map(candidates.map((candidate) => [candidate.id, candidate]))
  const mergedSelections = new Map<string, AiQuoteSelection>()

  for (const selection of selections) {
    if (!productMap.has(selection.productId)) continue

    const quantity = Number.isFinite(selection.quantity)
      ? Math.max(1, Math.round(selection.quantity))
      : 1
    const existing = mergedSelections.get(selection.productId)

    mergedSelections.set(selection.productId, {
      productId: selection.productId,
      quantity: (existing?.quantity ?? 0) + quantity,
      reason: selection.reason || existing?.reason || 'AI Recommended',
    })
  }

  return [...mergedSelections.values()].map((selection) => {
    const product = productMap.get(selection.productId)!

    return {
      productId: product.id,
      name: product.name,
      sku: product.sku,
      price: product.price,
      quantity: selection.quantity,
      reason: selection.reason,
      image: product.image,
    }
  })
}

export function calculateQuoteTotal(items: QuoteItem[]): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0)
}

export function buildQuoteSheetRows(items: QuoteItem[], date: string) {
  return [
    ['AI Quote Sheet'],
    [`Generated: ${date}`],
    [],
    ['Product', 'SKU', 'Unit Price (¥)', 'Qty', 'Subtotal (¥)', 'Reason'],
    ...items.map((item) => [
      item.name,
      item.sku ?? '-',
      item.price,
      item.quantity,
      item.price * item.quantity,
      item.reason,
    ]),
    [],
    ['', '', '', 'Total', calculateQuoteTotal(items)],
  ]
}

export function buildQuotePdfRows(items: QuoteItem[]) {
  return items.map((item) => [
    item.name,
    item.sku ?? '-',
    item.price.toFixed(2),
    String(item.quantity),
    (item.price * item.quantity).toFixed(2),
  ])
}
