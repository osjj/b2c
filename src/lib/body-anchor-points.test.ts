import test from 'node:test'
import assert from 'node:assert/strict'
import {
  BODY_ANCHOR_POINTS,
  getBodyAnchorPointByKey,
  resolveListItemBodyAnchor,
} from './body-anchor-points'

test('BODY_ANCHOR_POINTS contains stable preset keys', () => {
  const keys = BODY_ANCHOR_POINTS.map((item) => item.key)
  assert.deepEqual(keys, [
    'head',
    'eyes',
    'ears',
    'mouth',
    'chest',
    'left-hand',
    'waist',
    'feet',
  ])
})

test('getBodyAnchorPointByKey returns coordinates for preset key', () => {
  const point = getBodyAnchorPointByKey('eyes')
  const expected = BODY_ANCHOR_POINTS.find((item) => item.key === 'eyes')?.point
  assert.deepEqual(point, expected)
})

test('resolveListItemBodyAnchor prefers preset key and falls back to manual coordinate', () => {
  const fromKey = resolveListItemBodyAnchor({
    title: 'Eye Protection',
    bodyAnchorKey: 'eyes',
    bodyAnchor: { x: 10, y: 10 },
  })
  const expected = BODY_ANCHOR_POINTS.find((item) => item.key === 'eyes')?.point
  assert.deepEqual(fromKey, expected)

  const fromManual = resolveListItemBodyAnchor({
    title: 'Fallback',
    bodyAnchor: { x: 120, y: -10 },
  })
  assert.deepEqual(fromManual, { x: 100, y: 0 })
})

test('resolveListItemBodyAnchor clamps preset key coordinates into 0-100', () => {
  const fromKey = resolveListItemBodyAnchor({
    title: 'Hi-Vis Clothing',
    bodyAnchorKey: 'chest',
  })

  assert.ok(fromKey)
  assert.equal(fromKey.x >= 0 && fromKey.x <= 100, true)
  assert.equal(fromKey.y >= 0 && fromKey.y <= 100, true)
})

test('resolveListItemBodyAnchor maps legacy chest coordinate to current chest preset', () => {
  const fromLegacy = resolveListItemBodyAnchor({
    title: 'Legacy chest',
    bodyAnchor: { x: 50, y: 35 },
  })

  const chestPoint = getBodyAnchorPointByKey('chest')
  assert.deepEqual(fromLegacy, chestPoint)
})
