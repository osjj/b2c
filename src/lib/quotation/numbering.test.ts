import assert from 'node:assert/strict'
import { test } from 'node:test'

import { formatQuotationNumber, formatQuotationProductNumber } from './numbering'

test('quotation numbers use a stable UTC period and padded counter', () => {
  const date = new Date('2026-08-29T23:59:59Z')
  assert.equal(formatQuotationNumber(date, 42), 'QT-202608-00042')
  assert.equal(formatQuotationProductNumber(date, 7), 'QTP-2026-00007')
})
