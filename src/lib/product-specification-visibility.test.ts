import assert from 'node:assert/strict'
import test from 'node:test'

import { getStorefrontVisibleProductSpecifications } from './product-specification-visibility'

test('hides Purchase Price while preserving ordinary storefront specifications', () => {
  const specifications = [
    { name: 'Material', value: 'PVC' },
    { name: 'Purchase Price', value: 'CNY 3.20/Pair' },
    { name: 'Minimum Order Quantity', value: '100 Pairs' },
  ]

  const visible = getStorefrontVisibleProductSpecifications(specifications)

  assert.deepEqual(visible, [
    { name: 'Material', value: 'PVC' },
    { name: 'Minimum Order Quantity', value: '100 Pairs' },
  ])
  assert.equal(specifications.length, 3)
  assert.equal(specifications[1]?.name, 'Purchase Price')
})

test('normalizes case, spaces, underscores, and hyphens for Purchase Price', () => {
  const visible = getStorefrontVisibleProductSpecifications([
    { name: 'purchase price', value: 'hidden' },
    { name: 'PURCHASE_PRICE', value: 'hidden' },
    { name: 'Purchase-Price', value: 'hidden' },
    { name: '  Purchase   Price  ', value: 'hidden' },
    { name: 'Color', value: 'Blue' },
  ])

  assert.deepEqual(visible, [{ name: 'Color', value: 'Blue' }])
})

test('preserves existing internal source-field filtering', () => {
  const visible = getStorefrontVisibleProductSpecifications([
    { name: 'Source URL', value: 'https://example.com/source' },
    { name: '1688_Source_URL', value: 'https://detail.1688.com/example' },
    { name: 'Size', value: 'One Size' },
  ])

  assert.deepEqual(visible, [{ name: 'Size', value: 'One Size' }])
})

test('returns an empty list when input is invalid or contains only hidden fields', () => {
  assert.deepEqual(getStorefrontVisibleProductSpecifications(null), [])
  assert.deepEqual(
    getStorefrontVisibleProductSpecifications([
      { name: 'Purchase Price', value: 'CNY 3.20/Pair' },
      { name: 'Source URL', value: 'https://example.com/source' },
      { name: 'Incomplete' },
    ]),
    []
  )
})
