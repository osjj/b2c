import assert from 'node:assert/strict'
import test from 'node:test'
import ExcelJS from 'exceljs'
import sharp from 'sharp'
import { createHash } from 'node:crypto'
import { customerDirectorySchema, directoryCustomer } from './customer-directory'
import { catalogImageKey, catalogSpecifications } from './catalog-product'
import { commonProductDescription, commonProductSchema, blankQuotation, toQuotationInput } from './simple-input'
import { defaultWorkbenchSettings, quotationBrandSchema, workbenchSettingsSchema } from './workbench-config'
import { generateCustomerExcel, generateInternalValuationExcel } from './artifacts/excel'
import { generateCustomerPdf } from './artifacts/pdf'
import { quotationSnapshotSchema, stableSnapshotJson } from './artifacts/snapshot'
import { validateGeneratedArtifacts } from './artifacts/validate'
import { quotationLayoutHash } from './services/ai-layout'

test('customer directory requires only name, validates optional email, preserves optional profile', () => {
  assert.equal(customerDirectorySchema.parse({ name: 'Jordan' }).company, '')
  assert.equal(customerDirectorySchema.safeParse({ name: '' }).success, false)
  assert.equal(customerDirectorySchema.safeParse({ name: 'Jordan', email: 'test' }).success, false)
  const row = directoryCustomer({ id: 'cmockcustomer0000000000000', companyName: 'Jordan', countryCode: '中国', email: null, phone: null, notes: null, isActive: true, updatedAt: new Date() }, { company: 'Sample Company', gender: 'FEMALE' })
  assert.equal(row.name, 'Jordan'); assert.equal(row.company, 'Sample Company'); assert.equal(row.country, '中国'); assert.equal(row.gender, 'FEMALE')
})
test('common products preserve separate fields; only internal DTO carries cost', () => {
  const product = commonProductSchema.parse({ name: 'Sample', description: 'Customer description', specifications: 'Material: Cotton', packaging: '10 pcs / bag', unit: 'pcs', unitPrice: '3.50', unitCost: '1.125', currency: 'USD', active: true })
  const value = blankQuotation(defaultWorkbenchSettings); value.customerName = 'Sample'
  value.items[0] = { ...product, description: commonProductDescription(product), quantity: '2', images: [] }
  const input = toQuotationInput(value)
  assert.deepEqual(input.items[0].specifications, ['Material: Cotton', 'Customer description', 'Packaging: 10 pcs / bag'])
  assert.equal(input.items[0].unitCost, '1.125'); assert.equal(input.items[0].costCurrency, 'USD')
  assert.equal(commonProductSchema.safeParse({ ...product, unitCost: '-1' }).success, false)
})
test('catalog image import only reads configured bucket keys; parameters remain source grounded', () => {
  assert.equal(catalogImageKey('https://shop.example.com/products/a.png', 'https://shop.example.com'), 'products/a.png')
  for (const value of ['https://evil.example/a.png', 'http://127.0.0.1/a.png', 'https://shop.example.com/a.png?secret=1', 'https://shop.example.com/%2e%2e%2fsecret', 'https://shop.example.com/%5csecret']) assert.throws(() => catalogImageKey(value, 'https://shop.example.com'))
  assert.equal(catalogSpecifications({ Material: 'Cotton', Size: 'XL', hidden: { supplier: 'private' } }), 'Material: Cotton\nSize: XL')
})
test('independent company fields and opt-in seal survive snapshot schema without environment secrets', () => {
  const settings = workbenchSettingsSchema.parse({ brand: { companyName: 'Sample', contactLine: 'Phone 123', address: 'Sample address', website: 'www.example.com', email: 'sales@example.com' } })
  assert.equal(settings.brand.address, 'Sample address')
  assert.equal(quotationBrandSchema.parse(settings.brand).email, 'sales@example.com')
  assert.equal(workbenchSettingsSchema.safeParse({ useSeal: true }).success, false)
})
test('studio formal Excel embeds photos and seal, keeps exact total and print layout, neutralizes formulas', async () => {
  const bytes = await sharp({ create: { width: 40, height: 80, channels: 4, background: '#a22' } }).png().toBuffer()
  const image = { contentType: 'image/png' as const, dataUrl: `data:image/png;base64,${bytes.toString('base64')}`, sha256: createHash('sha256').update(bytes).digest('hex') }
  const snapshot = quotationSnapshotSchema.parse({ schemaVersion: '1.0', templateVersion: 'jordan-ai-v1', language: 'ENGLISH', brand: { companyName: 'Sample', contactLine: 'Phone: 123', address: 'Sample address', website: 'www.example.com', email: 'sales@example.com', seal: image }, quotation: { number: 'QT-TEST', revision: 1, date: '2026-09-06', validUntil: null }, customer: { companyName: '=HYPERLINK("bad")', countryCode: null, email: null, phone: null, address: null, contact: null }, money: { currency: 'USD', minorUnit: 2, roundingMode: 'HALF_UP', subtotal: '7.00', discount: '0', shipping: '0', otherFee: '0', taxRate: '0', tax: '0', roundingAdjustment: '0', total: '7.00' }, terms: { Terms: 'Sample only' }, items: [{ position: 1, nameEn: '=2+2', nameZh: null, model: null, sku: null, specifications: ['Material: Cotton'], unit: 'pcs', quantity: '2', unitPrice: '3.50', lineTotal: '7.00', images: [image] }] })
  snapshot.layout = { version: '1', model: 'fixture', inputHash: quotationLayoutHash(snapshot), items: [{ position: 1, imageColumns: 1, labelLengths: [9], noteIndices: [] }] }
  const excel = await generateCustomerExcel(snapshot)
  const book = new ExcelJS.Workbook(); await book.xlsx.load(excel as unknown as ExcelJS.Buffer)
  const sheet = book.getWorksheet('Quotation'); assert.ok(sheet)
  assert.equal(sheet.getImages().length, 2); assert.equal(sheet.pageSetup.orientation, 'landscape'); assert.equal(sheet.pageSetup.fitToWidth, 1)
  assert.equal(sheet.getCell('C12').value, "'=2+2")
  assert.equal(sheet.getCell('A2').value, 'Phone: 123'); assert.equal(sheet.getCell('E2').value, 'Sample address'); assert.equal(sheet.getCell('E2').alignment.horizontal, 'right')
  const values = JSON.stringify(sheet.getSheetValues()); assert.ok(values.includes('Date: 2026-09-06')); assert.ok(values.includes('7.00')); assert.ok(!values.includes('unitCost'))
  sheet.eachRow((row) => row.eachCell((cell) => assert.equal(cell.type === ExcelJS.ValueType.Formula || cell.type === ExcelJS.ValueType.Error, false)))
  const pdf = await generateCustomerPdf(snapshot, { configuredPath: '' })
  const internalExcel = await generateInternalValuationExcel({ quotationNumber: 'QT-TEST', revisionNumber: 1, currency: 'USD', total: '7.00', totalCost: null, profit: null, items: [] })
  await validateGeneratedArtifacts({ snapshot, snapshotJson: stableSnapshotJson(snapshot), excel, pdf, internalExcel })
})
