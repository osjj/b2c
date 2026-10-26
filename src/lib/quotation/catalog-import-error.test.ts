import assert from 'node:assert/strict'
import { test } from 'node:test'
import { z } from 'zod'
import { catalogImportFailure, catalogImportStepError } from './catalog-import-error'
import { QuotationError } from './errors'

test('import diagnostics explain storage, database and network causes without exposing raw details', () => {
  const cases = [
    [{ name: 'AccessDenied' }, 'storage', /读写权限/],
    [{ name: 'SignatureDoesNotMatch' }, 'storage', /密钥配置/],
    [{ name: 'InvalidAccessKeyId' }, 'storage', /密钥配置/],
    [{ name: 'NoSuchBucket' }, 'storage', /存储桶/],
    [{ name: 'AbortError' }, 'download', /超时/],
    [{ code: 'P2021' }, 'database', /迁移/],
    [{ code: 'P2022' }, 'database', /迁移/],
    [{ code: 'P2024' }, 'database', /超时/],
    [{ code: 'P2034' }, 'database', /另一个操作/],
    [{ code: 'P2010' }, 'database', /P2010/],
    [{ errorCode: 'P1001' }, 'database', /连接不可用/],
    [{ cause: { code: 'UND_ERR_CONNECT_TIMEOUT' } }, 'download', /超时/],
    [{ cause: { code: 'ECONNRESET' } }, 'storage', /连接中断/],
    [{ name: 'TypeError' }, 'download', /读取商城图片/],
  ] as const
  for (const [error, stage, expected] of cases) {
    const result = catalogImportStepError({ ...error, message: 'SECRET https://private.example/quotation/key', stack: 'SECRET_STACK' }, stage, 2)
    assert.match(result.message, expected)
    assert.match(result.message, /第 2 张图片/)
    assert.equal(result.stage, stage)
    assert.doesNotMatch(result.message, /SECRET|private\.example|quotation\/key/)
  }
})

test('Sharp processing timeout is explained as a timeout without exposing the native message', () => {
  const result = catalogImportStepError(new Error('timeout: 10 seconds; PRIVATE_SECRET_KEY native details'), 'conversion', 1)
  assert.match(result.message, /超时/)
  assert.doesNotMatch(result.message, /PRIVATE_SECRET_KEY|native details/)
  assert.equal(result.code, 'INTERNAL_ERROR')
})

test('nested stage errors preserve safe image details and domain codes', () => {
  const inner = catalogImportStepError(new QuotationError('FILE_TOO_LARGE', '商品图片超过 5 MB'), 'download', 3)
  const outer = catalogImportStepError(inner, 'database')
  assert.equal(outer, inner)
  assert.equal(outer.code, 'FILE_TOO_LARGE')
  assert.equal(outer.stage, 'download')
})

test('validation explains the invalid request without leaking input values', () => {
  const parsed = z.object({ id: z.string().cuid() }).safeParse({ id: 'PRIVATE_SECRET_KEY' })
  assert.equal(parsed.success, false)
  if (parsed.success) return
  const safe = catalogImportStepError(parsed.error, 'preparation')
  assert.equal(safe.code, 'VALIDATION_FAILED')
  assert.match(safe.message, /格式不正确/)
  assert.doesNotMatch(safe.message, /PRIVATE_SECRET_KEY/)
})

test('uncertain commits carry inspect-state guidance and correlate safe logs with the response', () => {
  const reference = '22222222-2222-4222-8222-222222222222'
  const result = catalogImportFailure(new Error('PRIVATE_SECRET_KEY raw engine'), { requestId: reference, stage: 'database', outcomeUnknown: true })
  assert.equal(result.outcomeUnknown, true)
  assert.equal(result.requestId, reference)
  assert.match(result.reason, /先检查常用产品列表/)
  assert.match(result.reason, new RegExp(reference))
  assert.doesNotMatch(result.reason, /PRIVATE_SECRET_KEY|raw engine/)
})
