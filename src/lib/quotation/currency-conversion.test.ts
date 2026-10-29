import assert from 'node:assert/strict'
import test from 'node:test'
import {
  captureCurrencyConversionBase,
  convertCurrencyAmount,
  convertQuotationCurrency,
  quotationMoneyFingerprint,
} from './currency-conversion'
import { blankQuotation, simpleTotals, toQuotationInput } from './simple-input'
import { calculateQuotationMoney } from './money'
import { defaultWorkbenchSettings } from './workbench-config'

function fixture() {
  const value = blankQuotation(defaultWorkbenchSettings)
  value.customerName = 'Currency test customer'
  value.shippingFee = '3'
  value.discountAmount = '1'
  value.otherFee = '2'
  value.items[0] = { name: 'Glove', description: 'Cotton', quantity: '2', unit: 'pair', unitPrice: '10.00', unitCost: '4.125', images: [{ id: '00000000-0000-4000-8000-000000000001', kind: 'source', name: 'glove.png' }] }
  return value
}

test('USD to CNY converts every money field and preserves quantity/content/image references', () => {
  const original = fixture()
  const frozen = structuredClone(original)
  const result = convertQuotationCurrency(original, 'CNY', '7.20')
  assert.equal(result.currency, 'CNY')
  assert.equal(result.usdToCnyRate, '7.2')
  assert.equal(result.items[0].unitPrice, '72')
  assert.equal(result.items[0].unitCost, '29.7')
  assert.equal(result.shippingFee, '21.6')
  assert.equal(result.discountAmount, '7.2')
  assert.equal(result.otherFee, '14.4')
  assert.equal(result.items[0].quantity, original.items[0].quantity)
  assert.equal(result.items[0].name, original.items[0].name)
  assert.equal(result.items[0].description, original.items[0].description)
  assert.equal(result.items[0].images, original.items[0].images)
  assert.deepEqual(original, frozen)
  assert.equal(simpleTotals(result)?.total, '172.80')
  assert.equal(calculateQuotationMoney(toQuotationInput(result)).total, '172.80')
})

test('a stable USD base prevents cumulative rounding across switches and rate changes', () => {
  const original = fixture()
  original.items[0].unitPrice = '0.000001'
  const base = captureCurrencyConversionBase(original)
  let result = original
  for (let index = 0; index < 8; index++) {
    result = convertQuotationCurrency(result, 'CNY', '0.125', base)
    assert.equal(result.items[0].unitPrice, '0')
    result = convertQuotationCurrency(result, 'USD', '0.125', base)
    assert.equal(result.items[0].unitPrice, '0.000001')
  }
  result = convertQuotationCurrency(result, 'CNY', '7.2', base)
  result = convertQuotationCurrency(result, 'CNY', '7.3', base)
  assert.equal(result.items[0].unitPrice, '0.000007')
  assert.equal(result.shippingFee, '21.9')
  assert.equal(convertQuotationCurrency(result, 'USD', '7.3', base).shippingFee, '3')
})

test('a CNY source uses its original applied rate when the rate is changed', () => {
  const original = fixture()
  original.currency = 'CNY'
  original.usdToCnyRate = '7.2'
  original.items[0].unitPrice = '72'
  original.shippingFee = '21.6'
  const base = captureCurrencyConversionBase(original)
  const repriced = convertQuotationCurrency(original, 'CNY', '7.3', base)
  assert.equal(repriced.items[0].unitPrice, '73')
  assert.equal(repriced.shippingFee, '21.9')
  const dollars = convertQuotationCurrency(repriced, 'USD', '7.3', base)
  assert.equal(dollars.items[0].unitPrice, '10')
  const restored = convertQuotationCurrency(dollars, 'CNY', '7.2', base)
  assert.equal(restored.items[0].unitPrice, '72')
  assert.equal(restored.shippingFee, '21.6')
})

test('legacy CNY without an applied rate can use its first entered rate', () => {
  const original = fixture()
  original.currency = 'CNY'
  original.items[0].unitPrice = '72'
  const result = convertQuotationCurrency(original, 'USD', '7.2')
  assert.equal(result.items[0].unitPrice, '10')
})

test('manual money edits establish a new base without losing entered values', () => {
  const original = fixture()
  const cny = convertQuotationCurrency(original, 'CNY', '7.2')
  cny.items[0].unitPrice = '100'
  const base = captureCurrencyConversionBase(cny)
  const dollars = convertQuotationCurrency(cny, 'USD', '7.2', base)
  assert.equal(dollars.items[0].unitPrice, '13.888889')
  const restored = convertQuotationCurrency(dollars, 'CNY', '7.2', base)
  assert.equal(restored.items[0].unitPrice, '100')
})

