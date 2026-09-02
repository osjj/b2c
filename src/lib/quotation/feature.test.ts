import assert from 'node:assert/strict'
import test from 'node:test'

import { isQuotationWorkbenchEnabled } from './feature'

test('production quotation workbench is disabled by default', () => {
  assert.equal(isQuotationWorkbenchEnabled({ NODE_ENV: 'production' }), false)
  assert.equal(isQuotationWorkbenchEnabled({ NODE_ENV: 'production', QUOTATION_WORKBENCH_ENABLED: 'true' }), true)
  assert.equal(isQuotationWorkbenchEnabled({ NODE_ENV: 'production', QUOTATION_WORKBENCH_ENABLED: 'TRUE' }), false)
})

test('development and test can be explicitly disabled', () => {
  assert.equal(isQuotationWorkbenchEnabled({ NODE_ENV: 'development' }), true)
  assert.equal(isQuotationWorkbenchEnabled({ NODE_ENV: 'test', QUOTATION_WORKBENCH_ENABLED: 'false' }), false)
})
