import assert from 'node:assert/strict'
import test from 'node:test'

import { canAcceptQuotationUpload } from './file-security'

test('production quotation uploads stay disabled until a scanner adapter exists', () => {
  assert.equal(canAcceptQuotationUpload({ NODE_ENV: 'production' }), false)
  assert.equal(canAcceptQuotationUpload({
    NODE_ENV: 'production',
    QUOTATION_PRIVATE_UPLOADS_SCANNER_ENABLED: 'true',
  }), false)
})

test('development quotation image uploads remain available', () => {
  assert.equal(canAcceptQuotationUpload({ NODE_ENV: 'development' }), true)
})
