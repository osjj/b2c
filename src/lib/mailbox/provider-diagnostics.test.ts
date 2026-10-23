import assert from 'node:assert/strict'
import test from 'node:test'

import { extractProviderFailureDiagnostics, formatProviderValidationIssue, providerDiagnosticCode, providerFailureDiagnosticsSchema, providerFailureReason, readProviderFailureDiagnostics, safeProviderDiagnosticCode } from './provider-diagnostics'
import { classifyProviderResponse } from './reply'

test('provider diagnostics recognize only documented exact codes and stable HTTP meanings', () => {
  assert.equal(providerDiagnosticCode({ data: { error_code: 'E_ApiResponseCodes.ENDPOINT_PERMISSION_DENIED' } }, 400), 'PROVIDER_PERMISSION_DENIED')
  assert.equal(providerDiagnosticCode({ error_code: 'E_ApiResponseCodes.NON_VALIDATING_IN_PAYLOAD' }, 400), 'PROVIDER_INVALID_REQUEST')
  assert.equal(providerDiagnosticCode({ data: { failures: [{ error_code: 'E_ApiResponseCodes.NON_VALIDATING_IN_PAYLOAD' }] } }), 'PROVIDER_INVALID_REQUEST')
  assert.equal(providerDiagnosticCode({}, 401), 'PROVIDER_AUTHENTICATION_FAILED')
  assert.equal(providerDiagnosticCode({}, 403), 'PROVIDER_PERMISSION_DENIED')
  assert.equal(providerDiagnosticCode({}, 429), 'PROVIDER_RATE_LIMITED')
  assert.equal(providerDiagnosticCode({}, 402), 'PROVIDER_REJECTED')
  assert.equal(providerDiagnosticCode({ error_code: 'E_ApiResponseCodes.API_EXCEPTION' }, 400), 'PROVIDER_REJECTED')
})

test('free-form provider text and unrecognized codes cannot become diagnostics or public error text', () => {
  const privateError = 'secret API key; ENDPOINT_PERMISSION_DENIED; quota exceeded; sender not verified'
  for (const raw of [
    null,
    { data: { error: privateError } },
    { error_code: privateError },
    { error_code: '__proto__' },
    { error_code: 'endpoint_permission_denied' },
    { error_code: 'E_ApiResponseCodes.NOT_DOCUMENTED_SENDER_ERROR' },
  ]) {
    assert.equal(providerDiagnosticCode(raw, 400), 'PROVIDER_REJECTED')
    assert.ok(!providerFailureReason(providerDiagnosticCode(raw)).includes(privateError))
  }
  assert.equal(safeProviderDiagnosticCode('__proto__'), 'PROVIDER_REJECTED')
  assert.equal(safeProviderDiagnosticCode('PROVIDER_AUTHENTICATION_FAILED'), 'PROVIDER_AUTHENTICATION_FAILED')
})

test('diagnostic codes never turn ambiguous or partial delivery into a retryable failure', () => {
  const denied = { error: 'private detail', error_code: 'E_ApiResponseCodes.ENDPOINT_PERMISSION_DENIED' }
  assert.equal(classifyProviderResponse(500, { data: denied }).state, 'unknown')
  assert.equal(classifyProviderResponse(200, { data: { ...denied, succeeded: 1, failed: 1 } }).state, 'unknown')
  assert.equal(classifyProviderResponse(401, {}).state, 'unknown')
  assert.equal(classifyProviderResponse(429, { data: { error: 'rate exceeded' } }).errorCode, 'PROVIDER_RATE_LIMITED')
})

test('server errors retain only the request identifier regardless of misleading acceptance or rejection fields', () => {
  for (const data of [
    { succeeded: 0, failed: 1, failures: ['private detail'] },
    { succeeded: 0, failed: 1, error_code: 'E_ApiResponseCodes.ENDPOINT_PERMISSION_DENIED' },
    { succeeded: 1, failed: 0, failures: [] },
  ]) {
    for (const status of [500, 502, 503, 504]) {
      assert.deepEqual(classifyProviderResponse(status, { request_id: 'safe-request-id', data }), {
        state: 'unknown', requestId: 'safe-request-id',
      })
    }
  }
})

