import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildCategoryPagePath,
  buildCategoryPageTitle,
  MAX_CATEGORY_PAGE,
  normalizeCategoryPage,
} from './category-pagination'

test('category page parsing accepts positive decimal integers and normalizes invalid input', () => {
  assert.equal(normalizeCategoryPage('1'), 1)
  assert.equal(normalizeCategoryPage('2'), 2)
  assert.equal(normalizeCategoryPage('003'), 3)
  for (const value of [undefined, null, '', '0', '-2', '1.5', '1e2', '0x10', 'Infinity', 'NaN', ' 2 ', '9007199254740992', ['2'], 2]) {
    assert.equal(normalizeCategoryPage(value), 1)
  }
})

test('category pages cannot overflow the signed 32-bit Prisma pagination offset', () => {
  assert.equal(MAX_CATEGORY_PAGE, 178_956_971)
  assert.ok((MAX_CATEGORY_PAGE - 1) * 12 <= 2_147_483_647)
  assert.ok(MAX_CATEGORY_PAGE * 12 > 2_147_483_647)
  assert.equal(normalizeCategoryPage(String(MAX_CATEGORY_PAGE)), MAX_CATEGORY_PAGE)
  for (const page of [MAX_CATEGORY_PAGE + 1, 2_147_483_647, Number.MAX_SAFE_INTEGER]) {
    assert.equal(normalizeCategoryPage(String(page)), 1)
    assert.equal(buildCategoryPagePath('hand-protection', null, page), '/categories/hand-protection')
    assert.equal(buildCategoryPageTitle('Safety Shoes', page), 'Safety Shoes | Laifappe')
  }
})

test('root and nested category pages have distinct canonical pagination paths', () => {
  assert.equal(buildCategoryPagePath('hand-protection'), '/categories/hand-protection')
  assert.equal(buildCategoryPagePath('hand-protection', null, 1), '/categories/hand-protection')
  assert.equal(buildCategoryPagePath('hand-protection', null, 2), '/categories/hand-protection?page=2')
  assert.equal(buildCategoryPagePath('safety-shoes', 'foot-protection', 2), '/categories/foot-protection/safety-shoes?page=2')
  assert.equal(buildCategoryPagePath('face-shields', 'eye-protection', 3), '/categories/eye-protection/face-shields?page=3')
  assert.equal(buildCategoryPagePath('other-supplies', null, 2), '/categories/other-supplies?page=2')
  for (const page of [0, -1, 1.5, Number.POSITIVE_INFINITY, Number.NaN]) {
    assert.equal(buildCategoryPagePath('hand-protection', null, page), '/categories/hand-protection')
  }
})

test('page titles distinguish subsequent pages without losing suffixes on long metadata', () => {
  assert.equal(buildCategoryPageTitle('Safety Shoes'), 'Safety Shoes | Laifappe')
  assert.equal(buildCategoryPageTitle('Safety Shoes', 2), 'Safety Shoes - Page 2 | Laifappe')
  const long = buildCategoryPageTitle('Safety Shoes for Construction, Manufacturing, Warehouses and Outdoor Industrial Work', 123)
  assert.ok(long.includes(' - Page 123'))
  assert.ok(long.length <= 60)
  assert.equal(buildCategoryPageTitle('Safety Shoes', Number.NaN), 'Safety Shoes | Laifappe')
})
