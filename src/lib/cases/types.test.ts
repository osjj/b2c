import assert from 'node:assert/strict'
import test from 'node:test'

import { southAfricaMiningDraft } from './south-africa-draft'
import {
  caseInputSchema, emptyCaseInput, isAllowedCaseImage, isAllowedCaseRelatedLink, isAllowedCaseProcurementLink,
  isCaseDate, isCaseGalleryPlacement, isCaseSectionKey, publicCaseView, toAdminCaseView, toCaseView,
} from './types'
import { casePrivateImageUrl } from './private-image-path'

const privateImage = casePrivateImageUrl('cmuu1gcon0000um188vsx2o88', 'a'.repeat(64), 'png')

test('calendar dates are validated without silent normalization', () => {
  for (const value of ['', '2026-08-02', '2024-02-29']) assert.equal(isCaseDate(value), true)
  for (const value of ['2026-02-29', '2026-02-30', '2026-13-01', '20260802', '2026-8-2']) assert.equal(isCaseDate(value), false)
})

test('images reject arbitrary hosts, signed links and unsafe local paths', () => {
  assert.equal(isAllowedCaseImage('/homepage/oem-odm-workwear-programs.png'), true)
  const configured = process.env.R2_PUBLIC_URL || 'https://shop.laifappe.com'
  assert.equal(isAllowedCaseImage(`${configured}/cases/helmet.jpg`), true)
  for (const url of ['javascript:alert(1)', 'data:image/png;base64,123', 'blob:x', '//evil.com/a.jpg', '/cases/../private.jpg', '/cases/%2e%2e/a.jpg', '/a.jpg?x=1', 'https://notion.so/signed.jpg?token=x', 'https://evil.com/a.jpg', 'https://shop.laifappe.com.evil.com/a.jpg', `${configured}/cases/../private.jpg`, `${configured}/cases/%2e%2e/private.jpg`]) {
    assert.equal(isAllowedCaseImage(url), false, url)
  }
})

test('related links only permit canonical internal storefront paths', () => {
  for (const href of ['/products/safety-helmet', '/solutions/mining-quarry-ppe-solution', '/cases/example', '/quote', '/contact']) {
    assert.equal(isAllowedCaseRelatedLink(href), true)
  }
  for (const href of ['/admin/cases', '/api/a', '/login', '/products/a?utm_source=x', '//evil.com/a', 'https://www.laifappe.com/blog/a', '/products/../admin']) {
    assert.equal(isAllowedCaseRelatedLink(href), false)
  }
})

test('optional product links and document roles preserve legacy records and public projection', () => {
  for (const href of ['', '/products/helmet', '/categories/hand-protection']) assert.equal(isAllowedCaseProcurementLink(href), true)
  for (const href of ['/quote', '/blog/guide', '/admin/cases', '/categories/a?source=x', '/products/../admin', '//evil.com/a', 'https://www.laifappe.com/products/a']) assert.equal(isAllowedCaseProcurementLink(href), false, href)
  const enriched = {
    ...record(), procurement: [{ ...southAfricaMiningDraft.procurement[0], href: '/categories/head-protection' }],
    gallery: [{ url: '/cases/document.png', alt: 'Supporting record', caption: 'Recorded document', kind: 'document' }],
  }
  const view = toCaseView(enriched)
  assert.equal(view.procurement[0].href, '/categories/head-protection')
  assert.equal(view.gallery[0].kind, 'document')
  assert.deepEqual(publicCaseView(toAdminCaseView(enriched)), view)
  assert.equal(caseInputSchema.safeParse({ ...southAfricaMiningDraft, gallery: [{ ...enriched.gallery[0], kind: 'certificate' }] }).success, false)
  assert.equal(caseInputSchema.safeParse({ ...southAfricaMiningDraft, procurement: [{ ...enriched.procurement[0], href: '/api/secret' }] }).success, false)
})

