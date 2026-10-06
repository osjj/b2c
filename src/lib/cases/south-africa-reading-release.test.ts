import assert from 'node:assert/strict'
import test from 'node:test'

import { southAfricaMiningDraft } from './south-africa-draft'
import {
  SOUTH_AFRICA_READING_ID, SOUTH_AFRICA_READING_MEDIA, SOUTH_AFRICA_READING_SLUG,
  SOUTH_AFRICA_READING_VERSION, southAfricaReadingCandidate,
} from './south-africa-reading-candidate'
import { CASE_READING_RELEASE_FIELDS, prepareSouthAfricaReadingRelease } from './south-africa-reading-release'
import { adminCaseViewSchema, caseViewSchema } from './types'
import type { AdminCaseView, CaseView } from './types'

const now = new Date('2026-10-06T06:00:00.000Z')

function sourceFixture(): CaseView {
  const keys = ['buyer-visit', 'gloves-workshop', 'footwear-rain-boots', 'workwear-branding', 'helmet-branding', 'packing-loading', 'warehouse-progress', 'quotation-preparation']
  const placements = ['buyer-visit', 'buyer-visit', 'gloves-workshop', 'footwear-rain-boots', 'footwear-rain-boots', 'workwear-branding', 'helmet-branding', 'packing-loading', 'packing-loading', 'gloves-workshop', 'footwear-rain-boots', 'helmet-branding', 'workwear-branding', 'warehouse-progress', 'packing-loading', 'quotation-preparation']
  return caseViewSchema.parse({
    ...southAfricaMiningDraft, id: SOUTH_AFRICA_READING_ID, slug: SOUTH_AFRICA_READING_SLUG,
    version: SOUTH_AFRICA_READING_VERSION, coverImage: `https://shop.laifappe.com${SOUTH_AFRICA_READING_MEDIA[0]}`,
    coverAlt: 'Original buyer visit photograph',
    sections: keys.map((key) => ({ key, title: `Original ${key}`, body: `Source-backed notes for ${key}.` })),
    gallery: placements.map((key, index) => ({ url: `https://shop.laifappe.com${SOUTH_AFRICA_READING_MEDIA[index]}`, alt: `Original record ${index}`, caption: `Original caption ${index}`, placement: `section:${key}` })),
    publishedAt: '2026-10-05T15:00:00.000Z', createdAt: '2026-10-04T16:00:00.000Z', updatedAt: '2026-10-06T03:20:15.195Z',
  })
}

function currentFixture(source: CaseView): AdminCaseView {
  return adminCaseViewSchema.parse({ ...source, status: 'PUBLISHED', publicationApproved: true, privateNotes: 'Private review notes must remain untouched.' })
}

test('reviewed eligible source produces exactly seven fields without changing any input', () => {
  const source = sourceFixture()
  const candidate = southAfricaReadingCandidate(source)
  const current = currentFixture(source)
  const snapshots = structuredClone({ source, candidate, current })
  const plan = prepareSouthAfricaReadingRelease(current, source, candidate, now)
  assert.equal(plan.action, 'apply')
  if (plan.action !== 'apply') assert.fail('Expected the reviewed v11 apply plan')
  assert.equal(plan.expectedVersion, SOUTH_AFRICA_READING_VERSION)
  assert.equal(plan.expectedUpdatedAt, source.updatedAt)
  assert.deepEqual(Object.keys(plan.data), [...CASE_READING_RELEASE_FIELDS])
  for (const field of CASE_READING_RELEASE_FIELDS) assert.deepEqual(plan.data[field], candidate[field])
  assert.deepEqual(plan.data.gallery.map(({ url, alt }) => ({ url, alt })), source.gallery.map(({ url, alt }) => ({ url, alt })))
  assert.deepEqual(plan.data.procurement.map(({ name, quantity, unit, note }) => ({ name, quantity, unit, note })), source.procurement)
  for (const retained of ['slug', 'seoTitle', 'seoDescription', 'coverImage', 'timeline', 'customization', 'status', 'publicationApproved', 'privateNotes', 'publishedAt', 'createdAt']) assert.equal(retained in plan.data, false, retained)
  assert.deepEqual({ source, candidate, current }, snapshots)
})

