import assert from 'node:assert/strict'
import test from 'node:test'

import { southAfricaMiningDraft } from './south-africa-draft'
import { caseViewSchema } from './types'
import { SOUTH_AFRICA_READING_ID, SOUTH_AFRICA_READING_MEDIA, SOUTH_AFRICA_READING_SLUG, SOUTH_AFRICA_READING_VERSION, southAfricaReadingCandidate } from './south-africa-reading-candidate'

function fixture() {
  const keys = ['buyer-visit', 'buyer-visit', 'gloves-workshop', 'footwear-rain-boots', 'footwear-rain-boots', 'workwear-branding', 'helmet-branding', 'packing-loading', 'packing-loading', 'gloves-workshop', 'footwear-rain-boots', 'helmet-branding', 'workwear-branding', 'warehouse-progress', 'packing-loading', 'quotation-preparation']
  return caseViewSchema.parse({
    ...southAfricaMiningDraft, id: SOUTH_AFRICA_READING_ID, slug: SOUTH_AFRICA_READING_SLUG, version: SOUTH_AFRICA_READING_VERSION,
    coverImage: `https://shop.laifappe.com${SOUTH_AFRICA_READING_MEDIA[0]}`, coverAlt: 'Original visit photograph',
    gallery: keys.map((key, index) => ({ url: `https://shop.laifappe.com${SOUTH_AFRICA_READING_MEDIA[index]}`, alt: `Original ${index}`, caption: `Existing caption ${index}`, placement: `section:${key}` })),
    publishedAt: '2026-10-06T00:00:00.000Z', createdAt: '2026-10-05T00:00:00.000Z', updatedAt: '2026-10-06T00:00:00.000Z',
  })
}

test('candidate preserves media identity, commercial quantities, dates and SEO without mutating its source', () => {
  const source = fixture()
  const original = structuredClone(source)
  const candidate = southAfricaReadingCandidate(source)
  assert.deepEqual(source, original)
  assert.equal(candidate.sections.length, 4)
  assert.deepEqual(candidate.gallery.map(({ url, alt }) => ({ url, alt })), source.gallery.map(({ url, alt }) => ({ url, alt })))
  assert.deepEqual(candidate.procurement.map(({ name, quantity, unit, note }) => ({ name, quantity, unit, note })), source.procurement)
  for (const field of ['id', 'slug', 'version', 'cooperationDate', 'coverImage', 'coverAlt', 'customization', 'seoTitle', 'seoDescription', 'publishedAt', 'updatedAt'] as const) assert.equal(candidate[field], source[field], field)
  assert.deepEqual(candidate.timeline, source.timeline)
  assert.equal(candidate.gallery.filter(({ kind }) => kind === 'document').length, 6)
  assert.equal(candidate.gallery[13].placement, 'project-timeline')
  assert.equal(candidate.gallery[6].url, source.gallery[6].url, 'Current helmet image must not revert to historical draft media')
  assert.equal('privateNotes' in candidate, false)
  const body = candidate.sections.map(({ body }) => body).join('\n')
  assert.match(body, /30% deposit/)
  assert.match(body, /approximately ten days/)
  assert.match(body, /final delivery has not been verified/)
  assert.match(body, /have not been independently verified/)
})

test('changed quantities, media order, another case and private media require source review', () => {
  const source = fixture()
  assert.throws(() => southAfricaReadingCandidate({ ...source, id: 'another-id' }))
  assert.throws(() => southAfricaReadingCandidate({ ...source, version: SOUTH_AFRICA_READING_VERSION - 1 }))
  assert.throws(() => southAfricaReadingCandidate({ ...source, version: SOUTH_AFRICA_READING_VERSION + 1 }))
  assert.throws(() => southAfricaReadingCandidate({ ...source, slug: 'another-case' }))
  assert.throws(() => southAfricaReadingCandidate({ ...source, gallery: source.gallery.slice(1) }))
  assert.throws(() => southAfricaReadingCandidate({ ...source, gallery: [...source.gallery].reverse() }))
  const swapped = structuredClone(source)
  const firstFootwear = swapped.gallery[3]
  swapped.gallery[3] = swapped.gallery[4]
  swapped.gallery[4] = firstFootwear
  assert.throws(() => southAfricaReadingCandidate(swapped), 'Swapping media within one placement must not change its reviewed caption')
  assert.throws(() => southAfricaReadingCandidate({ ...source, gallery: source.gallery.map((image, index) => index === 6 ? { ...image, url: 'https://shop.laifappe.com/products/unreviewed.webp' } : image) }))
  assert.throws(() => southAfricaReadingCandidate({ ...source, procurement: source.procurement.map((item, index) => ({ ...item, quantity: index === 0 ? 999 : item.quantity })) }))
  assert.throws(() => southAfricaReadingCandidate({ ...source, coverImage: '/api/admin/case-images/c' + 'a'.repeat(24) + '/' + 'a'.repeat(64) + '.png' }))
})
