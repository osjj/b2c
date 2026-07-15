import type { Category, ProductImage } from '@prisma/client'
import type { JSX } from 'react'

import { getProductAvailability } from '@/lib/product-seo'

interface ProductForJsonLd {
  name: string
  slug: string
  description: string | null
  sku: string | null
  price: number
  comparePrice: number | null
  images: ProductImage[]
  category: Category | null
  stock: number
  variants: Array<{ stock: number }>
}

interface ProductJsonLdProps {
  product: ProductForJsonLd
  baseUrl: string
  priceValidUntil?: string
}

const DEFAULT_PRICE_VALID_UNTIL = '2027-12-31'

export function buildProductJsonLd(
  product: ProductForJsonLd,
  baseUrl: string,
  priceValidUntil = DEFAULT_PRICE_VALID_UNTIL
): Record<string, unknown> {
  const offer: Record<string, unknown> = {
    '@type': 'Offer',
    url: `${baseUrl}/products/${product.slug}`,
    priceCurrency: 'USD',
    price: product.price,
    priceValidUntil,
    availability: getProductAvailability(product),
    seller: {
      '@type': 'Organization',
      name: 'Laifappe',
    },
  }

  if (product.comparePrice && product.comparePrice > product.price) {
    offer.priceSpecification = {
      '@type': 'PriceSpecification',
      price: product.price,
      priceCurrency: 'USD',
      valueAddedTaxIncluded: false,
    }
  }

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image: product.images.map((image) => image.url),
    sku: product.sku,
    mpn: product.sku,
    brand: {
      '@type': 'Brand',
      name: 'Laifappe',
    },
    category: product.category?.name,
    url: `${baseUrl}/products/${product.slug}`,
    offers: offer,
  }
}

export function ProductJsonLd({
  product,
  baseUrl,
  priceValidUntil = DEFAULT_PRICE_VALID_UNTIL,
}: ProductJsonLdProps): JSX.Element {
  const jsonLd = buildProductJsonLd(product, baseUrl, priceValidUntil)

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}
