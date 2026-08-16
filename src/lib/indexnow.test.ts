import assert from 'node:assert/strict'
import test from 'node:test'

import {
  INDEXNOW_ENDPOINT,
  INDEXNOW_KEY,
  INDEXNOW_KEY_LOCATION,
  INDEXNOW_MAX_URLS,
  buildIndexNowPayload,
  submitIndexNow,
} from './indexnow'

test('buildIndexNowPayload constructs the documented payload and deduplicates URLs', () => {
  assert.deepEqual(
    buildIndexNowPayload([
      'https://www.laifappe.com/products/safety-helmet',
      'https://www.laifappe.com/products/../products/safety-helmet',
      'https://www.laifappe.com/blog/construction-ppe',
    ]),
    {
      host: 'www.laifappe.com',
      key: INDEXNOW_KEY,
      keyLocation: INDEXNOW_KEY_LOCATION,
      urlList: [
        'https://www.laifappe.com/products/safety-helmet',
        'https://www.laifappe.com/blog/construction-ppe',
      ],
    }
  )
})

test('buildIndexNowPayload rejects missing, malformed, non-HTTPS, and cross-origin URLs', () => {
  assert.throws(() => buildIndexNowPayload([]), /At least one IndexNow URL/)
  assert.throws(
    () => buildIndexNowPayload(['not-a-url']),
    /Invalid IndexNow URL/
  )
  assert.throws(
    () => buildIndexNowPayload(['http://www.laifappe.com/products/helmet']),
    /must use HTTPS/
  )
  assert.throws(
    () => buildIndexNowPayload(['https://laifappe.com/products/helmet']),
    /must use the canonical origin/
  )
  assert.throws(
    () =>
      buildIndexNowPayload([
        'https://www.laifappe.com.evil.example/products/helmet',
      ]),
    /must use the canonical origin/
  )
  assert.throws(
    () => buildIndexNowPayload(['https://user@www.laifappe.com/products/helmet']),
    /must not include credentials/
  )
  assert.throws(
    () => buildIndexNowPayload(['https://www.laifappe.com/products/%']),
    /Invalid IndexNow URL/
  )
  assert.throws(
    () => buildIndexNowPayload(['https://www.laifappe.com\\products\\helmet']),
    /Invalid IndexNow URL/
  )
  assert.throws(
    () => buildIndexNowPayload(['https://www.laifappe.com/products/helmet#details']),
    /must not include a fragment/
  )
})

test('buildIndexNowPayload applies the limit after deduplication', () => {
  const repeatedUrl = 'https://www.laifappe.com/products/repeated'
  assert.equal(
    buildIndexNowPayload(Array.from({ length: INDEXNOW_MAX_URLS + 1 }, () => repeatedUrl))
      .urlList.length,
    1
  )

  const oversizedBatch = Array.from(
    { length: INDEXNOW_MAX_URLS + 1 },
    (_, index) => `https://www.laifappe.com/products/product-${index}`
  )
  assert.throws(
    () => buildIndexNowPayload(oversizedBatch),
    /at most 10000 unique URLs/
  )
})

test('submitIndexNow validates before fetch and sends the JSON payload', async () => {
  let requestCount = 0
  let requestInput: string | URL | Request | undefined
  let requestInit: RequestInit | undefined
  const fetchImplementation: typeof fetch = async (input, init) => {
    requestCount += 1
    requestInput = input
    requestInit = init
    return new Response(null, { status: 202 })
  }

  await assert.rejects(
    submitIndexNow(['https://example.com/not-canonical'], fetchImplementation),
    /must use the canonical origin/
  )
  assert.equal(requestCount, 0)

  const oversizedBatch = Array.from(
    { length: INDEXNOW_MAX_URLS + 1 },
    (_, index) => `https://www.laifappe.com/blog/article-${index}`
  )
  await assert.rejects(
    submitIndexNow(oversizedBatch, fetchImplementation),
    /at most 10000 unique URLs/
  )
  assert.equal(requestCount, 0)

  const result = await submitIndexNow(
    [
      'https://www.laifappe.com/products/helmet',
      'https://www.laifappe.com/products/helmet',
    ],
    fetchImplementation
  )

  assert.deepEqual(result, { status: 202, submittedUrlCount: 1 })
  assert.equal(requestCount, 1)
  assert.equal(requestInput, INDEXNOW_ENDPOINT)
  assert.equal(requestInit?.method, 'POST')
  assert.equal(
    new Headers(requestInit?.headers).get('content-type'),
    'application/json; charset=utf-8'
  )
  assert.deepEqual(
    JSON.parse(String(requestInit?.body)),
    buildIndexNowPayload(['https://www.laifappe.com/products/helmet'])
  )
})

test('submitIndexNow reports network and non-success response failures', async () => {
  const networkFailure: typeof fetch = async () => {
    throw new Error('connection refused')
  }
  const responseFailure: typeof fetch = async () =>
    new Response('Invalid key', { status: 403, statusText: 'Forbidden' })
  const undocumentedSuccessResponse: typeof fetch = async () =>
    new Response(null, { status: 204 })

  await assert.rejects(
    submitIndexNow(['https://www.laifappe.com/products/helmet'], networkFailure),
    /IndexNow network request failed: connection refused/
  )
  await assert.rejects(
    submitIndexNow(['https://www.laifappe.com/products/helmet'], responseFailure),
    /IndexNow request failed with HTTP 403 Forbidden: Invalid key/
  )
  await assert.rejects(
    submitIndexNow(
      ['https://www.laifappe.com/products/helmet'],
      undocumentedSuccessResponse
    ),
    /IndexNow request failed with HTTP 204/
  )
})

test('submitIndexNow bounds and normalizes remote error details', async () => {
  const longResponseFailure: typeof fetch = async () =>
    new Response(`First line\n${'x'.repeat(10_000)}`, {
      status: 429,
      statusText: 'Too Many Requests',
    })

  await assert.rejects(
    submitIndexNow(
      ['https://www.laifappe.com/products/helmet'],
      longResponseFailure
    ),
    (error: unknown) => {
      assert.ok(error instanceof Error)
      assert.match(error.message, /^IndexNow request failed with HTTP 429/)
      assert.match(error.message, /: First line x+/)
      assert.equal(error.message.includes('\n'), false)
      assert.ok(error.message.length < 1_200)
      return true
    }
  )
})