test('draft supports absent images and retains the actual six quantities', () => {
  assert.equal(caseInputSchema.safeParse(southAfricaMiningDraft).success, true)
  assert.equal(southAfricaMiningDraft.status, 'DRAFT')
  assert.equal(southAfricaMiningDraft.publicationApproved, false)
  assert.equal(southAfricaMiningDraft.coverImage, '')
  assert.equal(southAfricaMiningDraft.gallery.length, 0)
  assert.deepEqual(southAfricaMiningDraft.procurement.map(({ quantity, unit }) => [quantity, unit]), [
    [500, 'pieces'], [1200, 'pairs'], [4800, 'pairs'], [200, 'pairs'], [200, 'pairs'], [200, 'sets'],
  ])
})

test('private image references are strictly shaped and never publishable', () => {
  assert.equal(isAllowedCaseImage(privateImage), true)
  const configured = process.env.R2_PUBLIC_URL || 'https://shop.laifappe.com'
  for (const url of [`${privateImage}?token=x`, `${configured}${privateImage}`, privateImage.replace(/\.png$/, '.svg'), '/api/admin/case-images/bad/a.png', '/api/quotation-images/a.png', '/admin/private.png']) {
    assert.equal(isAllowedCaseImage(url), false, url)
  }
  const draft = {
    ...southAfricaMiningDraft, coverImage: privateImage, coverAlt: 'Original record',
    gallery: [{ url: privateImage, alt: 'Original record', caption: 'Private original' }],
  }
  assert.equal(caseInputSchema.safeParse(draft).success, true)
  assert.equal(caseInputSchema.safeParse({ ...draft, status: 'ARCHIVED' }).success, true)
  assert.equal(caseInputSchema.safeParse({ ...draft, status: 'PUBLISHED', publicationApproved: true }).success, false)
  assert.equal(caseInputSchema.safeParse({ ...draft, coverImage: '', status: 'PUBLISHED', publicationApproved: true }).success, false)
  assert.equal(caseInputSchema.safeParse({ ...draft, gallery: [], status: 'PUBLISHED', publicationApproved: true }).success, false)
  const admin = toAdminCaseView({ ...record(), ...draft, cooperationDate: new Date('2026-08-02') })
  assert.equal(publicCaseView(admin).gallery[0].url, privateImage, 'Protected preview retains private image references')
})

test('publication requires explicit approval and minimum content', () => {
  assert.equal(caseInputSchema.safeParse({ ...southAfricaMiningDraft, status: 'PUBLISHED' }).success, false)
  assert.equal(caseInputSchema.safeParse({ ...southAfricaMiningDraft, status: 'PUBLISHED', publicationApproved: true }).success, true)
  const empty = { ...emptyCaseInput(), title: 'New case', slug: 'new-case', status: 'PUBLISHED', publicationApproved: true }
  assert.equal(caseInputSchema.safeParse(empty).success, false)
})

test('quantities, row limits, date and accessible image text are enforced', () => {
  assert.equal(caseInputSchema.safeParse({ ...southAfricaMiningDraft, cooperationDate: '2026-02-30' }).success, false)
  assert.equal(caseInputSchema.safeParse({ ...southAfricaMiningDraft, coverImage: '/cases/helmet.jpg', coverAlt: '' }).success, false)
  assert.equal(caseInputSchema.safeParse({ ...southAfricaMiningDraft, procurement: [{ name: 'Gloves', quantity: 1.5, unit: 'pairs', note: '' }] }).success, false)
  assert.equal(caseInputSchema.safeParse({ ...southAfricaMiningDraft, procurement: [{ name: 'Gloves', quantity: -1, unit: 'pairs', note: '' }] }).success, false)
  assert.equal(caseInputSchema.safeParse({ ...southAfricaMiningDraft, sections: Array.from({ length: 21 }, () => ({ title: 'Section', body: 'Body' })) }).success, false)
})

function record() {
  return {
    ...southAfricaMiningDraft, id: 'case-id', version: 1,
    cooperationDate: new Date('2026-08-02T00:00:00.000Z'),
    createdAt: new Date('2026-10-05T00:00:00.000Z'), updatedAt: new Date('2026-10-05T00:00:00.000Z'),
    publishedAt: null,
  }
}

test('public serializers whitelist fields and never expose private evidence notes', () => {
  const view = toCaseView(record())
  assert.equal(view.cooperationDate, '2026-08-02')
  assert.equal('privateNotes' in view, false)
  assert.equal('status' in view, false)
  assert.equal('publicationApproved' in view, false)
  assert.equal(JSON.stringify(view).includes('ICR/VC/'), false)
  const admin = toAdminCaseView(record())
  assert.equal(admin.privateNotes.includes('SOURCE:'), true)
  assert.deepEqual(publicCaseView(admin), view)
})

