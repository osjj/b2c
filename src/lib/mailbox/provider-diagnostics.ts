import { z } from 'zod'

// Only stable categories are stored. Provider error text can contain addresses,
// request bodies or secrets and must never reach the database or client.
const failureReasons = {
  PROVIDER_PERMISSION_DENIED: 'SMTP2GO 拒绝发送：当前 API 密钥没有此发送接口的权限。请在 SMTP2GO 为该密钥启用 /email/send 权限，并确认服务器使用了更新后的密钥，再新建发送尝试。',
  PROVIDER_AUTHENTICATION_FAILED: 'SMTP2GO 身份验证失败。请检查服务器配置的 SMTP2GO API 密钥是否正确、有效，再新建发送尝试。',
  PROVIDER_RATE_LIMITED: 'SMTP2GO 暂时限制了请求频率。本次发送已被拒绝，请稍后新建发送尝试。',
  PROVIDER_INVALID_REQUEST: 'SMTP2GO 拒绝了邮件参数。请查看下方参数校验详情并修正后再新建发送尝试；若未保存参数详情，请携带请求编号联系 SMTP2GO 支持。',
  PROVIDER_REJECTED: 'SMTP2GO 已拒绝本次发送，但未保存可识别的具体原因。请使用请求编号查看 SMTP2GO 日志，核对发送权限、发件域、账户额度和收件人；确认修正后再新建发送尝试。',
} as const

export type ProviderDiagnosticCode = keyof typeof failureReasons

// These exact error_code values are documented by SMTP2GO. Do not infer a
// category from the provider's free-form error/error_description strings.
const providerCodes: Readonly<Record<string, ProviderDiagnosticCode>> = {
  'E_ApiResponseCodes.ENDPOINT_PERMISSION_DENIED': 'PROVIDER_PERMISSION_DENIED',
  'E_ApiResponseCodes.NON_VALIDATING_IN_PAYLOAD': 'PROVIDER_INVALID_REQUEST',
}

function record(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : undefined
}

export function safeProviderDiagnosticCode(value: unknown): ProviderDiagnosticCode {
  return typeof value === 'string' && Object.hasOwn(failureReasons, value) ? value as ProviderDiagnosticCode : 'PROVIDER_REJECTED'
}

export function providerFailureReason(code: unknown): string {
  return failureReasons[safeProviderDiagnosticCode(code)]
}

const MAX_FIELD_LENGTH = 128
const MAX_PROVIDER_MESSAGE_LENGTH = 4_096
const MAX_VALIDATION_ISSUES = 10
const MAX_INSPECTED_ISSUES = 50
const MAX_INDEX = 999
const MAX_LIMIT = 1_000_000_000

const scalarFields = new Set(['sender', 'subject', 'text_body', 'html_body', 'fastaccept'])
const addressFields = new Set(['to', 'cc', 'bcc'])
const fileProperties = new Set(['filename', 'mimetype', 'fileblob'])
const headerProperties = new Set(['header', 'value'])

/** Keep only payload names, never arbitrary provider-supplied path fragments. */
function normalizeParameterField(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.length > MAX_FIELD_LENGTH) return undefined
  const field = value.trim()
  if (scalarFields.has(field) || addressFields.has(field)
    || field === 'attachments' || field === 'inlines' || field === 'custom_headers') return field

  const path = /^(to|cc|bcc|attachments|inlines|custom_headers)(?:\[(\d{1,3})\]|\.(\d{1,3}))(?:\.([a-z_]+))?$/.exec(field)
  if (!path) return undefined
  const [, root, bracketIndex, dotIndex, property] = path
  const index = Number(bracketIndex ?? dotIndex)
  if (index > MAX_INDEX) return undefined
  if (addressFields.has(root)) return property ? undefined : `${root}[${index}]`
  if (property && !(root === 'custom_headers' ? headerProperties : fileProperties).has(property)) return undefined
  return `${root}[${index}]${property ? `.${property}` : ''}`
}

const validationIssueSchema = z.object({
  field: z.string().max(MAX_FIELD_LENGTH).refine(field => normalizeParameterField(field) === field),
  reason: z.enum(['invalid_email', 'required', 'invalid_type', 'invalid_base64', 'too_long', 'too_short', 'invalid_value', 'invalid_format']),
  expectedType: z.enum(['string', 'array', 'object', 'boolean', 'number']).optional(),
  limit: z.number().int().min(0).max(MAX_LIMIT).optional(),
})

export const providerFailureDiagnosticsSchema = z.object({
  httpStatus: z.number().int().min(100).max(599),
  validationErrors: z.array(validationIssueSchema).max(MAX_VALIDATION_ISSUES),
})

