import test from 'node:test'
import assert from 'node:assert/strict'
import {
  normalizeManualProductIds,
  resolveRecommendationMode,
  withRecommendationModeForSection,
} from './solution-recommendations'

test('resolveRecommendationMode defaults to rule', () => {
  assert.equal(resolveRecommendationMode(undefined), 'rule')
  assert.equal(resolveRecommendationMode('invalid'), 'rule')
  assert.equal(resolveRecommendationMode('manual'), 'manual')
})

test('normalizeManualProductIds keeps order and removes duplicates', () => {
  const result = normalizeManualProductIds(['p2', ' ', 'p1', 'p2', 123, 'p3'])
  assert.deepEqual(result, ['p2', 'p1', 'p3'])
})

test('withRecommendationModeForSection writes mode only for recommended block', () => {
  const sections = [
    { key: 'intro', data: { paragraphs: ['a'] } },
    { key: 'recommended-ppe', data: { paragraphs: ['b'] } },
  ]

  const result = withRecommendationModeForSection(sections, 'manual')

  assert.deepEqual(result, [
    { key: 'intro', data: { paragraphs: ['a'] } },
    { key: 'recommended-ppe', data: { paragraphs: ['b'], mode: 'manual' } },
  ])
})