test('official sender validation keeps the parameter and fixed reason without retaining the rejected address', () => {
  const rejected = 'private.customer@example.invalid'
  const diagnostics = extractProviderFailureDiagnostics({ data: { field_validation_errors: [{
    fieldname: 'sender', message: `The field 'sender' was expecting a valid RFC-822 formatted email field but found '${rejected}', Please correct your JSON payload and try again.`,
  }] } }, 400)
  assert.deepEqual(diagnostics, { httpStatus: 400, validationErrors: [{ field: 'sender', reason: 'invalid_email' }] })
  assert.equal(formatProviderValidationIssue(diagnostics.validationErrors[0]), '电子邮件地址格式无效。')
  assert.ok(!JSON.stringify(diagnostics).includes(rejected))
})

test('attachment, header and recipient paths normalize bounded indexes and retain safe expectation types', () => {
  const diagnostics = extractProviderFailureDiagnostics({ field_validation_errors: [
    { fieldname: 'attachments.001.fileblob', message: 'Expected valid base64 but found secret-file.pdf' },
    { fieldname: 'inlines[2].mimetype', message: "The field 'inlines[2].mimetype' was expecting a string but found private-name.png" },
    { fieldname: 'custom_headers[0].value', message: 'Expected a string, but found <secret>private content</secret>' },
    { fieldname: 'to.0', message: 'Must be a valid email address' },
    { fieldname: 'custom_headers.2.header', message: 'This field is required.' },
  ] }, 422)
  assert.deepEqual(diagnostics, { httpStatus: 422, validationErrors: [
    { field: 'attachments[1].fileblob', reason: 'invalid_base64' },
    { field: 'inlines[2].mimetype', reason: 'invalid_type', expectedType: 'string' },
    { field: 'custom_headers[0].value', reason: 'invalid_type', expectedType: 'string' },
    { field: 'to[0]', reason: 'invalid_email' },
    { field: 'custom_headers[2].header', reason: 'required' },
  ] })
})

test('recognized constraints become bounded numbers and fixed Chinese templates', () => {
  const diagnostics = extractProviderFailureDiagnostics({ data: { field_validation_errors: [
    { fieldname: 'subject', message: "The field 'subject' was expecting maximum length of 998 but found private contents" },
    { fieldname: 'attachments', message: 'must be at most 5 items' },
    { fieldname: 'to', message: 'minimum length of 1' },
    { fieldname: 'cc', message: 'must contain at least 2 items' },
    { fieldname: 'fastaccept', message: 'Expected a boolean but found the secret number 12345' },
    { fieldname: 'bcc', message: "Must be one of 'private@example.invalid'" },
  ] } }, 400)
  assert.deepEqual(diagnostics.validationErrors, [
    { field: 'subject', reason: 'too_long', limit: 998 },
    { field: 'attachments', reason: 'too_long', limit: 5 },
    { field: 'to', reason: 'too_short', limit: 1 },
    { field: 'cc', reason: 'too_short', limit: 2 },
    { field: 'fastaccept', reason: 'invalid_type', expectedType: 'boolean' },
    { field: 'bcc', reason: 'invalid_value' },
  ])
  assert.equal(formatProviderValidationIssue(diagnostics.validationErrors[0]), '超过允许的长度或数量（上限 998）。')
  assert.equal(formatProviderValidationIssue(diagnostics.validationErrors[2]), '未达到要求的长度或数量（下限 1）。')
  assert.equal(formatProviderValidationIssue(diagnostics.validationErrors[4]), '应为布尔值。')
  assert.equal(formatProviderValidationIssue(diagnostics.validationErrors[5]), '参数值不在允许范围内。')
})

