import test from 'node:test'
import assert from 'node:assert/strict'
import {
  STORE_SOLUTIONS_FIRST_PAGE_SIZE,
  STORE_SOLUTIONS_REGULAR_PAGE_SIZE,
  getStoreSolutionsPageConfig,
  getStoreSolutionsTotalPages,
  normalizeSolutionsPage,
  splitFeaturedSolution,
} from './store-solutions-pagination'

test('normalizeSolutionsPage falls back to page 1 for invalid values', () => {
  assert.equal(normalizeSolutionsPage(undefined), 1)
  assert.equal(normalizeSolutionsPage(''), 1)
  assert.equal(normalizeSolutionsPage('abc'), 1)
  assert.equal(normalizeSolutionsPage('0'), 1)
  assert.equal(normalizeSolutionsPage('-3'), 1)
})

test('normalizeSolutionsPage keeps valid positive integer page values', () => {
  assert.equal(normalizeSolutionsPage('1'), 1)
  assert.equal(normalizeSolutionsPage('3'), 3)
})

test('splitFeaturedSolution keeps the first item as featured only on page 1', () => {
  const result = splitFeaturedSolution([
    { id: 's1' },
    { id: 's2' },
    { id: 's3' },
  ], 1)

  assert.deepEqual(result.featuredSolution, { id: 's1' })
  assert.deepEqual(result.regularSolutions, [{ id: 's2' }, { id: 's3' }])
})

test('splitFeaturedSolution returns a flat list after page 1', () => {
  const result = splitFeaturedSolution([
    { id: 's10' },
    { id: 's11' },
  ], 2)

  assert.equal(result.featuredSolution, undefined)
  assert.deepEqual(result.regularSolutions, [{ id: 's10' }, { id: 's11' }])
})

test('splitFeaturedSolution returns no featured item for an empty page', () => {
  const result = splitFeaturedSolution([], 1)

  assert.equal(result.featuredSolution, undefined)
  assert.deepEqual(result.regularSolutions, [])
})

test('getStoreSolutionsPageConfig uses a 9-item first page with featured', () => {
  assert.deepEqual(getStoreSolutionsPageConfig(1), {
    page: 1,
    skip: 0,
    take: 9,
    showFeatured: true,
    regularStartIndex: 2,
  })
})

test('getStoreSolutionsPageConfig uses flat 8-item pages after page 1', () => {
  assert.deepEqual(getStoreSolutionsPageConfig(2), {
    page: 2,
    skip: 9,
    take: 8,
    showFeatured: false,
    regularStartIndex: 10,
  })
})

test('getStoreSolutionsTotalPages accounts for the larger first page', () => {
  assert.equal(getStoreSolutionsTotalPages(0), 0)
  assert.equal(getStoreSolutionsTotalPages(9), 1)
  assert.equal(getStoreSolutionsTotalPages(10), 2)
  assert.equal(getStoreSolutionsTotalPages(17), 2)
  assert.equal(getStoreSolutionsTotalPages(18), 3)
})

test('store solution page sizes stay aligned with the layout', () => {
  assert.equal(STORE_SOLUTIONS_FIRST_PAGE_SIZE, 9)
  assert.equal(STORE_SOLUTIONS_REGULAR_PAGE_SIZE, 8)
})
