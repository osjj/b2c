import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import test from 'node:test'

import type { AllocationPlan } from './footwear-size-allocation'
import {
  isFootwearInquiryDraftId,
  parseFootwearInquiry,
  saveFootwearInquiry,
  serializeFootwearInquiry,
} from './footwear-size-inquiry'

const draftId = '80b81022-1096-43c1-9ce1-fd159e25ff71'
const otherId = '65289926-c541-42aa-bf94-88390bac662e'
const now = Date.UTC(2026, 9, 30, 8)

function confirmedPlan(): AllocationPlan {
  return {
    valid: true,
    sparePercent: 10,
    errors: [],
    rows: [{
      key: '["Boot A","Black","eu","42"]',
      model: 'Boot A', color: 'Black', system: 'eu', size: '42',
      quantity: 15, spares: 2, suggestedQuantity: 17, orderQuantity: 18, overridden: true,
    }],
    totals: { workers: 15, spares: 3, order: 18 },
  }
}

test('RFQ restores the displayed final override and regenerates the complete message', () => {
  const serialized = serializeFootwearInquiry(confirmedPlan(), draftId, now)
  const draft = parseFootwearInquiry(serialized, draftId, now + 1000)
  assert.ok(draft)
  assert.equal(draft.plan.rows[0]?.orderQuantity, 18)
  assert.equal(draft.plan.totals.spares, 3)
  assert.match(draft.message, /EU 42/)
  assert.match(draft.message, /base 15.*order 18 pairs.*manual/i)
  assert.match(draft.message, /size chart/i)
  assert.equal(draft.id, draftId)
  assert.equal(draft.createdAt, now)
  assert.ok(draft.message.length <= 6000)
  assert.equal(JSON.parse(serialized).message, undefined)
})

test('RFQ preserves valid aggregate counts above the per-input quantity limit', () => {
  const plan = confirmedPlan()
  const row = plan.rows[0]
  assert.ok(row)
  Object.assign(row, { quantity: 200000, spares: 20000, suggestedQuantity: 220000, orderQuantity: 250000 })
  plan.totals = { workers: 200000, spares: 50000, order: 250000 }
  const draft = parseFootwearInquiry(serializeFootwearInquiry(plan, draftId, now), draftId, now)
  assert.equal(draft?.plan.rows[0]?.quantity, 200000)
  assert.equal(draft?.plan.rows[0]?.orderQuantity, 250000)
})

test('drafts fail closed for corruption, expiry, future dates and a different requested identity', () => {
  const serialized = serializeFootwearInquiry(confirmedPlan(), draftId, now)
  assert.equal(parseFootwearInquiry(null, draftId, now), null)
  assert.equal(parseFootwearInquiry('{broken', draftId, now), null)
  assert.equal(parseFootwearInquiry(serialized, otherId, now), null)
  assert.equal(parseFootwearInquiry(serialized, draftId, now - 1), null)
  assert.equal(parseFootwearInquiry(serialized, draftId, now + 2 * 60 * 60 * 1000), null)
  assert.ok(parseFootwearInquiry(serialized, draftId, now + 2 * 60 * 60 * 1000 - 1))
  assert.equal(parseFootwearInquiry(serialized, '../admin', now), null)
})

test('draft parser rejects changed versions, invalid rows, quantities and duplicate groups', () => {
  const stored = JSON.parse(serializeFootwearInquiry(confirmedPlan(), draftId, now))
  const invalidDrafts: unknown[] = [
    { ...stored, version: 2 },
    { ...stored, sparePercent: 100.01 },
    { ...stored, rows: [] },
    { ...stored, rows: [stored.rows[0], stored.rows[0]] },
    ...[
      { quantity: 0 }, { quantity: 1.5 }, { quantity: 1000001 }, { orderQuantity: 14 },
      { orderQuantity: 1.5 }, { orderQuantity: 1000001 }, { size: '42x' },
      { system: 'unknown' }, { model: 'x'.repeat(65) }, { color: 'x'.repeat(33) },
    ].map(change => ({ ...stored, rows: [{ ...stored.rows[0], ...change }] })),
  ]
  for (const invalidDraft of invalidDrafts) {
    assert.equal(parseFootwearInquiry(JSON.stringify(invalidDraft), draftId, now), null)
  }
})

