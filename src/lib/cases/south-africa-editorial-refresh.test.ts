import assert from 'node:assert/strict'
import test from 'node:test'

import { southAfricaMiningDraft } from './south-africa-draft'
import { casePrivateImageUrl } from './private-image-path'
import { toAdminCaseView } from './types'
import { refreshSouthAfricaCase, repairSouthAfricaCaseLayout, SOUTH_AFRICA_CASE_ID, SOUTH_AFRICA_SOURCE_HASHES } from './south-africa-editorial-refresh'

function source() {
  const gallery = SOUTH_AFRICA_SOURCE_HASHES.map((hash, index) => ({
    url: casePrivateImageUrl(SOUTH_AFRICA_CASE_ID, hash, [3, 4, 5, 6, 8].includes(index) ? 'jpg' : 'png'),
    alt: `Original source image ${index + 1}`, caption: `Original evidence caption ${index + 1}`,
  }))
  return toAdminCaseView({
    ...southAfricaMiningDraft, id: SOUTH_AFRICA_CASE_ID, version: 5, gallery,
    coverImage: gallery[0].url, coverAlt: gallery[0].alt,
    cooperationDate: new Date('2026-08-02'), publishedAt: null,
    createdAt: new Date('2026-10-05'), updatedAt: new Date('2026-10-05'),
  })
}

test('editorial refresh assigns all16 unchanged originals to eight factual chapters', () => {
  const before = source()
  const after = refreshSouthAfricaCase(before)
  assert.equal(after.sections.length, 8)
  assert.equal(after.gallery.length, 16)
  assert.equal(new Set(after.gallery.map(({ placement }) => placement)).size, 8)
  assert.equal(after.gallery.every(({ placement }) => after.sections.some(({ key }) => placement === `section:${key}`)), true)
  assert.deepEqual(after.gallery.map(({ url, alt, caption }) => ({ url, alt, caption })), before.gallery)
  for (const field of ['title', 'slug', 'country', 'industry', 'cooperationDate', 'procurement', 'customization', 'timeline', 'coverImage', 'coverAlt', 'relatedLinks', 'privateNotes', 'status', 'publicationApproved', 'seoTitle', 'seoDescription'] as const) {
    assert.deepEqual(after[field], before[field], field)
  }
  assert.match(after.sections.find(({ key }) => key === 'quotation-preparation')?.body ?? '', /200 sets/)
  assert.match(after.sections.find(({ key }) => key === 'warehouse-progress')?.body ?? '', /Final delivery has not been verified/)
})

test('refresh is pure/idempotent and refuses reordered, missing or foreign source media', () => {
  const before = source()
  const serialized = JSON.stringify(before)
  const after = refreshSouthAfricaCase(before)
  assert.equal(JSON.stringify(before), serialized)
  assert.deepEqual(refreshSouthAfricaCase({ ...before, ...after }), after)
  assert.throws(() => refreshSouthAfricaCase({ ...before, gallery: [...before.gallery].reverse() }))
  assert.throws(() => refreshSouthAfricaCase({ ...before, gallery: before.gallery.slice(1) }))
  assert.throws(() => refreshSouthAfricaCase({ ...before, id: 'unrelated-case' }))
  assert.throws(() => refreshSouthAfricaCase({ ...before, status: 'PUBLISHED', publicationApproved: true }))
})

test('layout repair fills missing associations while preserving current edited prose and originals', () => {
  const base = source()
  const refreshed = refreshSouthAfricaCase(base)
  const current = {
    ...base, ...refreshed, version: 7,
    summary: 'Owner-edited summary', buyerProfile: 'Owner-edited buyer profile',
    sections: refreshed.sections.map(({ title, body }) => ({ title, body: `${body}\n\nOwner-edited factual note.` })),
    gallery: refreshed.gallery.map(({ url, alt, caption }) => ({ url, alt, caption })),
  }
  const serialized = JSON.stringify(current)
  const repaired = repairSouthAfricaCaseLayout(current)
  assert.equal(JSON.stringify(current), serialized)
  assert.deepEqual(repaired.sections.map(({ title, body }) => ({ title, body })), current.sections)
  assert.deepEqual(repaired.gallery.map(({ url, alt, caption }) => ({ url, alt, caption })), current.gallery)
  assert.equal(repaired.summary, current.summary)
  assert.equal(repaired.buyerProfile, current.buyerProfile)
  assert.deepEqual(repairSouthAfricaCaseLayout({ ...current, ...repaired }), repaired)
  assert.equal(repaired.gallery.every(({ placement }) => Boolean(placement)), true)
  assert.equal(repaired.status, 'DRAFT')
  assert.equal(repaired.publicationApproved, false)
})

test('layout repair rejects changed order, nonempty editorial assignments and public records', () => {
  const base = source()
  const current = { ...base, ...refreshSouthAfricaCase(base) }
  assert.throws(() => repairSouthAfricaCaseLayout({ ...current, sections: [...current.sections].reverse() }))
  assert.throws(() => repairSouthAfricaCaseLayout({ ...current, sections: current.sections.map((section, i) => i === 0 ? { ...section, key: 'owner-new-key' } : section) }))
  assert.throws(() => repairSouthAfricaCaseLayout({ ...current, gallery: current.gallery.map((image, i) => i === 0 ? { ...image, placement: 'buyer-context' } : image) }))
  assert.throws(() => repairSouthAfricaCaseLayout({ ...current, gallery: [...current.gallery].reverse() }))
  assert.throws(() => repairSouthAfricaCaseLayout({ ...current, status: 'PUBLISHED', publicationApproved: true }))
  assert.throws(() => repairSouthAfricaCaseLayout({ ...current, publishedAt: '2026-10-05T00:00:00Z' }))
})