export type ProviderFailureDiagnostics = z.infer<typeof providerFailureDiagnosticsSchema>
type ProviderValidationIssue = ProviderFailureDiagnostics['validationErrors'][number]

const expectedTypeLabels = {
  string: '字符串', array: '数组', object: '对象', boolean: '布尔值', number: '数字',
} as const

export function formatProviderValidationIssue(issue: ProviderValidationIssue): string {
  switch (issue.reason) {
    case 'invalid_email': return '电子邮件地址格式无效。'
    case 'required': return '缺少必填参数或参数为空。'
    case 'invalid_type': return issue.expectedType ? `应为${expectedTypeLabels[issue.expectedType]}。` : '参数类型不正确。'
    case 'invalid_base64': return '内容必须为有效的 Base64 编码。'
    case 'too_long': return issue.limit === undefined ? '超过允许的长度或数量。' : `超过允许的长度或数量（上限 ${issue.limit}）。`
    case 'too_short': return issue.limit === undefined ? '未达到要求的长度或数量。' : `未达到要求的长度或数量（下限 ${issue.limit}）。`
    case 'invalid_value': return '参数值不在允许范围内。'
    case 'invalid_format': return '参数格式不符合邮件服务要求。'
  }
}

function safeLimit(value: string | undefined): number | undefined {
  if (value === undefined) return undefined
  const limit = Number(value)
  return Number.isSafeInteger(limit) && limit >= 0 && limit <= MAX_LIMIT ? limit : undefined
}

/** Read numeric lengths only from the exact provider grammar, never rejected values. */
function lengthRangeIssue(value: unknown, field: string): ProviderValidationIssue | undefined {
  if (typeof value !== 'string' || value.length > MAX_PROVIDER_MESSAGE_LENGTH) return undefined
  const match = /^the field (?:'([^']+)'|"([^"]+)") was expecting a value with a length between (\d{1,10}) and (\d{1,10}) but found a value with length of (\d{1,10})(?:, please correct your json payload and try again\.)?$/i.exec(value.trim())
  if (!match || normalizeParameterField(match[1] ?? match[2]) !== field) return undefined
  const minimum = safeLimit(match[3])
  const maximum = safeLimit(match[4])
  const actual = safeLimit(match[5])
  if (minimum === undefined || maximum === undefined || actual === undefined || minimum > maximum) return undefined
  if (actual > maximum) return { field, reason: 'too_long', limit: maximum }
  if (actual < minimum) return { field, reason: 'too_short', limit: minimum }
  return undefined
}

/** Interpret only expected constraints, before any rejected actual value. */
function expectationText(value: unknown, field: string): string | undefined {
  if (typeof value !== 'string' || value.length > MAX_PROVIDER_MESSAGE_LENGTH) return undefined
  let message = value.trim().split(/\b(?:but|instead|however)\s+(?:found|received|got)\b|\b(?:found|received|got|provided|actual value)\s*[:=]/i, 1)[0].trim()
  const official = /^the field (?:'([^']+)'|"([^"]+)") (?:was expecting|is expecting|expects|expected)\s+(.+)$/i.exec(message)
  if (official) {
    if (normalizeParameterField(official[1] ?? official[2]) !== field) return undefined
    message = `expected ${official[3]}`
  }
  return message.toLowerCase()
}

