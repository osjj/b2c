import test from 'node:test'
import assert from 'node:assert/strict'

import { normalizeSitemapImageUrls } from './sitemap-images'

test('normalizeSitemapImageUrls resolves site-relative paths and keeps HTTPS CDN URLs', () => {
  assert.deepEqual(
    normalizeSitemapImageUrls('https://www.laifappe.com', [
      '/products/helmet.webp',
      'https://cdn.example.com/products/gloves.webp',
    ]),
    [
      'https://www.laifappe.com/products/helmet.webp',
      'https://cdn.example.com/products/gloves.webp',
    ]
  )
})

test('normalizeSitemapImageUrls deduplicates normalized URLs in first-seen order', () => {
  assert.deepEqual(
    normalizeSitemapImageUrls('https://www.laifappe.com', [
      'https://cdn.example.com/products/../helmet.webp',
      'https://cdn.example.com/helmet.webp',
      '/products/gloves.webp',
      '/products/gloves.webp',
    ]),
    [
      'https://cdn.example.com/helmet.webp',
      'https://www.laifappe.com/products/gloves.webp',
    ]
  )
})

test('normalizeSitemapImageUrls skips unsafe and malformed candidates', () => {
  assert.deepEqual(
    normalizeSitemapImageUrls('https://www.laifappe.com', [
      '',
      '   ',
      null,
      undefined,
      'http://cdn.example.com/insecure.webp',
      'data:image/webp;base64,AAAA',
      'blob:https://www.laifappe.com/example',
      'ftp://cdn.example.com/image.webp',
      'https://user:secret@cdn.example.com/private.webp',
      '/admin/image-preview/example.webp',
      '/api/admin/images/example.webp',
      '/assets/admin-preview/example.webp',
      '/admin-preview',
      '/\\cdn.example.com/origin-escape.webp',
      'not a site-relative URL',
      'https://',
    ]),
    []
  )
})

test('normalizeSitemapImageUrls rejects XML-unsafe ampersands', () => {
  assert.deepEqual(
    normalizeSitemapImageUrls('https://www.laifappe.com', [
      'https://cdn.example.com/image.webp?width=1200&quality=90',
      '/image.webp?width=1200&quality=90',
      'https://cdn.example.com/image.webp?label=one%26two',
    ]),
    ['https://cdn.example.com/image.webp?label=one%26two']
  )
})

test('normalizeSitemapImageUrls requires HTTPS after resolving a relative path', () => {
  assert.deepEqual(
    normalizeSitemapImageUrls('http://localhost:3000', [
      '/products/local-preview.webp',
      'https://cdn.example.com/products/live.webp',
    ]),
    ['https://cdn.example.com/products/live.webp']
  )
})
