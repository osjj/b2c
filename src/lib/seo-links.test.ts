import test from 'node:test'
import assert from 'node:assert/strict'

import {
  normalizeInternalAttributionLink,
  parseStoredAttributionSource,
  rewriteInternalAttributionLinksInHtml,
} from './seo-links'

test('normalizeInternalAttributionLink removes a source-only query', () => {
  assert.deepEqual(
    normalizeInternalAttributionLink('/quote?source=blog-construction-ppe-checklist'),
    {
      href: '/quote',
      source: 'blog-construction-ppe-checklist',
    },
  )
})

test('normalizeInternalAttributionLink preserves meaningful parameters and a hash', () => {
  assert.deepEqual(
    normalizeInternalAttributionLink('/tools/example?mode=compact&source=blog-guide#result'),
    {
      href: '/tools/example?mode=compact#result',
      source: 'blog-guide',
    },
  )
})

test('normalizeInternalAttributionLink applies a fallback to a clean internal link', () => {
  assert.deepEqual(
    normalizeInternalAttributionLink('/products/safety-helmet', 'blog-guide'),
    {
      href: '/products/safety-helmet',
      source: 'blog-guide',
    },
  )
})

test('normalizeInternalAttributionLink leaves external and protocol-relative URLs unchanged', () => {
  assert.deepEqual(
    normalizeInternalAttributionLink('https://example.com/?source=partner', 'fallback'),
    { href: 'https://example.com/?source=partner' },
  )
  assert.deepEqual(
    normalizeInternalAttributionLink('//example.com/?source=partner', 'fallback'),
    { href: '//example.com/?source=partner' },
  )
  assert.deepEqual(
    normalizeInternalAttributionLink('/\\example.com/?source=partner', 'fallback'),
    { href: '/\\example.com/?source=partner' },
  )
})

test('rewriteInternalAttributionLinksInHtml emits a clean href and data-source', () => {
  assert.equal(
    rewriteInternalAttributionLinksInHtml(
      '<p><a href="/tools/example?mode=compact&amp;source=blog-guide#result" target="_blank">Open</a></p>',
    ),
    '<p><a href="/tools/example?mode=compact#result" target="_blank" data-source="blog-guide">Open</a></p>',
  )
})

test('rewriteInternalAttributionLinksInHtml safely escapes apostrophes', () => {
  assert.equal(
    rewriteInternalAttributionLinksInHtml(
      `<a href="/buyers'guide?source=blog-guide">Open</a>`,
    ),
    '<a href="/buyers&#39;guide" data-source="blog-guide">Open</a>',
  )
})

test('rewriteInternalAttributionLinksInHtml preserves single-quoted attributes', () => {
  assert.equal(
    rewriteInternalAttributionLinksInHtml(
      "<a href='/quote?source=blog-guide'>Open</a>",
    ),
    "<a href='/quote' data-source='blog-guide'>Open</a>",
  )
})

test('parseStoredAttributionSource accepts recent valid data and rejects stale data', () => {
  const now = 2_000_000
  const recent = JSON.stringify({ source: 'blog-guide', capturedAt: now - 1_000 })
  const stale = JSON.stringify({ source: 'blog-guide', capturedAt: now - 31 * 60 * 1_000 })

  assert.equal(parseStoredAttributionSource(recent, now), 'blog-guide')
  assert.equal(parseStoredAttributionSource(stale, now), undefined)
  assert.equal(parseStoredAttributionSource('{not-json', now), undefined)
})
