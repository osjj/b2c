import assert from 'node:assert/strict'
import test from 'node:test'

import {
  businessCustomerInputSchema,
  createBusinessCustomerInputSchema,
  createQuotationProductInputSchema,
  createSalesQuotationInputSchema,
  quotationProductInputSchema,
  updateBusinessCustomerInputSchema,
  updateQuotationProductInputSchema,
} from './schemas'

const baseLine = {
  sortOrder: 0,
  nameEn: 'Safety helmet',
  unit: 'pcs',
  quantity: '10',
  unitPrice: '2.25',
  discountAmount: '0',
  specifications: [],
}

test('quotation product requires a sourced name without inventing fields', () => {
  assert.equal(quotationProductInputSchema.safeParse({ unit: 'pcs' }).success, false)
  assert.equal(quotationProductInputSchema.safeParse({ nameZh: '安全帽', unit: 'pcs' }).success, true)
})

test('quotation product create and update schemas preserve name refinement', () => {
  const product = { nameEn: 'Safety helmet', unit: 'pcs' }

  assert.equal(createQuotationProductInputSchema.safeParse(product).success, true)
  assert.equal(createQuotationProductInputSchema.safeParse({ unit: 'pcs' }).success, false)
  assert.equal(updateQuotationProductInputSchema.safeParse({
    ...product,
    id: 'cm123456789012345678901234',
  }).success, true)
})

test('zero decimal discounts remain compatible with percentage discounts', () => {
  assert.equal(createSalesQuotationInputSchema.safeParse({
    customerId: 'cm123456789012345678901234',
    quotationDate: new Date('2026-08-29'),
    currency: 'USD',
    discountAmount: '0.00',
    discountPercent: '5',
    items: [baseLine],
  }).success, true)
})

test('customers allow at most one primary contact', () => {
  assert.equal(businessCustomerInputSchema.safeParse({
    companyName: 'Example',
    contacts: [
      { name: 'A', isPrimary: true },
      { name: 'B', isPrimary: true },
    ],
  }).success, false)
})

test('customer create and update schemas do not derive from a refined schema at runtime', () => {
  const customer = {
    companyName: 'Example',
    contacts: [{ name: 'A', email: 'a@example.com', isPrimary: true }],
  }

  assert.equal(createBusinessCustomerInputSchema.safeParse(customer).success, true)
  assert.equal(updateBusinessCustomerInputSchema.safeParse({
    ...customer,
    id: 'cm123456789012345678901234',
  }).success, true)
})

test('customer schemas report an invalid contact email as validation failure', () => {
  const result = createBusinessCustomerInputSchema.safeParse({
    companyName: 'Example',
    contacts: [{ name: 'A', email: 'test', isPrimary: false }],
  })

  assert.equal(result.success, false)
  if (result.success === false) {
    assert.deepEqual(result.error.flatten().fieldErrors.contacts, ['Invalid email address'])
  }
})

test('quotation lines reject conflicting sources and unsafe decimals', () => {
  const result = createSalesQuotationInputSchema.safeParse({
    customerId: 'cm123456789012345678901234',
    quotationDate: new Date('2026-08-29'),
    currency: 'USD',
    items: [{
      ...baseLine,
      quantity: '1.12345',
      quotationProductId: 'cm123456789012345678901235',
      productId: 'cm123456789012345678901236',
    }],
  })
  assert.equal(result.success, false)
})

test('validity and percentage ranges are enforced', () => {
  const result = createSalesQuotationInputSchema.safeParse({
    customerId: 'cm123456789012345678901234',
    quotationDate: new Date('2026-08-29'),
    validUntil: new Date('2026-08-28'),
    currency: 'USD',
    taxRate: '101',
    items: [baseLine],
  })
  assert.equal(result.success, false)
})
