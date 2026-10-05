import assert from 'node:assert/strict'
import test, { after, before } from 'node:test'

import { casePrivateImageUrl } from './private-image-path'
import { southAfricaMiningDraft } from './south-africa-draft'
import { refreshSouthAfricaCase, SOUTH_AFRICA_CASE_ID, SOUTH_AFRICA_CASE_SLUG, SOUTH_AFRICA_SOURCE_HASHES } from './south-africa-editorial-refresh'
import { makeSouthAfricaPublicImagePlan, SOUTH_AFRICA_PUBLIC_IMAGE_PERMISSION } from './south-africa-public-images'
import { caseInputSchema, hasCasePrivateImages, toAdminCaseView } from './types'
import type { AdminCaseView } from './types'

const PUBLIC_BASE = 'https://shop.laifappe.com'
const previousPublicBase = process.env.R2_PUBLIC_URL
before(() => { process.env.R2_PUBLIC_URL = PUBLIC_BASE })
after(() => {
  if (previousPublicBase === undefined) delete process.env.R2_PUBLIC_URL
  else process.env.R2_PUBLIC_URL = previousPublicBase
})

function source(): AdminCaseView {
  const gallery = SOUTH_AFRICA_SOURCE_HASHES.map((hash, index) => ({
    url: casePrivateImageUrl(SOUTH_AFRICA_CASE_ID, hash, [3, 4, 5, 6, 8].includes(index) ? 'jpg' : 'png'),
    alt: `Original source image ${index + 1}`, caption: `Original evidence caption ${index + 1}`,
  }))
  const current = toAdminCaseView({
    ...southAfricaMiningDraft, id: SOUTH_AFRICA_CASE_ID, version: 8, gallery,
    coverImage: gallery[0].url, coverAlt: gallery[0].alt,
    cooperationDate: new Date('2026-08-02'), publishedAt: null,
    createdAt: new Date('2026-10-05'), updatedAt: new Date('2026-10-05'),
  })
  return { ...current, ...refreshSouthAfricaCase(current) }
}

test('plans exact public keys for all sixteen originals while retaining draft status', () => {
  const current = source()
  const { candidate, objects, alreadyPublic } = makeSouthAfricaPublicImagePlan(current, PUBLIC_BASE)
  assert.equal(alreadyPublic, false)
  assert.equal(objects.length, 16)
  assert.equal(objects.filter(({ extension }) => extension === 'jpg').length, 5)
  objects.forEach((object, index) => {
    assert.equal(object.sha256, SOUTH_AFRICA_SOURCE_HASHES[index])
    assert.equal(object.sourceUrl, current.gallery[index].url)
    assert.equal(object.key, `cases/${SOUTH_AFRICA_CASE_SLUG}/${object.sha256}.${object.extension}`)
    assert.equal(object.url, `${PUBLIC_BASE}/${object.key}`)
    assert.equal(candidate.gallery[index].url, object.url)
  })
  assert.equal(candidate.coverImage, objects[0].url)
  assert.equal(candidate.status, 'DRAFT')
  assert.equal(candidate.publicationApproved, false)
  assert.equal(hasCasePrivateImages(candidate), false)
  assert.match(candidate.privateNotes, /without another review or redaction round/)
  assert.match(candidate.privateNotes, /does not authorize publishing the case/)
})

test('preserves prose, commercial facts, original alt/captions/order and inline associations without mutation', () => {
  const current = source()
  const snapshot = JSON.stringify(current)
  const { candidate } = makeSouthAfricaPublicImagePlan(current, `${PUBLIC_BASE}/`)
  assert.equal(JSON.stringify(current), snapshot)
  const oldInput = caseInputSchema.parse(current)
  const { coverImage: oldCover, gallery: oldGallery, privateNotes: oldNotes, ...oldFields } = oldInput
  const { coverImage: newCover, gallery: newGallery, privateNotes: newNotes, ...newFields } = candidate
  assert.notEqual(oldCover, newCover)
  assert.equal(newNotes, `${oldNotes}\n\n${SOUTH_AFRICA_PUBLIC_IMAGE_PERMISSION}`)
  assert.deepEqual(newFields, oldFields)
  assert.deepEqual(newGallery.map(({ alt, caption, placement }) => ({ alt, caption, placement })), oldGallery.map(({ alt, caption, placement }) => ({ alt, caption, placement })))
  assert.deepEqual(candidate.procurement.map(({ quantity, unit }) => ({ quantity, unit })), [
    { quantity: 500, unit: 'pieces' }, { quantity: 1200, unit: 'pairs' },
    { quantity: 4800, unit: 'pairs' }, { quantity: 200, unit: 'pairs' },
    { quantity: 200, unit: 'pairs' }, { quantity: 200, unit: 'sets' },
  ])
})

