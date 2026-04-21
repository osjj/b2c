import test from 'node:test'
import assert from 'node:assert/strict'
import { buildSiteUrl, getSiteUrl } from './site-url'

test('buildSiteUrl keeps explicit http or https protocol', () => {
  assert.equal(buildSiteUrl('https://laifappe.com'), 'https://www.laifappe.com')
  assert.equal(buildSiteUrl('https://www.laifappe.com'), 'https://www.laifappe.com')
  assert.equal(buildSiteUrl('http://localhost:3000'), 'http://localhost:3000')
})

test('buildSiteUrl adds https for bare production hosts', () => {
  assert.equal(buildSiteUrl('laifappe.com'), 'https://www.laifappe.com')
  assert.equal(buildSiteUrl('www.laifappe.com/'), 'https://www.laifappe.com')
})

test('buildSiteUrl falls back to localhost when site url is missing', () => {
  assert.equal(buildSiteUrl(undefined), 'http://localhost:3000')
  assert.equal(buildSiteUrl(''), 'http://localhost:3000')
})

test('getSiteUrl reads and normalizes NEXT_PUBLIC_SITE_URL', () => {
  const previous = process.env.NEXT_PUBLIC_SITE_URL
  process.env.NEXT_PUBLIC_SITE_URL = 'https://laifappe.com'

  try {
    assert.equal(getSiteUrl(), 'https://www.laifappe.com')
  } finally {
    if (previous === undefined) {
      delete process.env.NEXT_PUBLIC_SITE_URL
    } else {
      process.env.NEXT_PUBLIC_SITE_URL = previous
    }
  }
})
