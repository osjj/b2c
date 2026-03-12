export interface QuoteItem {
  productId: string
  name: string
  sku: string | null
  price: number
  quantity: number
  reason: string
  image: string | null
}

export interface AiQuoteSelection {
  productId: string
  quantity: number
  reason: string
}

export interface AiQuoteResponse {
  success: boolean
  items?: QuoteItem[]
  error?: string
}
