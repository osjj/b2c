import { z } from 'zod'
import { unstable_rethrow } from 'next/navigation'
import { QuotationError, type QuotationErrorCode } from './errors'

export type CatalogImportStage = 'preparation' | 'download' | 'conversion' | 'storage' | 'database' | 'refresh'
const labels: Record<CatalogImportStage, string> = {
  preparation: '检查商品资料', download: '下载商品图片', conversion: '处理商品图片',
  storage: '保存私有图片', database: '保存常用产品', refresh: '刷新产品列表',
}

export class CatalogImportError extends QuotationError {
  constructor(readonly stage: CatalogImportStage, code: QuotationErrorCode, message: string) {
    super(code, message)
    this.name = 'CatalogImportError'
  }
}

function detail(error: unknown, stage: CatalogImportStage): { code: QuotationErrorCode; message: string } {
  if (error instanceof QuotationError) return { code: error.code, message: error.message }
  if (error instanceof z.ZodError) return { code: 'VALIDATION_FAILED', message: '商品资料或请求参数格式不正确，请重新搜索并检查名称、规格和价格。' }
  const value = error && typeof error === 'object' ? error : {}
  const name = 'name' in value && typeof value.name === 'string' ? value.name : ''
  const code = 'code' in value && typeof value.code === 'string' ? value.code
    : 'errorCode' in value && typeof value.errorCode === 'string' ? value.errorCode : ''
  const cause = 'cause' in value && value.cause && typeof value.cause === 'object' ? value.cause : {}
  const networkCode = 'code' in cause && typeof cause.code === 'string' ? cause.code : code
  if (['AbortError', 'TimeoutError', 'RequestTimeout', 'RequestTimeoutException'].includes(name)
    || ['ETIMEDOUT', 'UND_ERR_CONNECT_TIMEOUT', 'UND_ERR_HEADERS_TIMEOUT', 'UND_ERR_BODY_TIMEOUT'].includes(networkCode)
    || (stage === 'conversion' && error instanceof Error && /timeout|timed out/i.test(error.message))) {
    return { code: 'INTERNAL_ERROR', message: '此步骤已超时，请检查网络或存储服务后重试；也可先取消复制图片，导入文字资料。' }
  }
  if (['ECONNRESET', 'ECONNREFUSED', 'ENOTFOUND', 'EAI_AGAIN', 'UND_ERR_SOCKET'].includes(networkCode)) {
    return { code: 'INTERNAL_ERROR', message: '连接中断或无法连接服务，请检查服务器网络及存储域名配置。' }
  }
  if (['AccessDenied', 'Forbidden'].includes(name)) return { code: 'FORBIDDEN', message: '私有图片存储拒绝访问，请检查报价私有存储的读写权限。' }
  if (['InvalidAccessKeyId', 'SignatureDoesNotMatch', 'CredentialsProviderError', 'ExpiredToken'].includes(name)) return { code: 'FEATURE_DISABLED', message: '私有图片存储认证失败，请检查报价私有存储的密钥配置。' }
  if (name === 'NoSuchBucket') return { code: 'FEATURE_DISABLED', message: '报价私有存储桶不存在，请检查存储桶配置。' }
  if (name === 'NoSuchKey' || name === 'NotFound') return { code: 'NOT_FOUND', message: '商品图片不存在，请在商城商品中检查或重新上传图片。' }
  if (code === 'P2021' || code === 'P2022') return { code: 'INTERNAL_ERROR', message: '数据库缺少所需的表或字段，请确认服务器数据库迁移已完成。' }
  if (code === 'P2024' || code === 'P2028') return { code: 'INTERNAL_ERROR', message: '数据库连接或事务等待超时，请稍后重新检查常用产品列表。' }
  if (code === 'P2034' || code === 'P2002') return { code: 'VERSION_CONFLICT', message: '另一个操作正在修改相关资料，请刷新列表后重新确认。' }
  if (code === 'P1000') return { code: 'INTERNAL_ERROR', message: '数据库认证失败，请检查服务器数据库账号配置。' }
  if (['P1001', 'P1002', 'P1017'].includes(code)) return { code: 'INTERNAL_ERROR', message: '数据库连接不可用或已超时，请检查数据库服务和连接配置。' }
  if (/^P\d{4}$/.test(code)) return { code: 'INTERNAL_ERROR', message: `数据库操作失败（${code}），请凭排查编号检查服务器数据库日志。` }
  if (stage === 'conversion') return { code: 'VALIDATION_FAILED', message: '图片无法解码或转换，请使用有效的静态 PNG、JPEG 或 WebP 图片（最多 4000 万像素）。' }
  if (stage === 'download') return { code: 'INTERNAL_ERROR', message: '无法读取商城图片，请检查图片地址是否可访问，或取消复制图片后导入文字资料。' }
  if (stage === 'storage') return { code: 'INTERNAL_ERROR', message: '私有图片写入失败，请检查报价私有存储配置、网络和读写权限。' }
  return { code: 'INTERNAL_ERROR', message: '服务器未能完成此步骤，请凭排查编号检查服务器日志。' }
}

export function catalogImportStepError(error: unknown, stage: CatalogImportStage, imageNumber?: number): CatalogImportError {
  if (error instanceof CatalogImportError) return error
  const safe = detail(error, stage)
  return new CatalogImportError(stage, safe.code, `${imageNumber ? `第 ${imageNumber} 张图片：` : ''}${safe.message}`)
}

export function catalogImportFailure(error: unknown, context: { requestId: string; stage: CatalogImportStage; outcomeUnknown?: boolean }) {
  unstable_rethrow(error)
  const failure = catalogImportStepError(error, context.stage)
  const outcomeUnknown = context.outcomeUnknown === true
  const reason = outcomeUnknown
    ? `保存结果尚未确认：${failure.message} 请先检查常用产品列表，确认结果后再操作。排查编号：${context.requestId}`
    : `导入失败（${labels[failure.stage]}）：${failure.message} 排查编号：${context.requestId}`
  // Fixed application text only: never log raw SDK/Prisma messages, URLs, keys or stacks.
  process.stderr.write(`${JSON.stringify({ event: 'quotation.catalog-import.failed', requestId: context.requestId, stage: failure.stage, code: failure.code, outcomeUnknown, reason: failure.message })}\n`)
  return { success: false as const, code: failure.code, reason, requestId: context.requestId, stage: failure.stage, outcomeUnknown }
}
