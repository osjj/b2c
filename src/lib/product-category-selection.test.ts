import assert from 'node:assert/strict'
import test from 'node:test'
import type { Category } from '@prisma/client'

import { buildProductCategorySelection } from './product-category-selection'

type CategoryInput = Pick<Category, 'id' | 'name' | 'slug' | 'parentId' | 'isActive' | 'sortOrder'>

function category(slug: string, parentId: string | null = null, isActive = true): CategoryInput {
  return { id: slug, name: slug, slug, parentId, isActive, sortOrder: 0 }
}

const categories: CategoryInput[] = [
  category('other-supplies'),
  category('foot-protection'),
  category('eye-protection'),
  category('firefighting-equipment'),
  category('head-protection'),
  category('hand-protection'),
  category('body-protection'),
  category('respiratory-protection'),
  category('fall-protection'),
  category('hearing-protection', 'head-protection'),
  category('rainwear', 'body-protection'),
  { ...category('safety-glasses', 'eye-protection'), name: 'Safety Glasses', sortOrder: 2 },
  { ...category('face-shields', 'eye-protection'), sortOrder: 1 },
  category('wraparound-glasses', 'safety-glasses'),
  category('earplugs', 'hearing-protection'),
  category('raincoats', 'rainwear'),
  category('workwear', 'body-protection'),
  category('helmets', 'head-protection'),
  category('inactive-gloves', 'hand-protection', false),
  category('hidden-root', null, false),
  category('hidden-child', 'hidden-root'),
  category('hidden-grandchild', 'hidden-child'),
  category('uncategorized'),
  category('retired-child', 'uncategorized'),
  category('orphan', 'missing-parent'),
]

test('main choices reuse the ordered storefront projection without mutating category rows', () => {
  const before = structuredClone(categories)
  const selection = buildProductCategorySelection(categories, 'none')

  assert.deepEqual(selection.mainCategories.map(({ slug }) => slug), [
    'fall-protection', 'respiratory-protection', 'body-protection', 'hand-protection',
    'hearing-protection', 'head-protection', 'firefighting-equipment', 'eye-protection',
    'rainwear', 'foot-protection', 'other-supplies',
  ])
  assert.equal(selection.mainCategories.find(({ slug }) => slug === 'rainwear')?.href,
    '/categories/body-protection/rainwear')
  assert.deepEqual(categories, before)
})

test('a detailed assignment resolves its main category and scoped ordered choices', () => {
  const selection = buildProductCategorySelection(categories, 'safety-glasses')

  assert.equal(selection.mainCategoryId, 'eye-protection')
  assert.equal(selection.subcategoryId, 'safety-glasses')
  assert.equal(selection.value, 'safety-glasses')
  assert.equal(selection.currentCategory, null)
  assert.deepEqual(selection.subcategories.map(({ id }) => id), [
    'face-shields', 'safety-glasses', 'wraparound-glasses',
  ])
})

test('promoted hearing and rainwear branches own their descendants', () => {
  for (const [value, mainCategoryId, detail] of [
    ['earplugs', 'hearing-protection', 'earplugs'],
    ['raincoats', 'rainwear', 'raincoats'],
    ['hearing-protection', 'hearing-protection', 'none'],
    ['rainwear', 'rainwear', 'none'],
  ]) {
    const selection = buildProductCategorySelection(categories, value)
    assert.equal(selection.mainCategoryId, mainCategoryId)
    assert.equal(selection.subcategoryId, detail)
  }

  assert.deepEqual(buildProductCategorySelection(categories, 'head-protection').subcategories.map(({ id }) => id), ['helmets'])
  assert.deepEqual(buildProductCategorySelection(categories, 'body-protection').subcategories.map(({ id }) => id), ['workwear'])
})

test('inactive ancestors, retired branches and missing parents cannot be newly assigned', () => {
  const selection = buildProductCategorySelection(categories, 'hand-protection')

  for (const id of ['inactive-gloves', 'hidden-root', 'hidden-child', 'hidden-grandchild', 'uncategorized', 'retired-child', 'orphan']) {
    assert.equal(selection.selectableCategoryIds.has(id), false, `${id} must be unavailable`)
  }
  assert.equal(selection.selectableCategoryIds.has('safety-glasses'), true)
  assert.equal(selection.selectableCategoryIds.has('hearing-protection'), true)
  assert.deepEqual(selection.subcategories, [])
})

test('an unavailable saved assignment survives as a current-only value', () => {
  for (const id of ['inactive-gloves', 'hidden-grandchild', 'uncategorized', 'retired-child', 'orphan', 'unknown-category']) {
    const selection = buildProductCategorySelection(categories, id)
    assert.equal(selection.value, id)
    assert.equal(selection.mainCategoryId, id)
    assert.equal(selection.subcategoryId, 'none')
    assert.equal(selection.currentCategory?.id, id)
    assert.equal(selection.selectableCategoryIds.has(id), false)
    assert.deepEqual(selection.subcategories, [])
  }
})

test('main changes, detail removal and unassignment use one category ID without stale detail', () => {
  for (const [value, mainCategoryId, subcategoryId] of [
    ['safety-glasses', 'eye-protection', 'safety-glasses'],
    ['hand-protection', 'hand-protection', 'none'],
    ['eye-protection', 'eye-protection', 'none'],
    ['raincoats', 'rainwear', 'raincoats'],
    ['none', 'none', 'none'],
  ]) {
    const selection = buildProductCategorySelection(categories, value)
    assert.equal(selection.value, value)
    assert.equal(selection.mainCategoryId, mainCategoryId)
    assert.equal(selection.subcategoryId, subcategoryId)
  }
  assert.equal(buildProductCategorySelection(categories, null).value, 'none')
  assert.equal(buildProductCategorySelection([], null).mainCategoryId, 'none')
})

test('unknown active roots remain before Other Supplies in the shared projection', () => {
  const selection = buildProductCategorySelection([...categories, category('new-equipment')], 'new-equipment')

  assert.deepEqual(selection.mainCategories.slice(-2).map(({ id }) => id), ['new-equipment', 'other-supplies'])
  assert.equal(selection.mainCategoryId, 'new-equipment')
  assert.equal(selection.currentCategory, null)
})
