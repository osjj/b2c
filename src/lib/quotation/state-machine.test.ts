import assert from 'node:assert/strict'
import test from 'node:test'

import { assertEditableRevision, canTransitionRevision } from './state-machine'

test('revision state machine accepts only explicit transitions', () => {
  assert.equal(canTransitionRevision('DRAFT', 'READY'), true)
  assert.equal(canTransitionRevision('READY', 'FINALIZING'), true)
  assert.equal(canTransitionRevision('FINALIZED', 'ISSUED'), true)
  assert.equal(canTransitionRevision('ISSUED', 'SUPERSEDED'), true)
  assert.equal(canTransitionRevision('ISSUED', 'VOID'), false)
  assert.equal(canTransitionRevision('ISSUED', 'DRAFT'), false)
  assert.equal(canTransitionRevision('VOID', 'READY'), false)
})

test('finalized revisions are immutable', () => {
  assert.doesNotThrow(() => assertEditableRevision('DRAFT'))
  assert.doesNotThrow(() => assertEditableRevision('READY'))
  assert.throws(() => assertEditableRevision('FINALIZED'), /immutable/i)
})
