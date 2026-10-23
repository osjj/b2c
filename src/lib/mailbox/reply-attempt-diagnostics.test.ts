import assert from 'node:assert/strict'
import test from 'node:test'

import { addReplyAttemptDiagnostics, readReplyAttemptDiagnostics } from './reply-attempt-diagnostics'

test('adding safe diagnostics preserves the private prepared archive and does not mutate its source', () => {
  const archive = {
    message: { subject: 'Private subject', textBody: 'Private body', to: [{ address: 'buyer@example.test' }] },
    references: ['<parent@example.test>'], inReplyTo: ['<parent@example.test>'],
  }
  const diagnostics = {
    httpStatus: 400, validationErrors: [{ field: 'attachments[0].fileblob', reason: 'invalid_base64' }],
  }
  const saved = addReplyAttemptDiagnostics(archive, { ...diagnostics, rawError: 'do-not-store-provider-secret' })
  assert.deepEqual(saved, { ...archive, providerDiagnostics: diagnostics })
  assert.ok(!('providerDiagnostics' in archive))
  assert.deepEqual(readReplyAttemptDiagnostics(saved), diagnostics)
  assert.ok(!JSON.stringify(readReplyAttemptDiagnostics(saved)).includes('Private body'))
  assert.ok(!JSON.stringify(saved).includes('do-not-store-provider-secret'))
})

test('legacy or hostile stored diagnostics cannot become public details', () => {
  for (const response of [
    null, [], {}, { message: { subject: 'Old failure' } },
    { providerDiagnostics: { httpStatus: 400, validationErrors: [{ field: 'private-customer@example.test', reason: 'invalid_format' }] } },
    { providerDiagnostics: { httpStatus: 400, validationErrors: [{ field: 'sender', reason: 'private-api-key' }] } },
  ]) {
    assert.equal(readReplyAttemptDiagnostics(response), undefined)
  }
  const archive = { message: { textBody: 'Keep this private archive' } }
  assert.deepEqual(addReplyAttemptDiagnostics(archive, { rawError: 'private-api-key' }), archive)
})
