export interface ScrapedProduct {
  /** 商品标题 */
  name: string
  /** 商品描述/卖点 */
  description: string
  /** 最低价格 */
  price: number
  /** 划线价/原价 */
  comparePrice?: number
  /** 阶梯价列表 */
  priceTiers: ScrapedPriceTier[]
  /** SKU 变体列表 */
  variants: ScrapedVariant[]
  /** 规格参数 */
  specifications: Record<string, string>
  /** 主图 URL 列表（1688 CDN） */
  mainImages: string[]
  /** SKU 关联图片 */
  skuImages: string[]
  /** 详情图 URL 列表（1688 CDN） */
  detailImages: string[]
  /** 1688 原始链接 */
  sourceUrl: string
  /** 1688 offerId */
  offerId: string
}

export interface ScrapedPriceTier {
  minQuantity: number
  maxQuantity?: number
  price: number
}

export interface ScrapedVariant {
  name: string
  options: ScrapedVariantOption[]
}

export interface ScrapedVariantOption {
  value: string
  imageUrl?: string
  price?: number
}

export type ScraperErrorCode =
  | 'INVALID_URL'
  | 'ACCESS_BLOCKED'
  | 'PAGE_TIMEOUT'
  | 'PARSE_ERROR'
  | 'INCOMPLETE_DATA'

export interface ScraperResult {
  success: boolean
  data?: ScrapedProduct
  error?: {
    code: ScraperErrorCode
    message: string
  }
  warnings?: string[]
  duration: number
}
