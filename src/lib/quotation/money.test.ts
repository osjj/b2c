import assert from 'node:assert/strict'
import test from 'node:test'

import { calculateQuotationMoney } from './money'

const base = {
  currency: 'USD',
  currencyMinorUnit: 2,
  roundingMode: 'HALF_UP' as const,
  discountAmount: '0',
  shippingFee: '0',
  otherFee: '0',
  taxRate: '0',
  roundingAdjustment: '0',
}

test('calculates authoritative totals with exact decimal arithmetic', () => {
  const result = calculateQuotationMoney({
    ...base,
    items: [{
      sortOrder: 0,
      nameEn: 'Gloves',
      unit: 'pair',
      quantity: '3',
      unitPrice: '0.10',
      discountAmount: '0',
      specifications: [],
    }],
  })
  assert.equal(result.subtotal, '0.30')
  assert.equal(result.total, '0.30')
})

test('supports three-decimal currencies and missing cost remains null', () => {
  const result = calculateQuotationMoney({
    ...base,
    currency: 'JOD',
    currencyMinorUnit: 3,
    taxRate: '10',
    items: [{
      sortOrder: 0,
      nameEn: 'Boots',
      unit: 'pair',
      quantity: '2',
      unitPrice: '1.0055',
      discountAmount: '0',
      specifications: [],
    }],
  })
  assert.equal(result.subtotal, '2.011')
  assert.equal(result.taxAmount, '0.201')
  assert.equal(result.totalCost, null)
  assert.equal(result.profit, null)
})

test('rejects a rounding adjustment that would make the total negative', () => {
  assert.throws(() => calculateQuotationMoney({
    ...base,
    roundingAdjustment: '-2',
    items: [{
      sortOrder: 0,
      nameEn: 'Gloves',
      unit: 'pair',
      quantity: '1',
      unitPrice: '1',
      discountAmount: '0',
      specifications: [],
    }],
  }), /cannot make the quotation total negative/)
})
