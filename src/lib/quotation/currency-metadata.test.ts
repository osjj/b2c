import assert from 'node:assert/strict'
import test from 'node:test'
import { quotationCurrencyMetadata, readQuotationCurrencyRate } from './currency-metadata'
import { buildCanonicalSnapshot } from './artifacts/snapshot'
import { assertCustomerProjectionSafe } from './visibility'

test('saved rate reads only validated internal metadata and legacy/corrupt values are absent', () => {
  assert.equal(readQuotationCurrencyRate({ quotationCurrency: { usdToCnyRate: '7.20000001' } }), '7.20000001')
  for (const snapshot of [null, {}, { usdToCnyRate: '7.2' }, { quotationCurrency: null }, { quotationCurrency: { usdToCnyRate: 7.2 } }, { quotationCurrency: { usdToCnyRate: '0' } }, { quotationCurrency: { usdToCnyRate: '1.123456789' } }]) {
    assert.equal(readQuotationCurrencyRate(snapshot), null)
  }
})

test('omitted writes preserve rate while explicit null clears it and invalid rates reject', () => {
  const prior = { companyName: 'Old Buyer', quotationCurrency: { usdToCnyRate: '7.2' } }
  assert.deepEqual(quotationCurrencyMetadata(undefined, prior), { quotationCurrency: { usdToCnyRate: '7.2' } })
  assert.deepEqual(quotationCurrencyMetadata('7.3', prior), { quotationCurrency: { usdToCnyRate: '7.3' } })
  assert.deepEqual(quotationCurrencyMetadata(null, prior), {})
  assert.deepEqual(quotationCurrencyMetadata(undefined), {})
  assert.throws(() => quotationCurrencyMetadata('-1', prior))
  assert.throws(() => quotationCurrencyMetadata('10000000000', prior))
  // A copy to a different customer retains pricing metadata without old customer facts.
  assert.deepEqual({ companyName: 'New Buyer', ...quotationCurrencyMetadata(undefined, prior) }, { companyName: 'New Buyer', quotationCurrency: { usdToCnyRate: '7.2' } })
})

test('canonical document projection uses saved CNY totals and excludes internal quotation rate', () => {
  const snapshot = buildCanonicalSnapshot({
    revisionNumber: 1, documentLanguage: 'ENGLISH', templateVersion: 'jordan-ai-v1', quotationDate: new Date('2026-10-28T00:00:00.000Z'), validUntil: null,
    currency: 'CNY', currencyMinorUnit: 2, roundingMode: 'HALF_UP', customerSnapshot: { companyName: 'Buyer', contacts: [], quotationCurrency: { usdToCnyRate: '7.2' } }, publicTerms: { Terms: 'Payment on delivery' },
    subtotal: '144.00', discountAmount: '7.20', shippingFee: '21.60', otherFee: '14.40', taxRate: '0', taxAmount: '0', roundingAdjustment: '0', total: '172.80', salesQuotation: { quotationNumber: 'QT-TEST-FX' },
    items: [{ id: 'test-item', sortOrder: 0, nameEn: 'Glove', nameZh: null, model: null, sku: null, specifications: [], unit: 'pair', quantity: '2', unitPrice: '72', lineTotal: '144.00' }],
  })
  assert.equal(snapshot.money.currency, 'CNY')
  assert.equal(snapshot.money.total, '172.80')
  assert.equal(snapshot.items[0].unitPrice, '72')
  assert.equal(JSON.stringify(snapshot).includes('usdToCnyRate'), false)
  assert.equal(JSON.stringify(snapshot).includes('quotationCurrency'), false)
  assert.doesNotThrow(() => assertCustomerProjectionSafe(snapshot))
  assert.throws(() => assertCustomerProjectionSafe({ customer: { quotationCurrency: { usdToCnyRate: '7.2' } } }))
})
