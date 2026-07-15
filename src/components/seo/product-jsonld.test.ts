import test from 'node:test'
import assert from 'node:assert/strict'

import { buildProductJsonLd } from './product-jsonld'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const baseProduct = {
  name: 'Test Safety Shoes',
  slug: 'test-safety-shoes',
  description: 'Protective footwear for industrial work.',
  sku: 'TEST-001',
  price: 29.99,
  comparePrice: null,
  images: [],
  category: null,
  stock: 0,
  variants: [],
}

test('buildProductJsonLd includes stock-derived Offer availability', () => {
  const inStockJsonLd = buildProductJsonLd(
    { ...baseProduct, stock: 5 },
    'https://www.laifappe.com'
  )
  const outOfStockJsonLd = buildProductJsonLd(baseProduct, 'https://www.laifappe.com')

  assert.ok(isRecord(inStockJsonLd.offers))
  assert.ok(isRecord(outOfStockJsonLd.offers))
  assert.equal(inStockJsonLd.offers.availability, 'https://schema.org/InStock')
  assert.equal(outOfStockJsonLd.offers.availability, 'https://schema.org/OutOfStock')
})

test('buildProductJsonLd does not invent policy, review, or rating data', () => {
  const jsonLd = buildProductJsonLd(baseProduct, 'https://www.laifappe.com')

  assert.ok(isRecord(jsonLd.offers))
  assert.equal('shippingDetails' in jsonLd.offers, false)
  assert.equal('hasMerchantReturnPolicy' in jsonLd.offers, false)
  assert.equal('review' in jsonLd, false)
  assert.equal('aggregateRating' in jsonLd, false)
})
