import assert from 'node:assert/strict'
import test from 'node:test'

import { containsForbiddenCustomerKey } from './visibility'

test('customer projections reject nested internal fields', () => {
  assert.equal(containsForbiddenCustomerKey({ items: [{ name: 'A', unitCost: '1.00' }] }), true)
  assert.equal(containsForbiddenCustomerKey({ items: [{ name: 'A', lineTotal: '2.00' }] }), false)
})
