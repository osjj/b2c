import assert from 'node:assert/strict'
import test from 'node:test'

import { providerDiagnosticCode, providerFailureReason, safeProviderDiagnosticCode } from './provider-diagnostics'
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
