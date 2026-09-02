import assert from 'node:assert/strict'
import test from 'node:test'

import sharp from 'sharp'

import { validateQuotationImage } from './file-validation'

test('validates a decodable image with matching name, MIME, and magic bytes', async () => {
  const bytes = await sharp({
    create: { width: 2, height: 2, channels: 3, background: '#ffffff' },
  }).png().toBuffer()

  const result = await validateQuotationImage({
    filename: 'product.png',
    contentType: 'image/png',
    bytes,
  })

  assert.equal(result.contentType, 'image/png')
  assert.equal(result.sizeBytes, bytes.length)
  assert.match(result.sha256, /^[a-f0-9]{64}$/)
})

test('rejects truncated content even when its magic bytes look valid', async () => {
  await assert.rejects(
    validateQuotationImage({
      filename: 'product.png',
      contentType: 'image/png',
      bytes: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    }),
    /corrupt|pixel/i,
  )
})

test('rejects MIME and extension mismatches', async () => {
  const bytes = await sharp({
    create: { width: 2, height: 2, channels: 3, background: '#ffffff' },
  }).jpeg().toBuffer()

  await assert.rejects(
    validateQuotationImage({
      filename: 'product.png',
      contentType: 'image/jpeg',
      bytes,
    }),
    /extension/i,
  )
})
