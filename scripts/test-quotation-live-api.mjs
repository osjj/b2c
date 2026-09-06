// Explicit live AI probe: synthetic data, real finalizer, in-memory DB/storage.
// Never imports PrismaClient or uses R2 credentials. May incur one AI API charge.
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
if (!process.argv.includes('--live-api')) {
  process.stderr.write('Use --live-api to authorize one configured AI request with synthetic data.\n')
  process.exit(1)
}
require('@next/env').loadEnvConfig(process.cwd(), true, { info() {}, error() {} })
const environment = Object.fromEntries(['OPENAI_API_ENDPOINT', 'OPENAI_API_KEY', 'QUOTATION_AI_MODEL'].map((key) => [key, process.env[key]]))
if (!environment.OPENAI_API_KEY || !environment.OPENAI_API_ENDPOINT) throw new Error('Configured API endpoint/key missing')
const report = (value) => process.stdout.write(`${JSON.stringify(value)}\n`)
const liveFetch = async (url, init) => {
  const start = Date.now()
  report({ event: 'live-api-start', model: JSON.parse(init.body).model, syntheticOnly: true, database: 'mock', storage: 'memory' })
  let response
  try { response = await fetch(url, init) } catch (error) {
    const allowed = ['ENOTFOUND', 'ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT', 'UND_ERR_CONNECT_TIMEOUT']
    report({ event: 'transport-failure', elapsedMs: Date.now() - start, aborted: init.signal.aborted, code: allowed.includes(error.cause?.code) ? error.cause.code : 'other' })
    throw error
  }
  const text = await response.text()
  let payload
  try { payload = JSON.parse(text) } catch { /* Report a non-JSON response without exposing its body. */ }
  const message = String(payload?.error?.message || '').toLowerCase()
  const categories = ['quota', 'balance', 'credit', 'model', 'temperature', 'max_tokens', 'reasoning', 'authentication', 'api key', 'permission', 'rate limit', 'unsupported', 'unknown provider', 'not found', 'does not exist', 'not supported', 'invalid model'].filter((term) => message.includes(term))
  report({ event: 'live-api-response', status: response.status, elapsedMs: Date.now() - start,
    contentType: response.headers.get('content-type'), bytes: Buffer.byteLength(text), json: !!payload,
    choices: payload?.choices?.length, contentChars: payload?.choices?.[0]?.message?.content?.length,
    finishReason: ['stop', 'length', 'content_filter', 'tool_calls'].includes(payload?.choices?.[0]?.finish_reason) ? payload.choices[0].finish_reason : 'other', errorCategories: categories })
  return new Response(text, { status: response.status, headers: { 'Content-Type': response.headers.get('content-type') || 'text/plain' } })
}

// Reuse the existing isolation boundary and assertions without changing its default mocked mode.
let source = readFileSync(new URL('./test-quotation-ai-finalize.mjs', import.meta.url), 'utf8')
source = source.replace("import { build } from 'esbuild'", `import { build } from ${JSON.stringify(import.meta.resolve('esbuild'))}`)
source = source.replace('createRequire(import.meta.url)', `createRequire(${JSON.stringify(new URL('./test-quotation-ai-finalize.mjs', import.meta.url).href)})`)
source = source.replace("{ NODE_ENV: 'test', OPENAI_API_ENDPOINT: 'https://chat.glarivoglass.com', OPENAI_API_KEY: 'test-only' }, fixtureFetch",
  "{NODE_ENV:'test', ...globalThis.__quotationLiveProbe.environment}, async (url, init) => { if (failAi) return fixtureFetch('https://chat.glarivoglass.com/v1/chat/completions'); apiCalls++; return globalThis.__quotationLiveProbe.fetch(url, init) }")
source = source.replace("assert.equal(snapshot.layout.model, 'gpt-5.4')", "assert.equal(snapshot.layout.model, globalThis.__quotationLiveProbe.environment.QUOTATION_AI_MODEL?.trim() || 'gpt-5.4')")
source = source.replace('All external I/O mocked.', 'One actual configured AI call; DB/storage mocked. Failure branch uses mock API.')
globalThis.__quotationLiveProbe = { environment, fetch: liveFetch }
try {
  await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)
} catch (error) {
  // Only application-authored diagnostics are printed, never raw provider errors/stacks.
  const message = String(error.message)
  report({ event: 'flow-failure', message: message.startsWith('AI quotation layout:') ? message.replaceAll(environment.OPENAI_API_KEY, '[REDACTED]').slice(0, 500) : 'Local finalization test failed; inspect the safe response summary above.' })
  process.exitCode = 1
} finally {
  delete globalThis.__quotationLiveProbe
}
