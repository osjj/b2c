import assert from 'node:assert/strict'
import test from 'node:test'

import { QuotationError } from './errors'
import { assertQuotationImageBudget } from './image-budget'

const MIB = 1024 * 1024

test('allows an 81-image quotation totaling 91,300,876 bytes above the former 64 MiB budget', () => {
  const totalBytes = 91_300_876
  const imageCount = 81
  const assets = Array.from({ length: imageCount }, (_, index) => ({
    sizeBytes: Math.floor(totalBytes / imageCount) + (index < totalBytes % imageCount ? 1 : 0),
  }))
  assert.equal(assets.reduce((total, asset) => total + asset.sizeBytes, 0), totalBytes)

  assert.doesNotThrow(() => assertQuotationImageBudget(assets))
})

test('allows no images and an image at the exact 5 MiB limit', () => {
  assert.doesNotThrow(() => assertQuotationImageBudget([]))
  assert.doesNotThrow(() => assertQuotationImageBudget([{ sizeBytes: 5 * MIB }]))
})

test('allows image sets below, at and above the former 64 MiB limit', () => {
  for (const offset of [-1, 0, 1]) {
    const assets = [
      ...Array.from({ length: 12 }, () => ({ sizeBytes: 5 * MIB })),
      { sizeBytes: 4 * MIB + offset },
    ]

    assert.doesNotThrow(() => assertQuotationImageBudget(assets))
  }
})

test('rejects one byte above the per-image limit with the limit and full current total', () => {
  assert.throws(
    () => assertQuotationImageBudget([{ sizeBytes: 5 * MIB + 1 }, { sizeBytes: MIB }]),
    (error: unknown) => {
      assert.ok(error instanceof QuotationError)
      assert.equal(error.code, 'FILE_TOO_LARGE')
      assert.match(error.message, /不能超过 5 MiB/)
      assert.match(error.message, /当前最大图片为 5\.000001 MiB/)
      assert.match(error.message, /本次图片总量为 6\.000001 MiB/)
      assert.match(error.message, /压缩或替换/)
      return true
    },
  )
})

test('rejects non-positive, fractional, non-finite and unsafe image metadata', () => {
  const invalidSizes = [0, -1, 0.5, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1]

  for (const sizeBytes of invalidSizes) {
    assert.throws(
      () => assertQuotationImageBudget([{ sizeBytes: MIB }, { sizeBytes }]),
      (error: unknown) => {
        assert.ok(error instanceof QuotationError)
        assert.equal(error.code, 'VALIDATION_FAILED')
        assert.match(error.message, /大小记录无效/)
        assert.doesNotMatch(error.message, /NaN|Infinity/)
        return true
      },
    )
  }
})

test('rejects aggregate metadata that cannot be summed safely', () => {
  assert.throws(
    () => assertQuotationImageBudget([{ sizeBytes: Number.MAX_SAFE_INTEGER }, { sizeBytes: 1 }]),
    (error: unknown) => {
      assert.ok(error instanceof QuotationError)
      assert.equal(error.code, 'VALIDATION_FAILED')
      assert.match(error.message, /总大小记录无效/)
      return true
    },
  )
})