test('conversion rounds exact positive midpoints HALF_UP at six places', () => {
  assert.equal(convertCurrencyAmount('0.000001', 'USD', 'CNY', '0.5'), '0.000001')
  assert.equal(convertCurrencyAmount('0.000001', 'USD', 'CNY', '0.49999999'), '0')
  assert.equal(convertCurrencyAmount('1', 'CNY', 'USD', '6'), '0.166667')
  assert.equal(convertCurrencyAmount('0.1', 'USD', 'CNY', '7.12345678'), '0.712346')
  assert.equal(convertCurrencyAmount('10.00', 'USD', 'CNY', '1.00000000'), '10.00')
})

test('zero fees, optional costs and same-currency legacy amounts remain valid', () => {
  const original = fixture()
  original.shippingFee = '0'
  original.discountAmount = '0.000000'
  original.otherFee = '0'
  original.items[0].unitCost = null
  original.items.push({ name: 'No cost', description: '', quantity: '1', unit: 'pair', unitPrice: '0', images: [] })
  const result = convertQuotationCurrency(original, 'CNY', '7.2')
  assert.equal(result.shippingFee, '0')
  assert.equal(result.discountAmount, '0')
  assert.equal(result.items[0].unitCost, null)
  assert.equal('unitCost' in result.items[1], false)
  assert.equal(convertCurrencyAmount('2.5000', 'EUR', 'EUR', ''), '2.5000')
  assert.equal(convertCurrencyAmount('72', 'CNY', 'USD', '7.2'), '10')
})

test('source capture is independent of later edits and fingerprint tracks only relevant money', () => {
  const original = fixture()
  const base = captureCurrencyConversionBase(original)
  const fingerprint = quotationMoneyFingerprint(original)
  original.items[0].name = 'Other name'
  original.items[0].quantity = '5'
  original.items[0].images = []
  assert.equal(quotationMoneyFingerprint(original), fingerprint)
  original.items[0].unitPrice = '12'
  assert.notEqual(quotationMoneyFingerprint(original), fingerprint)
  assert.equal(base.items[0].unitPrice, '10.00')
  original.items[0].unitPrice = '10.00'
  original.usdToCnyRate = '7.2'
  assert.notEqual(quotationMoneyFingerprint(original), fingerprint)
})

test('invalid rates and unsupported pairs reject without changing quotation', () => {
  const original = fixture()
  const frozen = structuredClone(original)
  for (const rate of ['', '0', '0.00000000', '-1', 'NaN', '7e0', '7.123456789', '10000000000', '00.2']) {
    assert.throws(() => convertQuotationCurrency(original, 'CNY', rate))
  }
  assert.throws(() => convertQuotationCurrency(original, 'EUR', '7.2'))
  assert.throws(() => convertCurrencyAmount('10', 'EUR', 'CNY', '7.2'))
  assert.throws(() => convertCurrencyAmount('10', 'USD', 'bad', '7.2'))
  assert.deepEqual(original, frozen)
})

test('an invalid source or late-field overflow cannot partially convert the quote', () => {
  const original = fixture()
  original.otherFee = '999999999999.999999'
  const frozen = structuredClone(original)
  assert.throws(() => convertQuotationCurrency(original, 'CNY', '7.2'), /超出支持范围/)
  assert.deepEqual(original, frozen)
  original.otherFee = '2'
  original.items[0].unitCost = '-1'
  assert.throws(() => convertQuotationCurrency(original, 'CNY', '7.2'), /成本单价无效/)
  original.items[0].unitCost = null
  original.items[0].unitPrice = '1.1234567'
  assert.throws(() => convertQuotationCurrency(original, 'CNY', '7.2'), /单价无效/)
})

test('mismatched line counts and invalid original CNY rate reject stale bases', () => {
  const original = fixture()
  const base = captureCurrencyConversionBase(original)
  original.items.push({ ...original.items[0] })
  assert.throws(() => convertQuotationCurrency(original, 'CNY', '7.2', base), /产品明细已变化/)
  const cny = fixture()
  cny.currency = 'CNY'
  cny.usdToCnyRate = '0'
  assert.throws(() => convertQuotationCurrency(cny, 'USD', '7.2'))
})
