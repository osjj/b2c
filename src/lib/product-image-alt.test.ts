import test from 'node:test'
import assert from 'node:assert/strict'

import { buildProductImageAlt } from './product-image-alt'

test('buildProductImageAlt prefers normalized curated alt text', () => {
  assert.equal(
    buildProductImageAlt({
      productName: 'Vented ABS safety helmet',
      imageAlt: '  Vented ABS safety helmet,\n side   view  ',
      imageIndex: 0,
    }),
    'Vented ABS safety helmet, side view'
  )
})

test('buildProductImageAlt uses a truthful deterministic gallery fallback', () => {
  assert.equal(
    buildProductImageAlt({
      productName: '  Vented ABS   safety helmet ',
      imageAlt: '   ',
      imageIndex: 1,
    }),
    'Vented ABS safety helmet - gallery image 2'
  )
})

test('buildProductImageAlt uses an ASCII hyphen in the fallback', () => {
  const alt = buildProductImageAlt({
    productName: 'Safety helmet',
    imageAlt: null,
    imageIndex: 0,
  })

  assert.equal(alt, 'Safety helmet - gallery image 1')
  assert.equal(alt.charCodeAt('Safety helmet '.length), 45)
})
