import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { register } from 'tsx/cjs/api'

register()
const require = createRequire(import.meta.url)
const { runQuotationAiDiagnostic, classifyProviderFailure, parseDiagnosticArguments } = require('./diagnose-quotation-ai.ts')
const environment = { OPENAI_API_ENDPOINT: 'https://gateway.example.invalid', OPENAI_API_KEY: 'secret-key-never-print-me', QUOTATION_AI_MODEL: 'mock-model' }
const revision = {
  revisionNumber: 1, version: 8, state: 'READY', templateVersion: 'jordan-ai-v1', documentLanguage: 'ENGLISH',
  items: [{ nameEn: 'PRIVATE PRODUCT', nameZh: null, specifications: ['PRIVATE SPECIFICATION'], _count: { assets: 2 } }],
  finalizationAttempts: [{ failureCode: 'DOCUMENT_GENERATION_FAILED', failureSummary: 'SECRET BODY AI (HTTP 400)', createdAt: new Date('2026-10-18T00:00:00Z'), updatedAt: new Date('2026-10-18T00:01:00Z') }],
}
function dependencies(overrides = {}) {
  const events = []
  return { events, options: { environment, gitRevision: () => '1234567', write: (event) => events.push(event),
    fetch: async () => { throw new Error('UNEXPECTED_FETCH') }, readRevision: async () => { throw new Error('UNEXPECTED_DATABASE_READ') }, ...overrides } }
}
function assertPrivate(events) {
  const serialized = JSON.stringify(events)
  for (const secret of [environment.OPENAI_API_KEY, 'PRIVATE PRODUCT', 'PRIVATE SPECIFICATION', 'SECRET BODY', 'private-object-key', 'password=private-password']) assert.ok(!serialized.includes(secret), secret)
}
function responseFor(init) {
  const request = JSON.parse(init.body)
  const { items } = JSON.parse(request.messages[1].content)
  return Response.json({ choices: [{ message: { content: JSON.stringify({ items: items.map((item) => ({ position: item.position, imageColumns: item.imageCount > 1 ? 2 : 1, noteIndices: [] })) }) }, finish_reason: 'stop' }] })
}

test('metadata-only mode performs no AI request or DB read and never prints secrets', async () => {
  const { events, options } = dependencies()
  assert.equal(await runQuotationAiDiagnostic([], options), 0)
  assert.equal(events.at(-1).aiRequests, 0)
  assert.equal(events[0].runningWebProcessVerified, false)
  assert.match(events[0].keyFingerprint, /^[a-f0-9]{12}$/)
  assertPrivate(events)
})

test('runtime metadata redacts URL-encoded credentials and encoded sk-style keys', async () => {
  const key = 'test-key/with-slash'
  for (const path of [
    'test-key%2Fwith-slash', 'test-key%2fwith-slash',
    'test-key%252fwith-slash', 'test-key%25252Fwith-slash',
    '%73%6b%2Dabcdefghijklmno', '%2573%256B%252Dabcdefghijklmno',
    'malformed%2',
  ]) {
    const { events, options } = dependencies({ environment: { ...environment, OPENAI_API_KEY: key, OPENAI_API_ENDPOINT: `https://gateway.example.invalid/${path}` } })
    assert.equal(await runQuotationAiDiagnostic([], options), 0)
    assert.equal(events.find((event) => event.event === 'configuration').endpointPath, '[redacted]', path)
    assert.ok(!JSON.stringify(events).includes(key))
    assert.ok(!JSON.stringify(events).includes(path))
  }
  const safe = dependencies({ environment: { ...environment, OPENAI_API_ENDPOINT: 'https://gateway.example.invalid/safe%20route' } })
  assert.equal(await runQuotationAiDiagnostic([], safe.options), 0)
  assert.equal(safe.events.find((event) => event.event === 'configuration').endpointPath, '/safe%20route/v1/chat/completions')
})

test('explicit probe runs the real service with actual ordered names/specifications and only dummy image counts', async () => {
  let calls = 0
  let reads = 0
  const { events, options } = dependencies({
    readRevision: async (number) => { reads++; assert.equal(number, 'QT-202610-00011'); return revision },
    fetch: async (url, init) => {
      calls++
      assert.equal(url, 'https://gateway.example.invalid/v1/chat/completions')
      assert.equal(init.redirect, 'error')
      const request = JSON.parse(init.body)
      assert.equal(request.model, 'mock-model')
      assert.deepEqual(JSON.parse(request.messages[1].content).items, [{ position: 1, name: 'PRIVATE PRODUCT', specifications: ['PRIVATE SPECIFICATION'], imageCount: 2 }])
      assert.ok(!init.body.includes('data:image'))
      return responseFor(init)
    },
  })
  assert.equal(await runQuotationAiDiagnostic(['--quotation=QT-202610-00011', '--probe'], options), 0)
  assert.equal(calls, 1)
  assert.equal(reads, 1)
  assert.equal(events.at(-1).probe, 'validated-layout')
  assert.equal(events.find((event) => event.event === 'input').failedAttempts[0].httpStatus, 400)
  assertPrivate(events)
})

test('synthetic probe requires no database and invalid response is not reported as success', async () => {
  const success = dependencies({ fetch: async (_url, init) => responseFor(init) })
  assert.equal(await runQuotationAiDiagnostic(['--probe'], success.options), 0)
  const invalid = dependencies({ fetch: async () => Response.json({ choices: [{ message: { content: 'SECRET BODY invalid-json' } }] }) })
  assert.equal(await runQuotationAiDiagnostic(['--probe'], invalid.options), 1)
  assert.equal(invalid.events.at(-1).code, 'DOCUMENT_GENERATION_FAILED')
  assertPrivate(invalid.events)
})

