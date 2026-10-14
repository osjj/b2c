// Only stable categories are stored. Provider error text can contain addresses,
// request bodies or secrets and must never reach the database or client.
const failureReasons = {
  PROVIDER_PERMISSION_DENIED: 'SMTP2GO 拒绝发送：当前 API 密钥没有此发送接口的权限。请在 SMTP2GO 为该密钥启用 /email/send 权限，并确认服务器使用了更新后的密钥，再新建发送尝试。',
  PROVIDER_AUTHENTICATION_FAILED: 'SMTP2GO 身份验证失败。请检查服务器配置的 SMTP2GO API 密钥是否正确、有效，再新建发送尝试。',
  PROVIDER_RATE_LIMITED: 'SMTP2GO 暂时限制了请求频率。本次发送已被拒绝，请稍后新建发送尝试。',
  PROVIDER_INVALID_REQUEST: 'SMTP2GO 拒绝了邮件参数。请检查收件人、发件人和附件，并使用请求编号查询 SMTP2GO 日志；修正后再新建发送尝试。',
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
