import assert from 'node:assert/strict'
import test from 'node:test'

import { promoteToPrimaryProductImage } from './product-gallery'

const image = (url: string, alt = url) => ({ url, alt })

test('adds a detail image to the front of a gallery with available space', () => {
  const result = promoteToPrimaryProductImage(
    [image('gallery-1'), image('gallery-2')],
    image('detail-1', 'Detail image')
  )

  assert.equal(result.status, 'added')
  assert.deepEqual(result.images, [
    image('detail-1', 'Detail image'),
    image('gallery-1'),
    image('gallery-2'),
  ])
})

test('moves an existing gallery image to the front without duplicating it', () => {
  const result = promoteToPrimaryProductImage(
    [image('gallery-1'), image('detail-1', 'Existing alt'), image('gallery-2')],
    image('detail-1', 'Replacement alt')
  )

  assert.equal(result.status, 'moved')
  assert.deepEqual(result.images, [
    image('detail-1', 'Existing alt'),
    image('gallery-1'),
    image('gallery-2'),
  ])
})

test('reports when the selected detail image is already primary', () => {
  const gallery = [image('detail-1'), image('gallery-1')]
  const result = promoteToPrimaryProductImage(gallery, image('detail-1'))

  assert.equal(result.status, 'already-primary')
  assert.deepEqual(result.images, gallery)
})

test('does not remove gallery images when the gallery is full', () => {
  const gallery = Array.from({ length: 5 }, (_, index) => image(`gallery-${index + 1}`))
  const result = promoteToPrimaryProductImage(gallery, image('detail-1'))

  assert.equal(result.status, 'gallery-full')
  assert.deepEqual(result.images, gallery)
})