test('a complete saved public plan is idempotent and records permission only once', () => {
  const current = source()
  const first = makeSouthAfricaPublicImagePlan(current, PUBLIC_BASE)
  const saved = { ...current, ...first.candidate, version: 9 }
  const second = makeSouthAfricaPublicImagePlan(saved, PUBLIC_BASE)
  assert.equal(second.alreadyPublic, true)
  assert.deepEqual(second.candidate, first.candidate)
  assert.deepEqual(second.objects, first.objects)
  assert.equal(second.candidate.privateNotes.split(SOUTH_AFRICA_PUBLIC_IMAGE_PERMISSION).length, 2)
  assert.throws(() => makeSouthAfricaPublicImagePlan({ ...saved, privateNotes: current.privateNotes }, PUBLIC_BASE))
})

test('rejects unsafe, nonconfigured and nonroot public origins', () => {
  const current = source()
  for (const base of [
    'http://shop.laifappe.com', 'https://unapproved.example', `${PUBLIC_BASE}/images`,
    `${PUBLIC_BASE}?token=private`, `${PUBLIC_BASE}#fragment`, 'https://user:password@shop.laifappe.com',
    'not-a-url', 'https://SHOP.laifappe.com', `${PUBLIC_BASE}//`,
  ]) assert.throws(() => makeSouthAfricaPublicImagePlan(current, base))
  process.env.R2_PUBLIC_URL = 'https://media.laifappe.com'
  try {
    assert.throws(() => makeSouthAfricaPublicImagePlan(current, PUBLIC_BASE))
    assert.equal(makeSouthAfricaPublicImagePlan(current, 'https://media.laifappe.com').objects[0].url.startsWith('https://media.laifappe.com/'), true)
  } finally {
    process.env.R2_PUBLIC_URL = PUBLIC_BASE
  }
})

test('rejects wrong targets, publication flags, unknown originals, missing entries and mixed or reordered references', () => {
  const current = source()
  const publicPlan = makeSouthAfricaPublicImagePlan(current, PUBLIC_BASE)
  for (const changed of [
    { ...current, id: 'cmuu1gcon0000um188vsx2o89' },
    { ...current, slug: 'another-case' },
    { ...current, status: 'PUBLISHED' as const },
    { ...current, status: 'ARCHIVED' as const },
    { ...current, publicationApproved: true },
    { ...current, publishedAt: '2026-10-05T00:00:00.000Z' },
    { ...current, gallery: current.gallery.slice(1) },
    { ...current, coverImage: current.gallery[1].url },
    { ...current, coverImage: current.gallery[current.gallery.length - 1].url, gallery: [...current.gallery].reverse() },
    { ...current, ...publicPlan.candidate, coverImage: publicPlan.candidate.gallery[15].url, gallery: [...publicPlan.candidate.gallery].reverse() },
    { ...current, gallery: current.gallery.map((image, i) => i === 1 ? { ...image, url: publicPlan.objects[i].url } : image) },
    { ...current, gallery: current.gallery.map((image, i) => i === 1 ? { ...image, url: image.url.replace(SOUTH_AFRICA_CASE_ID, 'cmuu1gcon0000um188vsx2o89') } : image) },
    { ...current, gallery: current.gallery.map((image, i) => i === 3 ? { ...image, url: image.url.replace('.jpg', '.png') } : image) },
    { ...current, gallery: current.gallery.map((image, i) => i === 1 ? { ...image, url: image.url.replace(SOUTH_AFRICA_SOURCE_HASHES[i], '0'.repeat(64)) } : image) },
  ]) assert.throws(() => makeSouthAfricaPublicImagePlan(changed, PUBLIC_BASE))
})

test('approved public URLs remove private-media validation errors without granting case-publication approval', () => {
  const { candidate } = makeSouthAfricaPublicImagePlan(source(), PUBLIC_BASE)
  const notApproved = caseInputSchema.safeParse({ ...candidate, status: 'PUBLISHED' })
  assert.equal(notApproved.success, false)
  if (!notApproved.success) {
    assert.deepEqual(notApproved.error.issues.map(({ path }) => path), [['publicationApproved']])
  }
  assert.equal(caseInputSchema.safeParse({ ...candidate, status: 'PUBLISHED', publicationApproved: true }).success, true)
  assert.equal(candidate.status, 'DRAFT')
  assert.equal(candidate.publicationApproved, false)
})
