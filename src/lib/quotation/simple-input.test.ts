import assert from 'node:assert/strict'
import test from 'node:test'
import { blankQuotation, simpleTotals, toQuotationInput, simpleQuotationSchema, commonProductSchema } from './simple-input'
import { defaultWorkbenchSettings, workbenchSettingsSchema } from './workbench-config'
import { calculateQuotationMoney } from './money'

function fixture() {
  const value = blankQuotation(defaultWorkbenchSettings)
  value.customerName = '测试客户'
  value.items[0] = { name: '临时产品', description: 'Material: Cotton\n\nSize: XL', quantity: '3', unit: 'pcs', unitPrice: '0.335', images: [] }
  return value
}
test('new quote needs neither an existing customer nor storefront product', () => {
  const input = toQuotationInput(fixture())
  assert.equal(input.customerId, undefined)
  assert.equal(input.customerName, '测试客户')
  assert.deepEqual(input.items[0].specifications, ['Material: Cotton', 'Size: XL'])
  assert.equal(input.items[0].productId, undefined)
  assert.equal(input.items[0].unitCost, undefined)
})

test('simple image DTO retains arbitrary mixed source and saved-asset order', () => {
  const value = fixture()
  value.items[0].images = [
    { id: '00000000-0000-4000-8000-000000000001', kind: 'source', name: 'First new' },
    { id: 'c000000000000000000000001', kind: 'asset', name: 'Saved' },
    { id: '00000000-0000-4000-8000-000000000002', kind: 'source', name: 'Second new' },
  ]
  const line = toQuotationInput(value).items[0]
  assert.deepEqual(line.imageSourceIds, [value.items[0].images[0].id, value.items[0].images[2].id])
  assert.deepEqual(line.imageAssetIds, [value.items[0].images[1].id])
  assert.deepEqual(line.imageOrder, value.items[0].images.map(({ kind, id }) => ({ kind, id })))
  value.items[0].images.push(value.items[0].images[0])
  assert.throws(() => toQuotationInput(value), /each selected image exactly once/)
})

test('new quotations default USD independently of saved workbench currency and persist applied rate', () => {
  const blank = blankQuotation(workbenchSettingsSchema.parse({ currency: 'CNY' }))
  assert.equal(blank.currency, 'USD')
  assert.equal(blank.usdToCnyRate, null)
  const value = fixture()
  value.usdToCnyRate = '7.2'
  assert.equal(toQuotationInput(value).usdToCnyRate, '7.2')
  assert.equal(toQuotationInput({ ...value, usdToCnyRate: null }).usdToCnyRate, null)
  assert.equal(toQuotationInput({ ...value, usdToCnyRate: undefined }).usdToCnyRate, undefined)
  for (const invalid of ['0', '-7', '1.123456789', '10000000000', '1e2', '']) {
    assert.throws(() => toQuotationInput({ ...value, usdToCnyRate: invalid }))
  }
})
test('simple editor totals match authoritative HALF_UP totals at decimal boundaries', () => {
  for (const currency of ['USD', 'JPY', 'KWD']) for (const price of ['0.335', '0.005', '1.234567', '1000']) {
    const value = fixture(); value.currency = currency; value.items[0].unitPrice = price
    value.shippingFee = '1.005'; value.otherFee = '0.005'; value.discountAmount = '0.334'
    const input = toQuotationInput(value)
    const money = calculateQuotationMoney(input)
    assert.equal(simpleTotals(value)?.total, money.total)
    assert.equal(simpleTotals(value)?.lines[0], money.items[0].lineTotal)
  }
})
test('rejects missing names, invalid dates, negative money, unsafe image ids and empty item list', () => {
  const value = fixture()
  assert.equal(simpleQuotationSchema.safeParse({ ...value, customerName: '' }).success, false)
  assert.equal(simpleQuotationSchema.safeParse({ ...value, quotationDate: '2026-02-31' }).success, false)
  assert.equal(simpleQuotationSchema.safeParse({ ...value, items: [] }).success, false)
  value.items[0].unitPrice = '-1'
  assert.throws(() => toQuotationInput(value))
  value.items[0].unitPrice = '1'; value.items[0].images = [{ id: '../foreign', kind: 'source', name: 'bad' }]
  assert.throws(() => toQuotationInput(value))
})
test('common products are minimal; settings never accept storage credentials or remote image URLs', () => {
  const value = commonProductSchema.parse({ name: 'Reusable glove', description: '', unit: 'pair', unitPrice: '2.50', currency: 'USD', active: true })
  assert.equal(value.name, 'Reusable glove')
  const settings = workbenchSettingsSchema.parse({ secretAccessKey: 'do-not-persist', remoteLogo: 'https://invalid.test' })
  assert.equal('secretAccessKey' in settings, false)
  assert.equal(settings.useSeal, false)
})