function validationIssue(field: string, rawMessage: unknown): ProviderValidationIssue {
  const lengthIssue = lengthRangeIssue(rawMessage, field)
  if (lengthIssue) return lengthIssue
  const message = expectationText(rawMessage, field)
  const generic: ProviderValidationIssue = { field, reason: 'invalid_format' }
  if (!message) return generic

  const expected = message.replace(/^(?:expected|expecting)\s*:?\s*(?:an?\s+)?(?:value\s+of\s+type\s+)?/, '')
  const email = /^(?:valid\s+)?(?:rfc[- ]?822\s+(?:formatted\s+)?)?(?:e-?mail(?:\s+address)?|emailaddress)(?:\s|[.,;:]|$)/
  if ((expected !== message && email.test(expected))
    || /^(?:invalid\s+(?:e-?mail|emailaddress)|(?:must|should) be (?:an? )?(?:valid )?(?:rfc[- ]?822\s+(?:formatted\s+)?)?(?:e-?mail|emailaddress))\b/.test(message)) {
    return { field, reason: 'invalid_email' }
  }
  if (/^(?:(?:this |the )?(?:field|parameter|value) (?:is )?)?required\b|^missing (?:a |the )?(?:required )?(?:value|field|parameter)\b|^(?:must|should) (?:be provided|not be (?:empty|null)|have a value)\b/.test(message)
    || (expected !== message && /^(?:required|non[- ]empty)\s+(?:value|field|parameter|string)\b/.test(expected))) {
    return { field, reason: 'required' }
  }
  if ((expected !== message && /^(?:valid )?base-?64\b/.test(expected))
    || /^(?:invalid base-?64|(?:must|should) be (?:a )?(?:valid )?base-?64)\b/.test(message)) {
    return { field, reason: 'invalid_base64' }
  }
  const typeMessage = expected !== message ? expected : message.replace(/^(?:must|should) be (?:an? )?/, '')
  const expectedType = /^(?:valid )?['"]?(string|array|object|boolean|number)['"]?(?:\s|[.,;:]|$)/.exec(typeMessage)
  if (expectedType && typeMessage !== message) return { field, reason: 'invalid_type', expectedType: expectedType[1] as NonNullable<ProviderValidationIssue['expectedType']> }
  if (/^invalid (?:type|data type)\b/.test(message)) return { field, reason: 'invalid_type' }

  const constraintMessage = expected !== message ? expected : message
  for (const [reason, constraint, short] of [
    ['too_long', 'maximum|max', 'at most|no more than'],
    ['too_short', 'minimum|min', 'at least|no fewer than|no less than'],
  ] as const) {
    const prefix = new RegExp(`^(?:(?:${constraint})(?: (?:allowed )?(?:length|size|count|number))?(?: of| is|:)?\\s*|(?:must|should) (?:be|contain|have) (?:${short})\\s*|(?:length|size|count|number) (?:must|should) be (?:${short})\\s*)`)
    const match = prefix.exec(constraintMessage)
    if (match) {
      const numeric = /^(\d{1,10})(?![\d.eE+\-])(?:\b|$)/.exec(constraintMessage.slice(match[0].length))
      const limit = safeLimit(numeric?.[1])
      return limit === undefined ? { field, reason } : { field, reason, limit }
    }
  }
  if (/^too (?:long|large|many)\b/.test(message)) return { field, reason: 'too_long' }
  if (/^too (?:short|small|few)\b/.test(message)) return { field, reason: 'too_short' }
  if (/^invalid (?:value|enum|choice)\b|^(?:must|should) be (?:one of|equal to|between)\b|^expected (?:one of|a value (?:from|in)|a (?:valid )?(?:enum|choice))\b/.test(message)) return { field, reason: 'invalid_value' }
  return generic
}

/** Call only after the response has independently proved rejection. */
export function extractProviderFailureDiagnostics(raw: unknown, httpStatus: number): ProviderFailureDiagnostics {
  const payload = record(raw)
  const data = record(payload?.data)
  const issues: ProviderValidationIssue[] = []
  const seen = new Set<string>()
  for (const source of [data?.field_validation_errors, payload?.field_validation_errors]) {
    const entries = Array.isArray(source) ? source.slice(0, MAX_INSPECTED_ISSUES) : [source]
    for (const entry of entries) {
      if (issues.length >= MAX_VALIDATION_ISSUES) break
      const item = record(entry)
      const field = normalizeParameterField(item?.fieldname)
      if (!field || seen.has(field)) continue
      seen.add(field)
      issues.push(validationIssue(field, item?.message))
    }
  }
  return { httpStatus: Number.isInteger(httpStatus) && httpStatus >= 100 && httpStatus <= 599 ? httpStatus : 400, validationErrors: issues }
}

/** Stored and browser metadata are untrusted; strip all unrecognized attributes. */
export function readProviderFailureDiagnostics(value: unknown): ProviderFailureDiagnostics | undefined {
  const result = providerFailureDiagnosticsSchema.safeParse(value)
  return result.success ? result.data : undefined
}

/** Call only after the response has independently proved rejection. */
export function providerDiagnosticCode(raw: unknown, status?: number): ProviderDiagnosticCode {
  const payload = record(raw)
  const data = record(payload?.data)
  const codes = [payload?.error_code, data?.error_code]
  if (Array.isArray(data?.failures)) {
    codes.push(...data.failures.map(failure => record(failure)?.error_code))
  }
  for (const code of codes) {
    if (typeof code === 'string' && Object.hasOwn(providerCodes, code)) return providerCodes[code]
  }
  // Documented HTTP meanings; do not guess business causes for 400 or 402.
  if (status === 401) return 'PROVIDER_AUTHENTICATION_FAILED'
  if (status === 403) return 'PROVIDER_PERMISSION_DENIED'
  if (status === 429) return 'PROVIDER_RATE_LIMITED'
  return 'PROVIDER_REJECTED'
}
