import assert from 'node:assert/strict'
import test from 'node:test'

import { caseImagesAt, caseUnplacedImages } from './layout'
import { southAfricaMiningDraft } from './south-africa-draft'
import { SOUTH_AFRICA_READING_MEDIA } from './south-africa-reading-candidate'
import { SOUTH_AFRICA_NARRATIVE_ID, SOUTH_AFRICA_NARRATIVE_SLUG, SOUTH_AFRICA_NARRATIVE_VERSION, southAfricaNarrativeCandidate } from './south-africa-narrative'
import { caseInputSchema, caseViewSchema, emptyCaseInput } from './types'

function fixture() {
  const keys = ['buyer-visit', 'buyer-visit', 'gloves-workshop', 'footwear-rain-boots', 'footwear-rain-boots', 'workwear-branding', 'helmet-branding', 'packing-loading', 'packing-loading', 'gloves-workshop', 'footwear-rain-boots', 'helmet-branding', 'workwear-branding', 'warehouse-progress', 'packing-loading', 'quotation-preparation']
  const hrefs = ['/categories/head-protection/safety-helmets', '/categories/hand-protection/cut-resistant-gloves', '/categories/hand-protection/knit-gloves', '/categories/foot-protection/safety-shoes', '/categories/foot-protection/safety-rain-boots', '/categories/body-protection']
  return caseViewSchema.parse({
    ...southAfricaMiningDraft,
    id: SOUTH_AFRICA_NARRATIVE_ID, slug: SOUTH_AFRICA_NARRATIVE_SLUG, version: SOUTH_AFRICA_NARRATIVE_VERSION,
    procurement: southAfricaMiningDraft.procurement.map((item, index) => ({ ...item, href: hrefs[index] })),
    coverImage: `https://shop.laifappe.com${SOUTH_AFRICA_READING_MEDIA[0]}`, coverAlt: 'Original visit photograph',
    gallery: keys.map((key, index) => ({ url: `https://shop.laifappe.com${SOUTH_AFRICA_READING_MEDIA[index]}`, alt: `Original accessible description ${index}`, caption: `Existing caption ${index}`, placement: `section:${key}` })),
    publishedAt: '2026-10-05T15:05:12.739Z', createdAt: '2026-10-04T16:31:48.023Z', updatedAt: '2026-10-26T01:58:00.209Z',
  })
}

test('the narrative preserves complete purchasing data, original media and publication metadata without mutating its source', () => {
  const source = fixture()
  const original = structuredClone(source)
  const candidate = southAfricaNarrativeCandidate(source)
  assert.deepEqual(source, original)
  assert.deepEqual(candidate.procurement, source.procurement, 'Do not downgrade the reviewed category links or alter notes/units')
  assert.deepEqual(candidate.timeline, source.timeline)
  assert.deepEqual(candidate.gallery.map(({ url, alt }) => ({ url, alt })), source.gallery.map(({ url, alt }) => ({ url, alt })))
  for (const field of ['id', 'slug', 'version', 'country', 'industry', 'cooperationDate', 'coverImage', 'coverAlt', 'customization', 'featured', 'sortOrder', 'seoTitle', 'publishedAt', 'createdAt', 'updatedAt'] as const) assert.equal(candidate[field], source[field], field)
  assert.equal(candidate.gallery.filter(({ kind }) => kind === 'document').length, 6)
  assert.equal('privateNotes' in candidate, false)
})

test('all sixteen original records have one valid place, with the cover removed only from its repeated inline position', () => {
  const candidate = southAfricaNarrativeCandidate(fixture())
  assert.deepEqual(caseUnplacedImages(candidate), [])
  const inline = candidate.sections.flatMap(({ key }) => caseImagesAt(candidate, `section:${key}`)).filter(({ image }) => image.url !== candidate.coverImage)
  const displayedIndexes = [0, ...inline.map(({ index }) => index)].sort((a, b) => a - b)
  assert.deepEqual(displayedIndexes, Array.from({ length: 16 }, (_, index) => index))
  const invalid = { ...emptyCaseInput(), ...candidate, status: 'PUBLISHED', gallery: candidate.gallery.map((image, index) => index === 1 ? { ...image, placement: 'section:missing-section' } : image) }
  assert.equal(caseInputSchema.safeParse(invalid).success, false)
})

test('a changed target, version, order, date, category link or media requires source review', () => {
  const source = fixture()
  assert.throws(() => southAfricaNarrativeCandidate({ ...source, id: 'another-case' }))
  assert.throws(() => southAfricaNarrativeCandidate({ ...source, slug: 'another-case' }))
  assert.throws(() => southAfricaNarrativeCandidate({ ...source, version: 11 }))
  assert.throws(() => southAfricaNarrativeCandidate({ ...source, version: 13 }))
  assert.throws(() => southAfricaNarrativeCandidate({ ...source, cooperationDate: '2026-08-03' }))
  assert.throws(() => southAfricaNarrativeCandidate({ ...source, procurement: source.procurement.map((item, index) => index === 5 ? { ...item, unit: 'pieces' } : item) }))
  assert.throws(() => southAfricaNarrativeCandidate({ ...source, procurement: source.procurement.map((item, index) => index === 0 ? { ...item, href: '/categories/head-protection' } : item) }))
  assert.throws(() => southAfricaNarrativeCandidate({ ...source, procurement: source.procurement.map((item, index) => index === 0 ? { ...item, quantity: 600 } : item) }))
  assert.throws(() => southAfricaNarrativeCandidate({ ...source, gallery: [...source.gallery].reverse() }))
  assert.throws(() => southAfricaNarrativeCandidate({ ...source, gallery: source.gallery.slice(1) }))
  assert.throws(() => southAfricaNarrativeCandidate({ ...source, gallery: source.gallery.map((image, index) => index === 6 ? { ...image, url: 'https://shop.laifappe.com/products/unreviewed.webp' } : image) }))
  assert.throws(() => southAfricaNarrativeCandidate({ ...source, coverImage: `/api/admin/case-images/c${'a'.repeat(24)}/${'a'.repeat(64)}.png` }))
})

test('the new buyer guidance retains evidence boundaries and uses supported link fields', () => {
  const candidate = southAfricaNarrativeCandidate(fixture())
  const body = candidate.sections.map(({ body }) => body).join('\n')
  const captions = candidate.gallery.map(({ caption }) => caption).join('\n')
  assert.match(body, /30% deposit/)
  assert.match(body, /approximately ten days for this order/)
  assert.match(body, /final delivery to the mining company has not been verified/i)
  assert.match(body, /have not been independently verified/)
  assert.match(body, /confirmed workwear quantity remains 200 sets/)
  assert.match(captions, /main page is unavailable/)
  assert.match(captions, /no flame-resistance or chemical-protection rating/)
  assert.match(body, /logo artwork, destination and target date/)
  assert.doesNotMatch(body, /https?:\/\/|\]\(|<a\b|80%/)
  assert.ok(candidate.relatedLinks.some(({ href }) => href === '/quote'))
  assert.ok(candidate.relatedLinks.some(({ href }) => href === '/blog/ppe-sample-approval-pre-shipment-checklist'))
})
