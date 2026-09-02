import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { test } from 'node:test'

import ExcelJS from 'exceljs'
import sharp from 'sharp'

import { generateCustomerExcel, generateInternalValuationExcel } from './artifacts/excel'
import { generateCustomerPdf } from './artifacts/pdf'
import { stableSnapshotJson, type QuotationSnapshot } from './artifacts/snapshot'
import { validateGeneratedArtifacts } from './artifacts/validate'

function fixture(image: { dataUrl: string; sha256: string }): QuotationSnapshot {
  return {
    schemaVersion: '1.0', templateVersion: 'stage-a-v1', language: 'ENGLISH',
    quotation: { number: 'QT-TEST-0001', revision: 1, date: '2026-08-29', validUntil: '2026-09-29' },
    customer: { companyName: 'Example Buyer Ltd.', countryCode: 'US', email: 'buyer@example.test', phone: null, address: null, contact: { name: 'Example Contact', title: null, email: 'buyer@example.test', phone: null } },
    money: { currency: 'USD', minorUnit: 2, roundingMode: 'HALF_UP', subtotal: '20.00', discount: '0.00', shipping: '0.00', otherFee: '0.00', taxRate: '0.00', tax: '0.00', roundingAdjustment: '0.00', total: '20.00' },
    terms: { payment: 'T/T' },
    items: [{ position: 1, nameZh: null, nameEn: '=Unsafe spreadsheet name', model: 'MODEL-1', sku: null, specifications: ['One specification'], unit: 'pcs', quantity: '2', unitPrice: '10.00', lineTotal: '20.00', images: [{ contentType: 'image/png', sha256: image.sha256, dataUrl: image.dataUrl }] }],
  }
}

test('customer PDF and Excel share one safe snapshot with embedded images', async () => {
  const imageBytes = await sharp({ create: { width: 2, height: 2, channels: 3, background: '#ffffff' } }).png().toBuffer()
  const snapshot = fixture({ dataUrl: `data:image/png;base64,${imageBytes.toString('base64')}`, sha256: createHash('sha256').update(imageBytes).digest('hex') })
  const snapshotJson = stableSnapshotJson(snapshot)
  const [pdf, excel, internalExcel] = await Promise.all([
    generateCustomerPdf(snapshot),
    generateCustomerExcel(snapshot),
    generateInternalValuationExcel({ quotationNumber: snapshot.quotation.number, revisionNumber: 1, currency: 'USD', total: '20.00', totalCost: '12.00', profit: '8.00', items: [{ position: 1, name: 'Internal line', quantity: '2', unitPrice: '10.00', lineTotal: '20.00', unitCost: '6.00', costCurrency: 'USD', exchangeRate: null, lineCost: '12.00', internalNotes: 'private' }] }),
  ])
  await validateGeneratedArtifacts({ snapshot, snapshotJson, pdf, excel, internalExcel })
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(excel as unknown as ExcelJS.Buffer)
  const sheet = workbook.getWorksheet('Quotation')
  assert.ok(sheet)
  assert.equal(sheet.getImages().length, 1)
  assert.equal(sheet.getCell('B9').value, "'=Unsafe spreadsheet name")
  assert.equal(pdf.subarray(0, 4).toString('ascii'), '%PDF')
})
