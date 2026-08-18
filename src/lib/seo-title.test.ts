import test from 'node:test'
import assert from 'node:assert/strict'
import { buildPageTitle } from './seo-title'

test('buildPageTitle appends the brand when it still fits', () => {
  assert.equal(buildPageTitle('All Products'), 'All Products | Laifappe')
})

test('buildPageTitle avoids duplicating the brand name', () => {
  assert.equal(buildPageTitle('FAQ | Laifappe'), 'FAQ | Laifappe')
})

test('buildPageTitle falls back to the base title when brand suffix would overflow', () => {
  const result = buildPageTitle('Safety Equipment Procurement Tool for Manufacturing Teams')

  assert.equal(result.includes('| Laifappe'), false)
  assert.equal(result.length <= 60, true)
})

test('buildPageTitle truncates long dynamic titles on a clean phrase boundary', () => {
  const result = buildPageTitle(
    'Industrial Cut Resistant Nitrile Palm-Coated Anti-Slip Safety Work Gloves for Manufacturing and Warehousing'
  )

  assert.equal(result.endsWith('...'), false)
  assert.equal(result.length <= 60, true)
  assert.equal(/\b(?:and|for|of|with)$/i.test(result), false)
})

test('buildPageTitle avoids a partial final word when cutting a product name', () => {
  assert.equal(
    buildPageTitle('6kV Insulated Anti-Puncture Safety Shoes with Quick-Lace Dial'),
    '6kV Insulated Anti-Puncture Safety Shoes with Quick-Lace'
  )
})

test('buildPageTitle removes a dangling ampersand after truncation', () => {
  assert.equal(
    buildPageTitle('Flame-Retardant Reflective Worker Coveralls for Mining & Quarrying'),
    'Flame-Retardant Reflective Worker Coveralls for Mining'
  )
})
