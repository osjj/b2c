'use client'

import type { ProductVariant } from '@prisma/client'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { ContentRenderer, type ContentBlock } from '@/components/store/content-renderer'
import { ProductImageGallery } from '@/components/store/product-image-gallery'
import { PriceTiersTable } from '@/components/store/price-tiers-table'
import { getTierPriceRange, type PriceTier } from '@/lib/pricing'
import { getStorefrontVisibleProductSpecifications, type ProductSpecification } from '@/lib/product-specification-visibility'
import { formatPrice } from '@/lib/utils'
import type { ImageData } from '@/types/image'
import type { EditorJSData } from './content-editor'

type PreviewVariant = Pick<ProductVariant, 'id' | 'name' | 'sku' | 'stock'> & { price: number }

export interface ProductPreviewData {
  name: string
  description: string
  categoryName?: string
  sku: string
  price: number | null
  comparePrice: number | null
  images: ImageData[]
  specifications: ProductSpecification[]
  content: Parameters<typeof ContentRenderer>[0]['content']
  priceTiers: PriceTier[]
  attributes: Array<{ name: string; value: string }>
  variants: PreviewVariant[]
}

interface ProductPreviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  product: ProductPreviewData | null
  onCloseAutoFocus: () => void
}

const INLINE_TAGS = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'S', 'STRIKE', 'MARK', 'BR', 'CODE', 'SUB', 'SUP', 'A'])
const OMITTED_TAGS = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'SVG', 'MATH', 'TEMPLATE'])

// The storefront renderer accepts HTML. Sanitize only the preview copy, keeping
// the editor's original data intact while showing its supported inline styles.
function sanitizeInline(value: unknown): string {
  if (typeof value !== 'string') return ''
  const parsed = new DOMParser().parseFromString(value, 'text/html')
  const result = document.createElement('div')
  const copyChildren = (source: Node, destination: Node) => {
    for (const child of source.childNodes) {
      if (child.nodeType === Node.TEXT_NODE) {
        destination.appendChild(document.createTextNode(child.textContent ?? ''))
      } else if (child instanceof Element && !OMITTED_TAGS.has(child.tagName)) {
        if (!INLINE_TAGS.has(child.tagName)) {
          copyChildren(child, destination)
          continue
        }
        const safeElement = document.createElement(child.tagName.toLowerCase())
        if (child.tagName === 'A') {
          const href = child.getAttribute('href')
          if (href) {
            try {
              const url = new URL(href, window.location.href)
              if (['http:', 'https:', 'mailto:', 'tel:'].includes(url.protocol)) {
                safeElement.setAttribute('href', href)
                safeElement.setAttribute('rel', 'noopener noreferrer')
              }
            } catch {
              // Invalid draft links remain visible as text.
            }
          }
        }
        copyChildren(child, safeElement)
        destination.appendChild(safeElement)
      }
    }
  }
  copyChildren(parsed.body, result)
  return result.innerHTML
}

interface PreviewListItem {
  content: string
  items: PreviewListItem[]
}

function sanitizeListItems(value: unknown, depth = 0): PreviewListItem[] {
  if (!Array.isArray(value) || depth > 20) return []
  return value.map((item: unknown) => {
    if (typeof item === 'string') return { content: sanitizeInline(item), items: [] }
    if (item && typeof item === 'object' && 'content' in item) {
      return {
        content: sanitizeInline(item.content),
        items: sanitizeListItems('items' in item ? item.items : [], depth + 1),
      }
    }
    return { content: '', items: [] }
  })
}

export function prepareProductPreviewContent(content: EditorJSData | null): ProductPreviewData['content'] {
  if (!content) return null
  const blocks: ContentBlock[] = content.blocks.map((block, index) => ({
    id: block.id || `preview-block-${index}`,
    type: block.type,
    data: {
      ...block.data,
      text: sanitizeInline(block.data.text),
      caption: sanitizeInline(block.data.caption),
      ...(block.type === 'list' ? { items: sanitizeListItems(block.data.items) } : {}),
    },
  }))
  return { ...content, blocks }
}

