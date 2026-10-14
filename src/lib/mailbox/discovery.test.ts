import assert from 'node:assert/strict'
import test from 'node:test'

import {
  discoveryCandidateNeedsRescan, MAX_DISCOVERY_IDS, MAX_DISCOVERY_IDS_PER_QUERY,
  MAX_DISCOVERY_QUERY_BYTES, planMailboxDiscovery,
} from './discovery'
import { parseMailboxHeaders } from './mime'

const message = (messageId: string, references: string[] = []) => ({ messageId, references, inReplyTo: references.slice(-1) })

test('steady-state reply probes its new ID without requerying all messages under known ancestors', () => {
  const plan = planMailboxDiscovery([message('<new@example.com>', ['<root@example.com>'])], new Set(['<root@example.com>', '<new@example.com>']))
  assert.equal(plan.conservativeRescan, false)
  assert.deepEqual(plan.ids, ['<new@example.com>'])
  assert.deepEqual(plan.queries, [{ or: [
    { header: { 'MESSAGE-ID': '<new@example.com>' } },
    { header: { REFERENCES: '<new@example.com>' } },
    { header: { 'IN-REPLY-TO': '<new@example.com>' } },
  ] }])
  assert.deepEqual(planMailboxDiscovery([], new Set()).queries, [])
})

test('new Sent parent unlocks an earlier skipped direct-to-QQ child, and missing root is discoverable in reverse', async () => {
  const newSent = message('<sent@example.com>', ['<root@example.com>'])
  const existing = new Set(['<sent@example.com>'])
  const plan = planMailboxDiscovery([newSent], existing)
  assert.deepEqual(new Set(plan.ids), new Set(['<sent@example.com>', '<root@example.com>']))
  const known = new Set(plan.ids)
  const headers = (id: string, parent?: string) => Buffer.from(`From: buyer@example.com\r\nTo: personal@qq.com\r\nMessage-ID: ${id}\r\n${parent ? `In-Reply-To: ${parent}\r\n` : ''}\r\n`)
  const child = await parseMailboxHeaders(headers('<child@example.com>', '<sent@example.com>'))
  const root = await parseMailboxHeaders(headers('<root@example.com>'))
  assert.equal(discoveryCandidateNeedsRescan(child, existing, known, ['sales@business.test']), true)
  assert.equal(discoveryCandidateNeedsRescan(root, existing, known, ['sales@business.test']), true)
  existing.add('<child@example.com>')
  assert.equal(discoveryCandidateNeedsRescan(child, existing, known, ['sales@business.test']), false)
})

test('substring false positives and unrelated personal mail never request reconciliation', async () => {
  const candidate = await parseMailboxHeaders(Buffer.from('From: friend@example.com\r\nTo: personal@qq.com\r\nMessage-ID: <other@example.com>\r\nIn-Reply-To: <prefix-root@example.com>\r\n\r\n'))
  assert.equal(discoveryCandidateNeedsRescan(candidate, new Set(), new Set(['<root@example.com>']), ['sales@business.test']), false)
})

test('query plans deduplicate and bound IDs, OR terms and serialized command size', () => {
  const imports = Array.from({ length: 41 }, (_, index) => message(`<m${index}@example.com>`))
  const plan = planMailboxDiscovery([...imports, ...imports], new Set())
  assert.equal(plan.ids.length, 41)
  assert.equal(plan.queries.length, 3)
  assert.ok(plan.queries.every(query => (query.or?.length || 0) <= MAX_DISCOVERY_IDS_PER_QUERY * 3))
  const longIds = Array.from({ length: 20 }, (_, index) => message(`<${'x'.repeat(850)}${index}@example.com>`))
  const longPlan = planMailboxDiscovery(longIds, new Set())
  assert.equal(longPlan.conservativeRescan, false)
  assert.equal(longPlan.ids.length, 20)
  assert.ok(longPlan.queries.every(query => Buffer.byteLength(JSON.stringify(query)) <= MAX_DISCOVERY_QUERY_BYTES))
  const tooMany = planMailboxDiscovery(Array.from({ length: MAX_DISCOVERY_IDS + 1 }, (_, index) => message(`<m${index}@example.com>`)), new Set())
  assert.equal(tooMany.conservativeRescan, true)
  assert.deepEqual(tooMany.queries, [])
})

test('invalid IDs cannot inject search headers and unidentified messages cannot unlock a reference', () => {
  const plan = planMailboxDiscovery([
    { messageId: null, references: [], inReplyTo: [] },
    message('<bad\r\nINJECT@example.com>', ['not-an-id', '<valid@example.com>']),
  ], new Set())
  assert.deepEqual(plan.ids, ['<valid@example.com>'])
})
