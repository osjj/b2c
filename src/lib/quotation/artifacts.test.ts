import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { test } from 'node:test'
import { existsSync } from 'node:fs'
import { jsPDF } from 'jspdf'

import ExcelJS from 'exceljs'
import sharp from 'sharp'

import { generateCustomerExcel, generateInternalValuationExcel } from './artifacts/excel'
import { generateCustomerPdf } from './artifacts/pdf'
import { configureQuotationPdfFont, systemQuotationFontPaths } from './artifacts/pdf-font'
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

function textFixture(): QuotationSnapshot {
  const snapshot = fixture({ dataUrl: 'data:image/png;base64,', sha256: '0'.repeat(64) })
  snapshot.items[0].images = []
  snapshot.items[0].nameEn = 'Safety helmet'
  snapshot.items[0].nameZh = '安全帽'
  snapshot.customer.address = '未在 PDF 显示的地址'
  return snapshot
}

test('English PDF ignores hidden Chinese fields and needs no external font, including specification bullets', async () => {
  const pdf = await generateCustomerPdf(textFixture(), { configuredPath: '', systemPaths: [] })
  assert.equal(pdf.subarray(0, 4).toString(), '%PDF')
  assert.ok(!pdf.toString('latin1').includes('/FontFile2'))
})

test('visible customer names, fallback product names, specifications, terms and bilingual headings require a covering font', async () => {
  const variants = [
    (s: QuotationSnapshot) => { s.customer.companyName = '示例公司' },
    (s: QuotationSnapshot) => { if (s.customer.contact) s.customer.contact.name = '张三' },
    (s: QuotationSnapshot) => { s.items[0].nameEn = null },
    (s: QuotationSnapshot) => { s.items[0].specifications = ['防冲击'] },
    (s: QuotationSnapshot) => { s.terms.payment = '预付款' },
    (s: QuotationSnapshot) => { s.language = 'BILINGUAL' },
  ]
  await Promise.all(variants.map(async (change) => {
    const snapshot = textFixture()
    change(snapshot)
    await assert.rejects(generateCustomerPdf(snapshot, { configuredPath: '', systemPaths: [] }), /No usable system font/)
  }))
})

test('system Chinese TrueType font is found and embedded when no explicit font is configured', async (context) => {
  if (!systemQuotationFontPaths().some(existsSync)) { context.skip('No system Chinese TTF installed'); return }
  const snapshot = textFixture()
  snapshot.language = 'BILINGUAL'
  const pdf = await generateCustomerPdf(snapshot, { configuredPath: '' })
  assert.ok(pdf.toString('latin1').includes('/FontFile2'))
})

test('unreadable configured font falls back, and unsupported glyphs fail instead of silently disappearing', async (context) => {
  const path = systemQuotationFontPaths().find(existsSync)
  if (!path) { context.skip('No system Chinese TTF installed'); return }
  const font = await configureQuotationPdfFont(new jsPDF(), '安全帽', {
    configuredPath: '/missing/quotation-font.ttf', systemPaths: [path],
  })
  assert.match(font, /^QuotationUnicode/)
  await assert.rejects(configureQuotationPdfFont(new jsPDF(), '安全帽😀', {
    configuredPath: '', systemPaths: [path],
  }), /No usable system font/)
})

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