test('serializer blocks invalid, inconsistent and overlong plans without truncating', () => {
  assert.throws(() => serializeFootwearInquiry({ ...confirmedPlan(), valid: false }, draftId, now), /valid|correct/i)
  assert.throws(() => serializeFootwearInquiry({ ...confirmedPlan(), totals: { workers: 15, spares: 2, order: 17 } }, draftId, now), /consistent|match|valid/i)
  const longPlan = confirmedPlan()
  longPlan.rows = Array.from({ length: 70 }, (_, index) => ({
    ...longPlan.rows[0],
    key: JSON.stringify([`Reference ${index}`, 'Black', 'eu', '42']),
    model: `Reference ${index}`,
    color: 'Black', system: 'eu', size: '42', quantity: 15, spares: 2,
    suggestedQuantity: 17, orderQuantity: 18, overridden: true,
  }))
  longPlan.totals = { workers: 1050, spares: 210, order: 1260 }
  assert.throws(() => serializeFootwearInquiry(longPlan, draftId, now), /6000|too long|Excel/i)
})

test('opaque draft identity rejects query and path content', () => {
  assert.equal(isFootwearInquiryDraftId(draftId), true)
  for (const value of [undefined, '', [], [draftId], '../draft', `${draftId}?source=evil`, 'x'.repeat(500)]) {
    assert.equal(isFootwearInquiryDraftId(value), false)
  }
})

test('equivalent typed plan properties do not depend on object insertion order', () => {
  const plan = confirmedPlan()
  const row = plan.rows[0]
  assert.ok(row)
  const { model, ...otherFields } = row
  plan.rows = [{ model, ...otherFields }]
  plan.totals = { order: 18, workers: 15, spares: 3 }
  assert.ok(parseFootwearInquiry(serializeFootwearInquiry(plan, draftId, now), draftId, now))
})

function withBrowserStorage(storage: Pick<Storage, 'getItem' | 'setItem'>, run: () => void) {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'window')
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { crypto: { randomUUID }, sessionStorage: storage } })
  try {
    run()
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'window', descriptor)
    else Reflect.deleteProperty(globalThis, 'window')
  }
}

test('saving creates independent short URLs that each restore only their own aggregate draft', () => {
  const values = new Map<string, string>()
  withBrowserStorage({ getItem: key => values.get(key) ?? null, setItem: (key, value) => { values.set(key, value) } }, () => {
    const first = saveFootwearInquiry(confirmedPlan())
    const second = saveFootwearInquiry(confirmedPlan())
    assert.notEqual(first, second)
    assert.ok(first.length < 160)
    assert.equal(first.includes('Boot'), false)
    assert.equal(values.size, 2)
    const url = new URL(first, 'https://www.laifappe.com')
    assert.equal(url.searchParams.get('tool'), 'footwear-size-allocation')
    const requestedId = url.searchParams.get('draft')
    assert.ok(requestedId)
    assert.equal(parseFootwearInquiry(values.get(`laifappe:footwear-size-inquiry:${requestedId}`) ?? null, requestedId)?.plan.totals.order, 18)
  })
})

test('denied or silently unavailable session storage produces actionable recovery', () => {
  for (const storage of [
    { getItem: () => null, setItem: () => { throw new Error('Denied') } },
    { getItem: () => null, setItem: () => {} },
  ]) {
    withBrowserStorage(storage, () => {
      assert.throws(() => saveFootwearInquiry(confirmedPlan()), /session storage.*Excel/i)
    })
  }
})
