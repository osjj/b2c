import assert from 'node:assert/strict'
import { test } from 'node:test'

import { QuotationError } from './errors'
import { atFinalizationStage, finalizationError } from './finalization-error'

test('R2 failures give actionable messages without leaking SDK diagnostics', () => {
  const cases = [
    ['SignatureDoesNotMatch', /credentials were rejected/],
    ['InvalidAccessKeyId', /credentials were rejected/],
    ['AccessDenied', /Object Read & Write/],
    ['NoSuchBucket', /bucket was not found/],
    ['NoSuchKey', /file was not found/],
    ['TimeoutError', /timed out/],
  ] as const
  for (const [name, expected] of cases) {
    const result = finalizationError({ name, message: 'secret-value https://private.example/quotation/key', stack: 'secret-stack' }, 'storage')
    assert.equal(result.code, 'DOCUMENT_GENERATION_FAILED')
    assert.match(result.message, expected)
    assert.doesNotMatch(result.message, /secret-value|private\.example|quotation\/key|secret-stack/)
  }
})

test('unknown failures identify the failed step but never expose raw messages', () => {
  const result = finalizationError(new Error('password=private-value'), 'database')
  assert.match(result.message, /^Document database save:/)
  assert.doesNotMatch(result.message, /password|private-value/)
})

test('a known font failure retains its safe detail and correct stage through outer catches', async () => {
  let caught: unknown
  try {
    await atFinalizationStage('pdf', async () => {
      throw new QuotationError('DOCUMENT_GENERATION_FAILED', 'No usable system font. Set QUOTATION_PDF_FONT_PATH.')
    })
  } catch (error) { caught = error }
  const result = finalizationError(caught, 'snapshot')
  assert.match(result.message, /^PDF generation: No usable system font/)
  assert.match(result.message, /QUOTATION_PDF_FONT_PATH/)
  assert.doesNotMatch(result.message, /Quotation snapshot/)
})

test('stage wrappers preserve successful results and typed validation failures', async () => {
  assert.equal(await atFinalizationStage('excel', async () => 'complete'), 'complete')
  const result = finalizationError(new QuotationError('DOCUMENT_VALIDATION_FAILED', 'Generated PDF is invalid'), 'validation')
  assert.equal(result.code, 'DOCUMENT_VALIDATION_FAILED')
  assert.equal(result.message, 'Document validation: Generated PDF is invalid')
})
