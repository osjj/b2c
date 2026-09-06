import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCustomerPdf } from './artifacts/pdf'
import type { QuotationSnapshot } from './artifacts/snapshot'
import { JORDAN_TEMPLATE_VERSION } from './jordan-layout'
import { applyQuotationAiLayout, quotationAiConfig, quotationLayoutHash, quotationLayoutInput, validateJordanLayout } from './services/ai-layout'

function fixture(): QuotationSnapshot {
  return { schemaVersion: '1.0', templateVersion: JORDAN_TEMPLATE_VERSION, language: 'ENGLISH', quotation: { number: 'QT-ISOLATED', revision: 1, date: '2026-09-06', validUntil: null }, customer: { companyName: 'PRIVATE CUSTOMER', countryCode: null, email: 'private@example.invalid', phone: null, address: null, contact: null }, money: { currency: 'USD', minorUnit: 2, roundingMode: 'HALF_UP', subtotal: '1250.00', discount: '0.00', shipping: '0.00', otherFee: '0.00', taxRate: '0', tax: '0.00', roundingAdjustment: '0.00', total: '1250.00' }, terms: { Terms: 'PRIVATE TERMS' }, items: [{ position: 1, nameEn: 'Sample Workwear', nameZh: null, model: null, sku: null, specifications: ['Material: Cotton', 'Sizes: M / L'], unit: 'pcs', quantity: '100', unitPrice: '12.50', lineTotal: '1250.00', images: [] }] }
}
const environment: NodeJS.ProcessEnv = { NODE_ENV: 'test', OPENAI_API_ENDPOINT: 'https://chat.glarivoglass.com', OPENAI_API_KEY: 'test-only-not-a-real-key' }
const proposed = () => ({ items: [{ position: 1, imageColumns: 1, labelPrefixes: ['Material:', 'Sizes:'], noteIndices: [1] }] })
const answer = (value: unknown, finish_reason = 'stop') => Response.json({ choices: [{ message: { content: JSON.stringify(value) }, finish_reason }] })

test('AI uses the existing compatible endpoint; preserves every commercial and product value', async () => {
  let calls = 0
  const original = fixture()
  const result = await applyQuotationAiLayout(original, { environment, fetch: async (url, options) => {
    calls++
    assert.equal(url, 'https://chat.glarivoglass.com/v1/chat/completions')
    assert.equal(options?.redirect, 'error')
    assert.equal(new Headers(options?.headers).get('Authorization'), `Bearer ${environment.OPENAI_API_KEY}`)
    const body = JSON.parse(String(options?.body))
    assert.equal(body.model, 'gpt-5.4')
    assert.ok(!String(options?.body).includes('PRIVATE CUSTOMER'))
    assert.ok(!String(options?.body).includes('1250.00'))
    assert.ok(!String(options?.body).includes('private@example.invalid'))
    assert.ok(!String(options?.body).includes('PRIVATE TERMS'))
    assert.deepEqual(JSON.parse(body.messages[1].content).items, quotationLayoutInput(original))
    return answer(proposed())
  } })
  const { layout, ...rest } = result
  assert.deepEqual(rest, original)
  assert.equal(layout?.inputHash, quotationLayoutHash(original))
  assert.equal(calls, 1)
  await applyQuotationAiLayout(result, { fetch: async () => { throw new Error('Must reuse stored layout') } })
  assert.equal(calls, 1)
})

test('endpoint normalization and missing configuration fail without a network call', async () => {
  for (const path of ['', '/', '/v1', '/v1/', '/v1/chat/completions']) {
    assert.equal(quotationAiConfig({ ...environment, OPENAI_API_ENDPOINT: `https://chat.glarivoglass.com${path}` }).url, 'https://chat.glarivoglass.com/v1/chat/completions')
  }
  await assert.rejects(applyQuotationAiLayout(fixture(), { environment: { NODE_ENV: 'test' }, fetch: async () => { throw new Error('Must not call') } }), /OPENAI_API_ENDPOINT/)
  assert.throws(() => quotationAiConfig({ ...environment, OPENAI_API_ENDPOINT: 'https://user:password@example.invalid' }), /HTTPS/)
})

test('AI cannot add claims, remove fields, switch items or inject HTML into layout', async () => {
  const invalid = [
    { ...proposed(), html: '<script>bad()</script>' },
    { items: [{ ...proposed().items[0], labelPrefixes: ['Material:'] }] },
    { items: [{ ...proposed().items[0], position: 2 }] },
    { items: [{ ...proposed().items[0], labelPrefixes: ['Material: Cotton', 'Sizes:'] }] },
    { items: [{ ...proposed().items[0], labelPrefixes: ['Certified:', 'Sizes:'] }] },
    { items: [{ ...proposed().items[0], noteIndices: [99] }] },
    { items: [{ ...proposed().items[0], noteIndices: [1, 1] }] },
    { items: [{ ...proposed().items[0], imageColumns: 2 }] },
    { items: [{ ...proposed().items[0], name: 'Certified claim invented by model' }] },
  ]
  for (const value of invalid) await assert.rejects(applyQuotationAiLayout(fixture(), { environment, fetch: async () => answer(value) }))
})

test('AI HTTP failures, invalid/oversized output and incomplete output are safe and not retried', async () => {
  let calls = 0
  await assert.rejects(applyQuotationAiLayout(fixture(), { environment, fetch: async () => {
    calls++; return new Response('SECRET SDK diagnostic', { status: 401 })
  } }), (error: unknown) => error instanceof Error && /HTTP 401/.test(error.message) && !error.message.includes('SECRET'))
  assert.equal(calls, 1)
  for (const response of [new Response('not JSON'), new Response('x'.repeat(128_001)), answer(proposed(), 'length')]) {
    await assert.rejects(applyQuotationAiLayout(fixture(), { environment, fetch: async () => response }), /响应不可用/)
  }
})

test('stored layout rejects stale product content while legacy templates never call AI', async () => {
  const value = fixture()
  assert.throws(() => validateJordanLayout(value, { version: '1', inputHash: '0'.repeat(64), model: 'test', items: [{ position: 1, imageColumns: 1, labelLengths: [9, 6], noteIndices: [1] }] }), /不一致/)
  value.templateVersion = 'presentation-v2'
  assert.deepEqual(await applyQuotationAiLayout(value, { fetch: async () => { throw new Error('Must not call') } }), value)
})

test('Jordan template renders one-page short quotes with inline totals and long specifications across pages', async () => {
  const value = fixture()
  await assert.rejects(generateCustomerPdf(value, { configuredPath: '', systemPaths: [] }), /缺少 AI 排版/)
  const pdf = await generateCustomerPdf(value, { configuredPath: '', systemPaths: [] }, true)
  assert.equal((pdf.toString('latin1').match(/\/Type\s*\/Page\b/g) ?? []).length, 1)
  assert.match(pdf.toString('latin1'), /\/MediaBox \[0 0 841/)
  value.items[0].specifications = Array.from({ length: 70 }, (_, i) => `Specification ${i}: ${'Description content. '.repeat(10)}`)
  const longPdf = await generateCustomerPdf(value, { configuredPath: '', systemPaths: [] }, true)
  assert.ok((longPdf.toString('latin1').match(/\/Type\s*\/Page\b/g) ?? []).length > 3)
})