test('malformed stored JSON is not trusted or substituted by invented fallback content', () => {
  assert.throws(() => toCaseView({ ...record(), procurement: { quantity: 'bad' } }))
  assert.throws(() => toCaseView({ ...record(), gallery: [{ url: 'javascript:alert(1)', alt: 'x', caption: '' }] }))
})

test('contextual image fields remain optional for legacy cases and survive serialization', () => {
  assert.equal(caseInputSchema.safeParse(southAfricaMiningDraft).success, true)
  const contextual = {
    ...record(),
    sections: [{ key: 'glove-workshop', title: 'Workshop', body: 'Recorded visit.' }],
    gallery: [{ url: '/cases/gloves.png', alt: 'Glove sample', caption: 'Sample record', placement: 'section:glove-workshop' }],
  }
  const view = toCaseView(contextual)
  assert.equal(view.sections[0].key, 'glove-workshop')
  assert.equal(view.gallery[0].placement, 'section:glove-workshop')
  assert.equal('privateNotes' in view, false)
  assert.equal(caseInputSchema.safeParse({ ...southAfricaMiningDraft, sections: [{ key: '', title: 'Section', body: 'Content' }] }).success, true)
})

test('stable keys and placement syntax reject unsafe or malformed identifiers', () => {
  for (const key of ['glove-workshop', 'story-2026', 'a'.repeat(80)]) assert.equal(isCaseSectionKey(key), true, key)
  for (const key of ['', 'Gloves', 'two--hyphens', '-gloves', 'gloves-', 'a b', 'section:gloves', 'a'.repeat(81)]) assert.equal(isCaseSectionKey(key), false, key)
  for (const placement of ['', 'buyer-context', 'procurement-scope', 'customization', 'project-timeline', 'section:glove-workshop']) assert.equal(isCaseGalleryPlacement(placement), true, placement)
  for (const placement of ['all-images', 'section:', 'section:Bad', 'section:gloves/x', 'javascript:alert(1)']) assert.equal(isCaseGalleryPlacement(placement), false, placement)
  const result = caseInputSchema.safeParse({ ...southAfricaMiningDraft, sections: [{ key: 'Bad key', title: 'Section', body: 'Content' }] })
  assert.equal(result.success, false)
  if (!result.success) assert.ok(result.error.issues.some((issue) => issue.path.join('.') === 'sections.0.key'))
})

test('duplicate section keys and nonexistent or empty image targets have precise field errors', () => {
  const image = { url: '/cases/evidence.png', alt: 'Documentary record', caption: '' }
  const duplicate = caseInputSchema.safeParse({
    ...southAfricaMiningDraft,
    sections: [{ key: 'duplicate', title: 'First', body: 'First body' }, { key: 'duplicate', title: 'Second', body: 'Second body' }],
  })
  assert.equal(duplicate.success, false)
  if (!duplicate.success) {
    assert.ok(duplicate.error.issues.some((issue) => issue.path.join('.') === 'sections.0.key'))
    assert.ok(duplicate.error.issues.some((issue) => issue.path.join('.') === 'sections.1.key'))
  }
  for (const placement of ['buyer-context', 'procurement-scope', 'customization', 'project-timeline', 'section:removed']) {
    const result = caseInputSchema.safeParse({
      ...emptyCaseInput(), title: 'Private case', slug: 'private-case', gallery: [{ ...image, placement }],
    })
    assert.equal(result.success, false, placement)
    if (!result.success) assert.ok(result.error.issues.some((issue) => issue.path.join('.') === 'gallery.0.placement'), placement)
  }
  const populated = {
    ...southAfricaMiningDraft,
    sections: [{ key: 'glove-workshop', title: 'Workshop', body: 'Recorded visit.' }],
    gallery: ['buyer-context', 'procurement-scope', 'customization', 'project-timeline', 'section:glove-workshop', ''].map((placement) => ({ ...image, placement })),
  }
  assert.equal(caseInputSchema.safeParse(populated).success, true)
})