test('official length-range failures compare bounded actual lengths without retaining provider text', () => {
  const diagnostics = extractProviderFailureDiagnostics({ data: { field_validation_errors: [
    { fieldname: 'custom_headers[2].value', message: "The field 'custom_headers[2].value' was expecting a value with a length between 1 and 255 but found a value with length of 632, Please correct your JSON payload and try again." },
    { fieldname: 'custom_headers.001.value', message: 'The field "custom_headers[1].value" was expecting a value with a length between 1 and 255 but found a value with length of 0' },
  ] } }, 400)
  assert.deepEqual(diagnostics.validationErrors, [
    { field: 'custom_headers[2].value', reason: 'too_long', limit: 255 },
    { field: 'custom_headers[1].value', reason: 'too_short', limit: 1 },
  ])
  assert.equal(formatProviderValidationIssue(diagnostics.validationErrors[0]), '超过允许的长度或数量（上限 255）。')
  assert.equal(formatProviderValidationIssue(diagnostics.validationErrors[1]), '未达到要求的长度或数量（下限 1）。')
  assert.ok(!JSON.stringify(diagnostics).includes('632'))
  assert.ok(!JSON.stringify(diagnostics).includes('Please correct your JSON payload'))
})

test('length ranges without a proven bounded violation keep a generic explanation', () => {
  const range = (minimum: string, maximum: string, actual: string) => `The field 'custom_headers[2].value' was expecting a value with a length between ${minimum} and ${maximum} but found a value with length of ${actual}`
  for (const message of [
    range('1', '255', '1'), range('1', '255', '255'), range('1', '255', '128'),
    range('255', '1', '632'), range('-1', '255', '632'), range('1', '255', '-1'),
    range('1', '255', '632.5'), range('1', '255', '6.32e2'),
    range('1', '1000000001', '632'), range('1000000001', '1000000001', '0'),
    range('1', '255', '1000000001'), range('1', '255', '9007199254740992'),
    "The field 'custom_headers[2].value' was expecting a value with a length between 1 and 255",
    "The field 'subject' was expecting a value with a length between 1 and 255 but found a value with length of 632",
    "The field 'custom_headers[2].value' was expecting a value with a length between 1 and 255 but found 'private@example.invalid, api_key=sk-secret, length of 632'",
    range('1', '255', '632') + ', private@example.invalid api_key=sk-secret private.pdf',
    range('1', '255', '632') + ', Please correct your JSON payload and try again. api_key=sk-secret',
    'Unrecognized format but found ' + range('1', '255', '632'),
  ]) {
    const diagnostics = extractProviderFailureDiagnostics({ field_validation_errors: { fieldname: 'custom_headers[2].value', message } }, 400)
    assert.deepEqual(diagnostics.validationErrors, [{ field: 'custom_headers[2].value', reason: 'invalid_format' }], message)
    assert.ok(!JSON.stringify(diagnostics).includes('private'))
    assert.ok(!JSON.stringify(diagnostics).includes('sk-secret'))
  }
})

test('unrecognized and overlong provider messages expose only safe fields with a generic explanation', () => {
  const privateMessages = [
    '<html>Secret body and filename private-quotation.pdf</html>',
    'api_key=sk-private-secret customer@example.invalid',
    'private ' + 'x'.repeat(4_096) + ' expected an array',
    5,
    null,
  ]
  for (const message of privateMessages) {
    const diagnostics = extractProviderFailureDiagnostics({ data: { field_validation_errors: { fieldname: 'html_body', message } } }, 400)
    assert.deepEqual(diagnostics.validationErrors, [{ field: 'html_body', reason: 'invalid_format' }])
    assert.equal(formatProviderValidationIssue(diagnostics.validationErrors[0]), '参数格式不符合邮件服务要求。')
  }
})

