import assert from 'node:assert/strict'
import test from 'node:test'
import { generateCustomerPdf } from './artifacts/pdf'
import type { QuotationSnapshot } from './artifacts/snapshot'

export function presentationFixture(): QuotationSnapshot {
  return { schemaVersion: '1.0', templateVersion: 'presentation-v2', language: 'ENGLISH', brand: { companyName: 'LAIFAPPE', contactLine: 'SAMPLE DOCUMENT / NOT A CUSTOMER OFFER', tagline: 'PERSONAL PROTECTIVE EQUIPMENT' }, quotation: { number: 'QT-SAMPLE-0001', revision: 1, date: '2026-09-05', validUntil: null }, customer: { companyName: 'Sample Buyer Ltd.', countryCode: null, email: null, phone: null, address: null, contact: null }, money: { currency: 'USD', minorUnit: 2, roundingMode: 'HALF_UP', subtotal: '1250.00', discount: '0.00', shipping: '0.00', otherFee: '0.00', taxRate: '0', tax: '0.00', roundingAdjustment: '0.00', total: '1250.00' }, terms: { Terms: 'Sample only. Please confirm all commercial terms before issuing a quotation.' }, items: [{ position: 1, nameEn: 'Cotton Workwear - Sample Product', nameZh: '不显示的中文', model: null, sku: null, specifications: ['Material: Cotton', 'Color: Navy', 'Size range: To be confirmed', 'Packaging: To be confirmed'], unit: 'pcs', quantity: '100', unitPrice: '12.50', lineTotal: '1250.00', images: [] }] }
}
test('landscape presentation needs no Chinese font for hidden text and includes a summary page', async () => {
  const bytes = await generateCustomerPdf(presentationFixture(), { configuredPath: '', systemPaths: [] })
  assert.equal(bytes.subarray(0, 4).toString(), '%PDF')
  assert.equal((bytes.toString('latin1').match(/\/Type\s*\/Page\b/g) ?? []).length, 2)
  assert.match(bytes.toString('latin1'), /\/MediaBox \[0 0 841/)
})
test('long product description and terms paginate rather than disappearing', async () => {
  const snapshot = presentationFixture()
  snapshot.items[0].specifications = Array.from({ length: 70 }, (_, i) => `Specification ${i}: ${'A clear description of this product. '.repeat(3)}`)
  snapshot.terms.Terms = 'Long terms and conditions. '.repeat(130)
  const bytes = await generateCustomerPdf(snapshot, { configuredPath: '', systemPaths: [] }, true)
  assert.ok((bytes.toString('latin1').match(/\/Type\s*\/Page\b/g) ?? []).length > 5)
})