test('exact previous application is unchanged while publication/private notes remain untouched', () => {
  const source = sourceFixture()
  const candidate = southAfricaReadingCandidate(source)
  const current = currentFixture({ ...candidate, version: SOUTH_AFRICA_READING_VERSION + 1, updatedAt: '2026-10-06T05:00:00.000Z' })
  const snapshot = structuredClone(current)
  assert.deepEqual(prepareSouthAfricaReadingRelease(current, source, candidate, now), { action: 'unchanged' })
  assert.deepEqual(current, snapshot)
  assert.throws(() => prepareSouthAfricaReadingRelease({ ...current, version: SOUTH_AFRICA_READING_VERSION }, source, candidate, now), 'Matching content without the committed version increment is not an application')
})

test('wrong identity, stale or newer unreviewed source and any candidate changes are refused', () => {
  const source = sourceFixture()
  const candidate = southAfricaReadingCandidate(source)
  const current = currentFixture(source)
  for (const changedSource of [
    { ...source, id: 'another-case-id' }, { ...source, slug: 'another-case' },
    { ...source, version: SOUTH_AFRICA_READING_VERSION - 1 }, { ...source, version: SOUTH_AFRICA_READING_VERSION + 1 },
  ]) assert.throws(() => prepareSouthAfricaReadingRelease(current, changedSource, candidate, now))
  for (const changedCurrent of [
    { ...current, version: SOUTH_AFRICA_READING_VERSION + 1 },
    { ...current, updatedAt: '2026-10-06T05:00:00.000Z' },
    { ...current, title: 'Unreviewed source title' },
    { ...current, seoTitle: 'Unreviewed retained SEO title' },
  ]) assert.throws(() => prepareSouthAfricaReadingRelease(changedCurrent, source, candidate, now))
  for (const changedCandidate of [
    { ...candidate, title: 'Unreviewed title' },
    { ...candidate, seoDescription: 'Unreviewed SEO description' },
    { ...candidate, procurement: candidate.procurement.map((item, index) => index === 0 ? { ...item, quantity: 999 } : item) },
    { ...candidate, gallery: [...candidate.gallery].reverse() },
    { ...candidate, gallery: candidate.gallery.map((image, index) => index === 9 ? { ...image, kind: 'photo' as const } : image) },
  ]) assert.throws(() => prepareSouthAfricaReadingRelease(current, source, changedCandidate, now))
})

test('draft, archived, unapproved, future, missing publication and private sources fail closed', () => {
  const source = sourceFixture()
  const candidate = southAfricaReadingCandidate(source)
  const current = currentFixture(source)
  const privateImage = `/api/admin/case-images/${SOUTH_AFRICA_READING_ID}/${'a'.repeat(64)}.png`
  for (const ineligible of [
    { ...current, status: 'DRAFT' as const }, { ...current, status: 'ARCHIVED' as const },
    { ...current, publicationApproved: false }, { ...current, publishedAt: null },
    { ...current, publishedAt: '2026-10-07T00:00:00.000Z' },
    { ...current, coverImage: privateImage },
    { ...current, gallery: current.gallery.map((image, index) => index === 1 ? { ...image, url: privateImage } : image) },
  ]) assert.throws(() => prepareSouthAfricaReadingRelease(ineligible, source, candidate, now))
  assert.throws(() => prepareSouthAfricaReadingRelease(current, source, candidate, new Date('invalid')))
})

test('repeat check rejects retained-field drift and an unreviewed candidate revision', () => {
  const source = sourceFixture()
  const candidate = southAfricaReadingCandidate(source)
  const applied = currentFixture({ ...candidate, version: SOUTH_AFRICA_READING_VERSION + 1, updatedAt: '2026-10-06T05:00:00.000Z' })
  for (const changed of [
    { ...applied, country: 'Another destination' },
    { ...applied, title: 'Later unreviewed revision' },
    { ...applied, publishedAt: '2026-10-05T14:00:00.000Z' },
    { ...applied, timeline: applied.timeline.slice(1) },
    { ...applied, customization: 'Unreviewed customization' },
  ]) assert.throws(() => prepareSouthAfricaReadingRelease(changed, source, candidate, now))
})
