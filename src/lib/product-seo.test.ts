import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildMetaDescription,
  buildProductMetaDescription,
  buildProductMetaTitle,
  getProductAvailability,
} from './product-seo'

test('buildProductMetaTitle preserves a curated title after whitespace normalization', () => {
  assert.equal(
    buildProductMetaTitle({
      name: 'Fallback Product Name',
      metaTitle: '  Curated   Product Title  ',
    }),
    'Curated Product Title'
  )
})

test('buildProductMetaTitle falls back when the curated title is whitespace only', () => {
  assert.equal(
    buildProductMetaTitle({ name: 'Safety Shoes', metaTitle: '   ' }),
    'Safety Shoes | Laifappe'
  )
})

test('buildMetaDescription prefers the last complete sentence within the limit', () => {
  assert.equal(
    buildMetaDescription(
      'First complete sentence. The second sentence extends beyond the configured maximum.',
      45
    ),
    'First complete sentence.'
  )
})

test('buildMetaDescription falls back to a word boundary', () => {
  assert.equal(
    buildMetaDescription('alpha beta gamma delta epsilon', 18),
    'alpha beta gamma'
  )
})

test('buildProductMetaDescription does not cut the 6kV product copy mid-sentence', () => {
  const result = buildProductMetaDescription({
    name: '6kV Insulated Anti-Puncture Safety Shoes with Quick-Lace Dial',
    description:
      'Protective safety shoes designed for electricians, featuring 6kV insulation, anti-shock performance, and anti-puncture protection. The quick-lace dial system and durable TPU outsole provide a secure fit and reliable workplace safety.',
  })

  assert.equal(
    result,
    'Protective safety shoes designed for electricians, featuring 6kV insulation, anti-shock performance, and anti-puncture protection.'
  )
  assert.equal(result.length <= 160, true)
})

test('getProductAvailability uses product stock when there are no variants', () => {
  assert.equal(
    getProductAvailability({ stock: 4, variants: [] }),
    'https://schema.org/InStock'
  )
  assert.equal(
    getProductAvailability({ stock: 0, variants: [] }),
    'https://schema.org/OutOfStock'
  )
})

test('getProductAvailability uses variant stock when variants exist', () => {
  assert.equal(
    getProductAvailability({ stock: 0, variants: [{ stock: 0 }, { stock: 2 }] }),
    'https://schema.org/InStock'
  )
  assert.equal(
    getProductAvailability({ stock: 20, variants: [{ stock: 0 }, { stock: 0 }] }),
    'https://schema.org/OutOfStock'
  )
})