export function ProductPreviewDialog({ open, onOpenChange, product, onCloseAutoFocus }: ProductPreviewDialogProps) {
  const visibleSpecs = getStorefrontVisibleProductSpecifications(product?.specifications)
  const priceRange = getTierPriceRange(product?.priceTiers ?? [])
  const displayPrice = priceRange
    ? priceRange.min === priceRange.max
      ? formatPrice(priceRange.min)
      : `${formatPrice(priceRange.min)}~${formatPrice(priceRange.max).replace(/^\$/, '')}`
    : product?.price !== null && product?.price !== undefined
      ? formatPrice(product.price)
      : '未设置价格'
  const hasDiscount = product?.price !== null && product?.price !== undefined
    && product.comparePrice !== null && product.comparePrice > product.price
  const discountPercentage = hasDiscount && product?.comparePrice
    ? Math.round((1 - (product.price ?? 0) / product.comparePrice) * 100)
    : 0
  const productName = product?.name.trim() || '未命名产品'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="flex h-[92dvh] max-h-[calc(100dvh-1rem)] w-[calc(100%-1rem)] max-w-7xl flex-col gap-0 overflow-hidden p-0 sm:w-[calc(100%-2rem)] motion-reduce:data-[state=open]:animate-none motion-reduce:data-[state=closed]:animate-none motion-reduce:duration-0"
        onCloseAutoFocus={(event) => { event.preventDefault(); onCloseAutoFocus() }}
        onSubmit={(event) => { event.preventDefault(); event.stopPropagation() }}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <DialogTitle className="leading-6">产品详情预览</DialogTitle>
            <DialogDescription className="mt-1 text-xs sm:text-sm">当前编辑内容，包含尚未保存的修改。</DialogDescription>
          </div>
          <DialogClose asChild>
            <Button type="button" variant="ghost" className="h-11 min-w-11 shrink-0 [-webkit-tap-highlight-color:transparent]" aria-label="关闭产品预览">
              <X className="h-5 w-5" aria-hidden="true" />
            </Button>
          </DialogClose>
        </div>
        <div
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-muted/20 p-4 [overflow-wrap:anywhere] sm:p-6"
          data-product-preview-scroll
          onClickCapture={(event) => {
            if (event.target instanceof Element && event.target.closest('a')) event.preventDefault()
          }}
        >
          {product && (
            <div className="grid items-start gap-6 lg:grid-cols-[3fr_2fr] lg:gap-8">
              <div className="order-2 min-w-0 rounded-lg bg-background p-4 lg:order-1 sm:p-6">
                <div className="hidden lg:block">
                  <ProductImageGallery images={product.images.map((image, index) => ({ ...image, id: `preview-image-${index}` }))} productName={productName} hasDiscount={hasDiscount} discountPercentage={discountPercentage} />
                </div>
                {product.description && (
                  <section className="border-b pb-6 lg:border-b-0 lg:border-t lg:pt-6">
                    <h2 className="mb-4 font-serif text-2xl">Description</h2>
                    <p className="whitespace-pre-line leading-relaxed text-muted-foreground">{product.description}</p>
                  </section>
                )}
                {visibleSpecs.length > 0 && (
                  <section className="mt-6 border-t pt-6">
                    <h2 className="mb-4 font-serif text-2xl">Specifications</h2>
                    <dl className="divide-y overflow-hidden rounded-lg bg-muted/30">
                      {visibleSpecs.map((spec, index) => (
                        <div key={index} className="grid grid-cols-[1fr_2fr] gap-3 px-4 py-3">
                          <dt className="min-w-0 text-muted-foreground">{spec.name}</dt>
                          <dd className="min-w-0 font-medium">{spec.value}</dd>
                        </div>
                      ))}
                    </dl>
                  </section>
                )}
                {product.content?.blocks.length ? (
                  <section className="mt-6 border-t pt-6">
                    <h2 className="mb-6 font-serif text-2xl">Product Details</h2>
                    <ContentRenderer content={product.content} seamlessDetailImages />
                  </section>
                ) : null}
                {!product.description && !visibleSpecs.length && !product.content?.blocks.length && (
                  <p className="text-sm text-muted-foreground">暂无产品详情，编辑后可在此预览。</p>
                )}
              </div>
              <div className="order-1 min-w-0 space-y-5 rounded-lg bg-background p-4 lg:order-2 sm:p-6">
                {product.categoryName && <p className="text-sm uppercase tracking-[0.2em] text-primary">{product.categoryName}</p>}
                <h1 className="font-serif text-2xl leading-tight sm:text-3xl">{productName}</h1>
                <div className="flex flex-wrap items-baseline gap-3">
                  <span className="text-2xl font-bold">{displayPrice}</span>
                  {hasDiscount && product.comparePrice !== null && <span className="text-lg text-muted-foreground line-through">{formatPrice(product.comparePrice)}</span>}
                </div>
                <div className="lg:hidden">
                  <ProductImageGallery images={product.images.map((image, index) => ({ ...image, id: `preview-mobile-image-${index}` }))} productName={productName} hasDiscount={hasDiscount} discountPercentage={discountPercentage} />
                </div>
                {product.attributes.length > 0 && (
                  <dl className="space-y-3">
                    {product.attributes.map((attribute, index) => (
                      <div key={index}>
                        <dt className="text-xs uppercase tracking-wide text-muted-foreground">{attribute.name}</dt>
                        <dd className="text-sm font-medium">{attribute.value}</dd>
                      </div>
                    ))}
                  </dl>
                )}
                {product.sku && <p className="text-sm text-muted-foreground">SKU: {product.sku}</p>}
                {product.priceTiers.length > 0 && (
                  <PriceTiersTable tiers={product.priceTiers} currentQuantity={Math.min(...product.priceTiers.map((tier) => tier.minQuantity))} defaultPrice={product.price ?? product.priceTiers[0].price} />
                )}
                {product.variants.length > 0 && (
                  <section className="space-y-3 border-t pt-4">
                    <h2 className="text-sm font-medium">Variants</h2>
                    {product.variants.map((variant) => (
                      <div key={variant.id} className="rounded-md border p-3 text-sm">
                        <p className="font-medium">{variant.name}</p>
                        {variant.sku && <p className="text-muted-foreground">SKU: {variant.sku}</p>}
                        <p>{formatPrice(variant.price)}</p>
                      </div>
                    ))}
                  </section>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
