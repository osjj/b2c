import assert from 'node:assert/strict'
import test from 'node:test'

import { southAfricaMiningDraft } from './south-africa-draft'
import {
  caseInputSchema, emptyCaseInput, isAllowedCaseImage, isAllowedCaseRelatedLink,
  isCaseDate, publicCaseView, toAdminCaseView, toCaseView,
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
