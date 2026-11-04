import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import test from 'node:test'

import { buildGloveMarkingReport } from './glove-marking-decoder'
import {
  isGloveMarkingDraftId,
  parseGloveMarkingInquiry,
  saveGloveMarkingInquiry,
  serializeGloveMarkingInquiry,
} from './glove-marking-inquiry'

const draftId = 'cb196d9f-e65d-40f2-b24a-6aa43cf6b2c8'
const otherId = '7c986f1f-2746-4121-8f00-55a132caf25b'
const now = Date.UTC(2026, 9, 30, 10)
const input = 'EN388:2016+A1:2018 4X43CP; EN407:2020 X1XXXX; SAMPLE-REF'

test('a draft preserves original input and regenerates the full interpretation with unresolved text', () => {
  const serialized = serializeGloveMarkingInquiry(input, draftId, undefined, now)
  const draft = parseGloveMarkingInquiry(serialized, draftId, now + 1000)
  assert.ok(draft)
  assert.equal(draft.id, draftId)
  assert.equal(draft.input, input)
  assert.match(draft.message, /4X43CP/)
  assert.match(draft.message, /X1XXXX/)
  assert.match(draft.message, /SAMPLE-REF/)
  assert.match(draft.message, /unresolved|unknown/i)
  assert.match(draft.message, /certification/i)
  const report = buildGloveMarkingReport(input)
  assert.ok(report)
  assert.ok(draft.message.endsWith(report), 'The handoff must retain the same complete report shown by the decoder.')
  assert.ok(draft.message.length <= 6000)
  assert.deepEqual(Object.keys(JSON.parse(serialized)).sort(), ['createdAt', 'id', 'input', 'version'])
})

test('an explicit supported context survives a code-only handoff', () => {
  const fallback = { standard: 'EN388' as const, edition: '2016+A1:2018' }
  const serialized = serializeGloveMarkingInquiry('4X43F', draftId, fallback, now)
  const draft = parseGloveMarkingInquiry(serialized, draftId, now)
  assert.deepEqual(draft?.fallback, fallback)
  assert.match(draft?.message ?? '', /4X43F/)
  assert.match(draft?.message ?? '', /2016\+A1:2018/)
})

test('corrupted, changed-version, mismatched, future and expired drafts cannot restore', () => {
  const serialized = serializeGloveMarkingInquiry(input, draftId, undefined, now)
  const stored = JSON.parse(serialized)
  for (const value of [null, '{broken', JSON.stringify({ ...stored, version: 2 }), JSON.stringify({ ...stored, message: 'Invented protection' }), JSON.stringify({ ...stored, input: 'x'.repeat(2001) }), JSON.stringify({ ...stored, fallback: { standard: 'EN388', edition: '2030' } }), JSON.stringify({ ...stored, fallback: { standard: 'EN999', edition: '2020' } })]) {
    assert.equal(parseGloveMarkingInquiry(value, draftId, now), null)
  }
  assert.equal(parseGloveMarkingInquiry(serialized, otherId, now), null)
  assert.equal(parseGloveMarkingInquiry(serialized, draftId, now - 1), null)
  assert.equal(parseGloveMarkingInquiry(serialized, draftId, now + 2 * 60 * 60 * 1000), null)
  assert.ok(parseGloveMarkingInquiry(serialized, draftId, now + 2 * 60 * 60 * 1000 - 1))
})

test('an unresolvable or oversized input cannot create a misleading or partial RFQ', () => {
  for (const value of ['', ' ', '111111', 'EN388:2030 4X43CP', 'x'.repeat(2001)]) {
    assert.throws(() => serializeGloveMarkingInquiry(value, draftId, undefined, now), /decode|valid|review|input/i)
  }
  const longInput = `${Array.from({ length: 8 }, () => 'EN388:2016+A1:2018 4X43CP').join('; ')}; ${'UNRESOLVED'.repeat(150)}`
  assert.throws(() => serializeGloveMarkingInquiry(longInput, draftId, undefined, now), /6000|too long|copy|smaller/i)
})

test('draft identities reject path and query content', () => {
  assert.equal(isGloveMarkingDraftId(draftId), true)
  for (const value of [null, [], [draftId], '../draft', `${draftId}?input=123`, 'x'.repeat(500)]) {
    assert.equal(isGloveMarkingDraftId(value), false)
  }
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

test('saving creates independent namespaced drafts and short URLs without label text', () => {
  const values = new Map<string, string>()
  withBrowserStorage({ getItem: key => values.get(key) ?? null, setItem: (key, value) => { values.set(key, value) } }, () => {
    const first = saveGloveMarkingInquiry(input)
    const second = saveGloveMarkingInquiry(input)
    assert.notEqual(first, second)
    assert.ok(first.length < 160)
    assert.equal(first.includes('4X43CP'), false)
    const url = new URL(first, 'https://www.laifappe.com')
    assert.equal(url.searchParams.get('tool'), 'glove-marking-decoder')
    const requestedId = url.searchParams.get('draft')
    assert.ok(requestedId)
    assert.equal(parseGloveMarkingInquiry(values.get(`laifappe:glove-marking-inquiry:${requestedId}`) ?? null, requestedId)?.input, input)
    assert.equal(values.size, 2)
  })
})

test('denied or silently unavailable storage gives a recoverable failure', () => {
  for (const storage of [
    { getItem: () => null, setItem: () => { throw new Error('Denied') } },
    { getItem: () => null, setItem: () => {} },
  ]) {
    withBrowserStorage(storage, () => {
      assert.throws(() => saveGloveMarkingInquiry(input), /session storage.*copy|copy.*report/i)
    })
  }
})
