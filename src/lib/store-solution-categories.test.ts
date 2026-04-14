import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildStoreSolutionCategories,
  normalizePublicCtaHref,
} from './store-solution-categories'

test('buildStoreSolutionCategories keeps public active categories and drops stale slugs', () => {
  const result = buildStoreSolutionCategories([
    { slug: 'respiratory-protection', name: 'Respiratory Protection', isActive: true },
    { slug: 'fall-protection', name: 'Fall Protection', isActive: false },
    { slug: 'body-protection', name: 'Body Protection', isActive: true },
    { slug: 'hand-protection', name: 'Hand Protection', isActive: true },
    { slug: 'custom-private', name: 'Custom Private', isActive: true },
  ])

  assert.deepEqual(result, [
    {
      slug: 'hand-protection',
      label: 'Hand Protection',
      icon: 'Hand',
    },
    {
      slug: 'respiratory-protection',
      label: 'Respiratory Protection',
      icon: 'Wind',
    },
    {
      slug: 'body-protection',
      label: 'Body Protection',
      icon: 'Shirt',
    },
  ])
})

test('buildStoreSolutionCategories falls back to category name when no custom label is needed', () => {
  const result = buildStoreSolutionCategories([
    { slug: 'eye-protection', name: 'Eye Protection', isActive: true },
  ])

  assert.deepEqual(result, [
    {
      slug: 'eye-protection',
      label: 'Eye Protection',
      icon: 'Eye',
    },
  ])
})

test('normalizePublicCtaHref rewrites stale quote links to the public contact page', () => {
  assert.equal(normalizePublicCtaHref('/quote'), '/contact')
  assert.equal(normalizePublicCtaHref('/contact'), '/contact')
  assert.equal(normalizePublicCtaHref('https://wa.me/8618029309938'), 'https://wa.me/8618029309938')
})
