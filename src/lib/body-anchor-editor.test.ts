import test from 'node:test'
import assert from 'node:assert/strict'
import {
  shouldShowBodyAnchorEditor,
  toggleListItemBodyAnchor,
  updateListItemBodyAnchorKey,
  updateListItemBodyAnchorValue,
} from './body-anchor-editor'

test('shouldShowBodyAnchorEditor only enables for essential-categories', () => {
  assert.equal(shouldShowBodyAnchorEditor('essential-categories'), true)
  assert.equal(shouldShowBodyAnchorEditor('recommended-ppe'), false)
  assert.equal(shouldShowBodyAnchorEditor(''), false)
})

test('toggleListItemBodyAnchor enables and disables anchor cleanly', () => {
  const baseItem = { title: 'Helmet', text: 'Head protection' }

  const enabled = toggleListItemBodyAnchor(baseItem, true)
  assert.equal(enabled.bodyAnchorKey, 'chest')
  assert.deepEqual(enabled.bodyAnchor, { x: 50, y: 50 })

  const disabled = toggleListItemBodyAnchor(
    { ...baseItem, bodyAnchor: { x: 40, y: 20 } },
    false
  )
  assert.equal(disabled.bodyAnchor, undefined)
  assert.equal(disabled.bodyAnchorKey, undefined)
})

test('updateListItemBodyAnchorKey only accepts preset key', () => {
  const item = { title: 'Helmet', bodyAnchorKey: 'head' }

  const updated = updateListItemBodyAnchorKey(item, 'eyes')
  assert.equal(updated.bodyAnchorKey, 'eyes')

  const unchanged = updateListItemBodyAnchorKey(item, 'random-key')
  assert.equal(unchanged.bodyAnchorKey, 'head')
})

test('updateListItemBodyAnchorValue updates target axis and keeps sibling value', () => {
  const item = { title: 'Boots', bodyAnchor: { x: 50, y: 90 } }

  const updatedX = updateListItemBodyAnchorValue(item, 'x', '33.4')
  assert.deepEqual(updatedX.bodyAnchor, { x: 33.4, y: 90 })

  const updatedY = updateListItemBodyAnchorValue(item, 'y', '12')
  assert.deepEqual(updatedY.bodyAnchor, { x: 50, y: 12 })
})

test('updateListItemBodyAnchorValue clamps numbers and ignores invalid input', () => {
  const item = { title: 'Gloves', bodyAnchor: { x: 39, y: 47 } }

  const clamped = updateListItemBodyAnchorValue(item, 'x', '120')
  assert.deepEqual(clamped.bodyAnchor, { x: 100, y: 47 })

  const unchanged = updateListItemBodyAnchorValue(item, 'x', 'abc')
  assert.deepEqual(unchanged.bodyAnchor, { x: 39, y: 47 })
})