test('400 unknown-provider response is classified without exposing provider text or retrying', async () => {
  let calls = 0
  const { events, options } = dependencies({ fetch: async () => {
    calls++
    return Response.json({ error: { code: 'model_not_found', type: 'invalid_request_error', message: 'unknown provider for model gpt-5.4 SECRET BODY secret-key-never-print-me private-object-key' } }, { status: 400 })
  } })
  assert.equal(await runQuotationAiDiagnostic(['--probe'], options), 1)
  assert.equal(calls, 1)
  assert.deepEqual(events.find((event) => event.event === 'http').category, 'MODEL_UNAVAILABLE')
  assert.equal(events.find((event) => event.event === 'http').providerCode, 'model_not_found')
  assertPrivate(events)
  assert.deepEqual(classifyProviderFailure({ error: { code: 'secret-key-never-print-me', type: 'private-object-key', message: 'unrecognized request argument max_tokens' } }), { category: 'PARAMETER_REJECTED', providerCode: null, providerType: null })
})

test('oversized/HTML error bodies, network causes and DB failures stay bounded and secret-free', async () => {
  for (const [body, expected] of [['SECRET BODY'.repeat(2000), 'ERROR_BODY_LIMIT'], ['<html>SECRET BODY</html>', 'NON_JSON_ERROR_BODY']]) {
    const { events, options } = dependencies({ fetch: async () => new Response(body, { status: 400 }) })
    assert.equal(await runQuotationAiDiagnostic(['--probe'], options), 1)
    assert.equal(events.find((event) => event.event === 'http').category, expected)
    assertPrivate(events)
  }
  const transport = dependencies({ fetch: async () => { throw new Error('SECRET BODY', { cause: { code: 'ECONNRESET', message: 'password=private-password' } }) } })
  assert.equal(await runQuotationAiDiagnostic(['--probe'], transport.options), 1)
  assert.equal(transport.events.find((event) => event.event === 'transport').code, 'ECONNRESET')
  assertPrivate(transport.events)
  const database = dependencies({ readRevision: async () => { throw Object.assign(new Error('password=private-password'), { code: 'P1001' }) } })
  assert.equal(await runQuotationAiDiagnostic(['--quotation=QT-202610-00011'], database.options), 1)
  assert.equal(database.events.at(-1).code, 'P1001')
  assertPrivate(database.events)
})

test('invalid CLI arguments, missing configuration and oversized input stop before AI', async () => {
  for (const args of [['--unknown=secret'], ['--probe', '--probe'], ['--quotation=../private-object-key'], ['--quotation=QT-202610-00011', '--quotation=QT-202610-00012']]) assert.throws(() => parseDiagnosticArguments(args), /INVALID_ARGUMENTS/)
  const missing = dependencies({ environment: {} })
  assert.equal(await runQuotationAiDiagnostic(['--probe'], missing.options), 1)
  assert.equal(missing.events.at(-1).code, 'FEATURE_DISABLED')
  const oversized = dependencies({ readRevision: async () => ({ ...revision, items: [{ ...revision.items[0], specifications: ['X'.repeat(60_001)] }] }) })
  assert.equal(await runQuotationAiDiagnostic(['--quotation=QT-202610-00011', '--probe'], oversized.options), 1)
  assert.equal(oversized.events.at(-1).code, 'INVALID_QUOTATION_INPUT')
})

test('CLI loads production Next env precedence while process overrides win without requests', () => {
  const project = dirname(dirname(fileURLToPath(import.meta.url)))
  const directory = mkdtempSync(join(tmpdir(), 'quotation-ai-env-test-'))
  try {
    writeFileSync(join(directory, '.env'), 'OPENAI_API_ENDPOINT=https://base.example.invalid\nOPENAI_API_KEY=base-secret-key\nQUOTATION_AI_MODEL=base-model\n')
    writeFileSync(join(directory, '.env.production'), 'QUOTATION_AI_MODEL=production-model\n')
    writeFileSync(join(directory, '.env.local'), 'QUOTATION_AI_MODEL=local-model\n')
    writeFileSync(join(directory, '.env.production.local'), 'QUOTATION_AI_MODEL=production-local-model\n')
    const env = { ...process.env, NODE_ENV: 'production' }
    for (const key of ['OPENAI_API_KEY', 'OPENAI_API_ENDPOINT', 'QUOTATION_AI_MODEL', '__NEXT_PROCESSED_ENV']) delete env[key]
    for (const override of [undefined, 'process-model']) {
      if (override) env.QUOTATION_AI_MODEL = override
      const result = spawnSync(process.execPath, [join(project, 'node_modules/tsx/dist/cli.mjs'), join(project, 'scripts/diagnose-quotation-ai.ts')], { cwd: directory, env, encoding: 'utf8', timeout: 20_000 })
      assert.equal(result.status, 0, result.stderr)
      const events = result.stdout.trim().split('\n').map((line) => JSON.parse(line))
      assert.equal(events.find((event) => event.event === 'configuration').model, override ?? 'production-local-model')
      assert.equal(events.at(-1).aiRequests, 0)
      assert.ok(!result.stdout.includes('base-secret-key'))
    }
  } finally { rmSync(directory, { recursive: true, force: true }) }
})
