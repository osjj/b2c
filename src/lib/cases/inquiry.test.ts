import assert from 'node:assert/strict'
import test from 'node:test'

import { normalizeAttributionSource } from '../seo-links'
import {
  caseInquiryHref, caseInquirySource, parseCaseInquirySlug,
  quotePageSource, resolveCaseInquiryContext,
} from './inquiry'

const slug = 'south-africa-mining-ppe-procurement-2026'
const title = 'South Africa Mining PPE Procurement'

test('eligible public context seeds only a public title and specific case identity', async () => {
  const context = await resolveCaseInquiryContext(slug, async (requestedSlug) => {
    assert.equal(requestedSlug, slug)
    return { slug, title, privateNotes: 'Never expose this', quantity: 500, customer: 'Private buyer' }
  })
  assert.deepEqual(context, {
    slug, title, caseHref: `/cases/${slug}`, source: `case:${slug}`,
    initialMessage: `I would like to discuss a similar PPE procurement project to "${title}".`,
  })
  assert.equal(caseInquiryHref(slug), `/quote?case=${slug}`)
  assert.equal(normalizeAttributionSource(context?.source), context?.source)
})

test('missing, unsafe and repeated query values never reach the public lookup', async () => {
  const invalidQueries: unknown[] = [
    undefined, null, '', 42, {}, [slug], [slug, 'another-case'], ['invalid', slug],
    'Case', 'my_case', '-case', 'case-', 'case--name', ' case', 'case ',
    '../admin', '/cases/case', 'https://example.com/case', 'case?source=x',
    'case#fragment', 'case%2fname', 'a'.repeat(161),
  ]
  for (const value of invalidQueries) {
    assert.equal(parseCaseInquirySlug(value), null, String(value))
    assert.equal(await resolveCaseInquiryContext(value, async () => {
      assert.fail('Invalid case parameters must not trigger a lookup')
    }), null)
  }
  assert.equal(caseInquiryHref('../admin'), '/quote')
  assert.equal(caseInquirySource('../admin'), 'procurement-cases')
})

test('unknown, draft, archived, private and future lookup targets produce ordinary forms', async () => {
  // getPublishedCase owns publication/privacy filtering and returns null for these targets.
  for (const target of ['unknown-case', 'draft-case', 'archived-case', 'private-case', 'future-case']) {
    let lookups = 0
    const context = await resolveCaseInquiryContext(target, async (requestedSlug) => {
      lookups++
      assert.equal(requestedSlug, target)
      return null
    })
    assert.equal(lookups, 1)
    assert.equal(context, null)
  }
})

test('lookup identity mismatch and invalid public title fail closed', async () => {
  assert.equal(await resolveCaseInquiryContext(slug, async () => ({ slug: 'another-case', title })), null)
  for (const invalidTitle of ['', '   ', 'a'.repeat(201)]) {
    assert.equal(await resolveCaseInquiryContext(slug, async () => ({ slug, title: invalidTitle })), null)
  }
})

test('bounded long case sources distinguish shared prefixes and survive attribution normalization', () => {
  assert.equal(caseInquirySource('a'.repeat(75)), `case:${'a'.repeat(75)}`)
  const first = `${'a'.repeat(159)}b`
  const second = `${'a'.repeat(159)}c`
  assert.equal(parseCaseInquirySlug(first), first)
  assert.equal(caseInquiryHref(first), `/quote?case=${first}`)
  const firstSource = caseInquirySource(first)
  const secondSource = caseInquirySource(second)
  assert.equal(firstSource.length, 80)
  assert.equal(firstSource, caseInquirySource(first))
  assert.notEqual(firstSource, secondSource)
  assert.equal(normalizeAttributionSource(firstSource), firstSource)
})

test('ordinary quote sources retain trim, first-value and empty fallback behavior', () => {
  assert.equal(quotePageSource(undefined), 'Quote page')
  assert.equal(quotePageSource('   '), 'Quote page')
  assert.equal(quotePageSource([]), 'Quote page')
  assert.equal(quotePageSource(['  blog-guide ', 'other']), 'blog-guide')
  assert.equal(quotePageSource('a'.repeat(100)), 'a'.repeat(80))
})
