import assert from 'node:assert/strict'
import test from 'node:test'

import { buildProductCategoryBreadcrumbs } from './product-category-breadcrumbs'

const activeParent = { name: 'Hand Protection', slug: 'hand-protection', isActive: true }

test('an inactive PVC category links only to its public parent', () => {
  const category = {
    name: 'Acid, Alkali & Oil Resistant Gloves',
    slug: 'acid-alkali-oil-resistant-gloves',
    isActive: false,
    parent: activeParent,
  }
  const before = structuredClone(category)

  assert.deepEqual(buildProductCategoryBreadcrumbs(category), [
    { name: 'Hand Protection', href: '/categories/hand-protection' },
  ])
  assert.deepEqual(category, before)
})

test('an active child preserves its existing parent and nested canonical path', () => {
  assert.deepEqual(buildProductCategoryBreadcrumbs({
    name: 'Cut Resistant Gloves',
    slug: 'cut-resistant-gloves',
    isActive: true,
    parent: activeParent,
  }), [
    { name: 'Hand Protection', href: '/categories/hand-protection' },
    { name: 'Cut Resistant Gloves', href: '/categories/hand-protection/cut-resistant-gloves' },
  ])
})

test('an active top-level category preserves its existing canonical path', () => {
  assert.deepEqual(buildProductCategoryBreadcrumbs({ ...activeParent, parent: null }), [
    { name: 'Hand Protection', href: '/categories/hand-protection' },
  ])
})

test('an inactive category with no public parent emits no dead category links', () => {
  assert.deepEqual(buildProductCategoryBreadcrumbs({ ...activeParent, isActive: false, parent: null }), [])
  assert.deepEqual(buildProductCategoryBreadcrumbs({
    name: 'Hidden Gloves',
    slug: 'hidden-gloves',
    isActive: false,
    parent: { ...activeParent, isActive: false },
  }), [])
})

test('a product without a category emits no category breadcrumbs', () => {
  assert.deepEqual(buildProductCategoryBreadcrumbs(null), [])
  assert.deepEqual(buildProductCategoryBreadcrumbs(undefined), [])
})