test('rejected actual values never become type or numeric expectations', () => {
  for (const message of [
    "Unrecognized format but found 'maximum length of 123456789'",
    "Unrecognized format instead found 'Expected a number'",
    "Unrecognized format received: 'Expected a string'",
    "The field 'sender' was expecting valid formatting but found 'a valid email address'",
  ]) {
    assert.deepEqual(extractProviderFailureDiagnostics({ field_validation_errors: { fieldname: 'sender', message } }, 400).validationErrors, [
      { field: 'sender', reason: 'invalid_format' },
    ])
  }
  for (const message of ['maximum length of 1000000001', 'maximum length of 1e6', 'maximum length of 12.5 MB', 'maximum length of -5']) {
    assert.deepEqual(extractProviderFailureDiagnostics({ field_validation_errors: { fieldname: 'subject', message } }, 400).validationErrors, [
      { field: 'subject', reason: 'too_long' },
    ])
  }
})

test('unknown and secret-bearing fields never survive the path allowlist', () => {
  const badFields = [
    'api_key', '__proto__', 'constructor', 'sender.private@example.invalid',
    'attachments[0].private-quotation.pdf', 'attachments[0].filename.private',
    'attachments[1000].filename', 'attachments[-1].filename', 'to[1].address',
    'custom_headers[0].authorization', 'html_body<script>', 'x'.repeat(1_000),
  ]
  const diagnostics = extractProviderFailureDiagnostics({ field_validation_errors: badFields.map(fieldname => ({ fieldname, message: 'Expected a string' })) }, 400)
  assert.deepEqual(diagnostics, { httpStatus: 400, validationErrors: [] })
  for (const field of badFields) assert.equal(providerFailureDiagnosticsSchema.safeParse({ httpStatus: 400, validationErrors: [{ field, reason: 'required' }] }).success, false)
})

test('extraction bounds work, deduplicates paths and tolerates malformed payloads', () => {
  const diagnostics = extractProviderFailureDiagnostics({ data: { field_validation_errors: [
    ...Array.from({ length: 12 }, (_, index) => ({ fieldname: `attachments[${index}].filename`, message: 'This field is required.' })),
  ] } }, 400)
  assert.equal(diagnostics.validationErrors.length, 10)
  const duplicate = extractProviderFailureDiagnostics({ data: { field_validation_errors: [
    { fieldname: 'to.0', message: 'Expected email address' },
    { fieldname: 'to[0]', message: 'Expected a string' },
    null,
  ] } }, 400)
  assert.equal(duplicate.validationErrors.length, 1)
  for (const raw of [null, [], 'private', { data: null }, { data: { field_validation_errors: 'private' } }]) {
    assert.deepEqual(extractProviderFailureDiagnostics(raw, 400), { httpStatus: 400, validationErrors: [] })
  }
})

test('stored diagnostics strip unexpected attributes and reject malformed or unbounded metadata', () => {
  const safe = readProviderFailureDiagnostics({ httpStatus: 400, rawError: 'secret', validationErrors: [
    { field: 'sender', reason: 'invalid_email', message: 'private@example.invalid', filename: 'private.pdf' },
  ] })
  assert.deepEqual(safe, { httpStatus: 400, validationErrors: [{ field: 'sender', reason: 'invalid_email' }] })
  for (const value of [
    null, {}, { httpStatus: 99, validationErrors: [] }, { httpStatus: 600, validationErrors: [] },
    { httpStatus: Infinity, validationErrors: [] }, { httpStatus: 400, validationErrors: Array(11).fill({ field: 'sender', reason: 'required' }) },
    { httpStatus: 400, validationErrors: [{ field: 'sender', reason: 'secret' }] },
    { httpStatus: 400, validationErrors: [{ field: 'subject', reason: 'too_long', limit: Infinity }] },
    { httpStatus: 400, validationErrors: [{ field: 'subject', reason: 'too_long', limit: -1 }] },
    { httpStatus: 400, validationErrors: [{ field: 'subject', reason: 'too_long', limit: 1_000_000_001 }] },
    { httpStatus: 400, validationErrors: [{ field: 'sender', reason: 'invalid_type', expectedType: 'private@example.invalid' }] },
    { httpStatus: 400, validationErrors: [{ field: 'to.0', reason: 'required' }] },
  ]) assert.equal(readProviderFailureDiagnostics(value), undefined)
})
