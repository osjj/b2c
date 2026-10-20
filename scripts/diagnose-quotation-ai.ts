// Read-only runtime diagnostic. --probe explicitly permits one real layout operation.
// Run in the deployed checkout, under the same environment as the web process.
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'

import { loadEnvConfig } from '@next/env'
import { z } from 'zod'

import type { QuotationSnapshot } from '../src/lib/quotation/artifacts/snapshot'
import { quotationErrorCodeSchema } from '../src/lib/quotation/errors'
import { JORDAN_TEMPLATE_VERSION } from '../src/lib/quotation/jordan-layout'
import { applyQuotationAiLayout, quotationAiConfig, quotationLayoutInput } from '../src/lib/quotation/services/ai-layout'

const MAX_ERROR_BYTES = 16_384
const providerCodes = new Set(['model_not_found', 'invalid_api_key', 'insufficient_quota', 'rate_limit_exceeded', 'invalid_request_error', 'unsupported_parameter', 'context_length_exceeded', 'permission_denied', 'authentication_error', 'server_error', 'api_error'])
const networkCodes = new Set(['ECONNRESET', 'ECONNREFUSED', 'ENOTFOUND', 'EAI_AGAIN', 'ETIMEDOUT', 'UND_ERR_CONNECT_TIMEOUT', 'UND_ERR_SOCKET'])
const databaseCodes = new Set(['P1000', 'P1001', 'P1002', 'P1003', 'P1008', 'P1010', 'P1011', 'P1017', 'P2024'])
const diagnosticCodes = new Set(['INVALID_ARGUMENTS', 'ENV_LOAD_FAILED', 'DATABASE_NOT_CONFIGURED', 'QUOTATION_NOT_FOUND', 'INVALID_QUOTATION_INPUT', 'UNSUPPORTED_TEMPLATE', 'PROBE_NOT_VALIDATED'])

type Revision = {
  revisionNumber: number
  version: number
  state: string
  documentLanguage: QuotationSnapshot['language']
  templateVersion: string
  items: Array<{ nameZh: string | null; nameEn: string | null; specifications: unknown; _count: { assets: number } }>
  finalizationAttempts: Array<{ failureCode: string | null; failureSummary: string | null; createdAt: Date; updatedAt: Date }>
}
type Dependencies = {
  environment?: NodeJS.ProcessEnv
  fetch?: typeof fetch
  readRevision?: (number: string) => Promise<Revision | null>
  gitRevision?: () => string | null
  write?: (event: Record<string, unknown>) => void
}

export function parseDiagnosticArguments(args: string[]) {
  let quotation: string | undefined
  let probe = false
  for (const arg of args) {
    if (arg === '--probe' && !probe) probe = true
    else if (/^--quotation=QT-\d{6}-\d{5}$/.test(arg) && !quotation) quotation = arg.slice('--quotation='.length)
    else throw new Error('INVALID_ARGUMENTS')
  }
  return { quotation, probe }
}

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

// Never return provider-controlled strings, even if they resemble an error code.
export function classifyProviderFailure(input: unknown) {
  const root = record(input)
  const error = record(root.error)
  const fields = Object.keys(error).length ? error : root
  const code = typeof fields.code === 'string' && providerCodes.has(fields.code) ? fields.code : null
  const type = typeof fields.type === 'string' && providerCodes.has(fields.type) ? fields.type : null
  const message = typeof fields.message === 'string' ? fields.message.slice(0, MAX_ERROR_BYTES).toLowerCase() : ''
  let category = 'UNCLASSIFIED_HTTP_ERROR'
  if (code === 'model_not_found' || /unknown provider for model|model.{0,80}(not found|does not exist|not available)/.test(message)) category = 'MODEL_UNAVAILABLE'
  else if (code === 'invalid_api_key' || type === 'authentication_error' || /invalid api key|incorrect api key/.test(message)) category = 'AUTHENTICATION_REJECTED'
  else if (code === 'insufficient_quota' || /insufficient quota|insufficient balance|quota exceeded/.test(message)) category = 'QUOTA_REJECTED'
  else if (code === 'rate_limit_exceeded' || /rate limit/.test(message)) category = 'RATE_LIMITED'
  else if (code === 'unsupported_parameter' || /unsupported parameter|unknown parameter|unrecognized request argument/.test(message)) category = 'PARAMETER_REJECTED'
  else if (code === 'context_length_exceeded') category = 'CONTEXT_LIMIT'
  else if (code === 'permission_denied') category = 'PERMISSION_REJECTED'
  return { category, providerCode: code, providerType: type }
}

function safeError(error: unknown) {
  const value = record(error)
  const code = typeof value.code === 'string' ? value.code : ''
  const known = quotationErrorCodeSchema.safeParse(code)
  if (known.success) return known.data
  if (databaseCodes.has(code) || networkCodes.has(code)) return code
  const causeCode = record(value.cause).code
  if (typeof causeCode === 'string' && networkCodes.has(causeCode)) return causeCode
  if (value.name === 'AbortError' || value.name === 'TimeoutError') return 'REQUEST_ABORTED'
  if (error instanceof Error && diagnosticCodes.has(error.message)) return error.message
  return 'DIAGNOSTIC_FAILED'
}

async function readProviderFailure(response: Response) {
  if (!response.body) return { category: 'EMPTY_ERROR_BODY' }
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let bytes = 0
  try {
    for (;;) {
      const chunk = await reader.read()
      if (chunk.done) break
      bytes += chunk.value.length
      if (bytes > MAX_ERROR_BYTES) return { category: 'ERROR_BODY_LIMIT' }
      chunks.push(chunk.value)
    }
    try { return classifyProviderFailure(JSON.parse(Buffer.concat(chunks).toString('utf8'))) }
    catch { return { category: 'NON_JSON_ERROR_BODY' } }
  } catch { return { category: 'ERROR_BODY_UNREADABLE' } }
  finally {
    await reader.cancel().catch(() => undefined)
    reader.releaseLock()
  }
}

function safeConfigValue(value: string, key: string) {
  if (value.length > 300) return '[redacted]'
  let decoded = value
  // Inspect normalized text as well as URL spelling: a path can encode a key,
  // including mixed-case escapes or more than one layer of percent encoding.
  for (let depth = 0; depth <= 2; depth++) {
    if (decoded.includes(key) || /sk-[a-z0-9_-]{8,}|[\r\n\u0000-\u001f]/i.test(decoded)) return '[redacted]'
    if (!decoded.includes('%')) return value
    if (depth === 2) return '[redacted]'
    try { decoded = decodeURIComponent(decoded) }
    catch { return '[redacted]' }
  }
  return '[redacted]'
}

function gitRevision() {
  try {
    const revision = execFileSync('git', ['rev-parse', '--short=12', 'HEAD'], { encoding: 'utf8', timeout: 3000, stdio: ['ignore', 'pipe', 'ignore'] }).trim()
    return /^[a-f0-9]{7,40}$/.test(revision) ? revision : null
  } catch { return null }
}

async function readRevision(number: string): Promise<Revision | null> {
  if (!process.env.DATABASE_URL?.trim()) throw new Error('DATABASE_NOT_CONFIGURED')
  // A dedicated silent client prevents SDK error logs exposing connection details.
  const { PrismaClient } = await import('@prisma/client')
  const url = new URL(process.env.DATABASE_URL)
  for (const option of ['connect_timeout', 'socket_timeout', 'pool_timeout']) url.searchParams.set(option, '15')
  const prisma = new PrismaClient({ log: [], datasourceUrl: url.toString() })
  try {
    return await prisma.salesQuotationRevision.findFirst({
      where: { salesQuotation: { quotationNumber: number } }, orderBy: { revisionNumber: 'desc' },
      select: {
        revisionNumber: true, version: true, state: true, documentLanguage: true, templateVersion: true,
        items: { orderBy: { sortOrder: 'asc' }, take: 101, select: {
          nameZh: true, nameEn: true, specifications: true,
          _count: { select: { assets: { where: { assetType: 'PRODUCT_IMAGE' } } } },
        } },
        finalizationAttempts: { where: { status: 'FAILED' }, orderBy: { createdAt: 'desc' }, take: 5,
          select: { failureCode: true, failureSummary: true, createdAt: true, updatedAt: true } },
      },
    })
  } finally { await prisma.$disconnect() }
}

export function buildDiagnosticSnapshot(revision?: Revision): QuotationSnapshot {
  if (revision && revision.templateVersion !== JORDAN_TEMPLATE_VERSION) throw new Error('UNSUPPORTED_TEMPLATE')
  if (revision && (!revision.items.length || revision.items.length > 100)) throw new Error('INVALID_QUOTATION_INPUT')
  const items = revision?.items ?? [{ nameEn: 'Diagnostic sample product', nameZh: null, specifications: ['Material: Cotton', 'Sizes: M / L'], _count: { assets: 0 } }]
  return {
    schemaVersion: '1.0', templateVersion: JORDAN_TEMPLATE_VERSION, language: revision?.documentLanguage ?? 'ENGLISH',
    quotation: { number: 'DIAGNOSTIC', revision: 1, date: '2000-01-01', validUntil: null },
    customer: { companyName: 'DIAGNOSTIC', countryCode: null, email: null, phone: null, address: null, contact: null },
    money: { currency: 'USD', minorUnit: 2, roundingMode: 'HALF_UP', subtotal: '0', discount: '0', shipping: '0', otherFee: '0', taxRate: '0', tax: '0', roundingAdjustment: '0', total: '0' }, terms: {},
    items: items.map((item, index) => {
      if (!Number.isInteger(item._count.assets) || item._count.assets < 0 || item._count.assets > 8) throw new Error('INVALID_QUOTATION_INPUT')
      return {
        position: index + 1, nameZh: item.nameZh, nameEn: item.nameEn, model: null, sku: null,
        // Match canonical snapshot behavior for legacy malformed specification JSON.
        specifications: z.array(z.string()).catch([]).parse(item.specifications),
        unit: 'pcs', quantity: '0', unitPrice: '0', lineTotal: '0',
        // Only .length reaches the layout API. Never fetch image bytes or private keys.
        images: Array.from({ length: item._count.assets }, () => ({ contentType: 'image/png' as const, sha256: '0'.repeat(64), dataUrl: 'data:image/png;base64,' })),
      }
    }),
  }
}

export async function runQuotationAiDiagnostic(args: string[], dependencies: Dependencies = {}): Promise<number> {
  const write = dependencies.write ?? ((event) => process.stdout.write(`${JSON.stringify(event)}\n`))
  const environment = dependencies.environment ?? process.env
  let stage = 'arguments'
  try {
    const options = parseDiagnosticArguments(args)
    stage = 'configuration'
    const key = environment.OPENAI_API_KEY?.trim()
    write({ event: 'runtime', environmentScope: 'diagnostic-process', runningWebProcessVerified: false,
      gitRevision: (dependencies.gitRevision ?? gitRevision)(), keyPresent: Boolean(key),
      keyFingerprint: key ? createHash('sha256').update(key).digest('hex').slice(0, 12) : null,
      modelOverridePresent: Boolean(environment.QUOTATION_AI_MODEL?.trim()), probeRequested: options.probe })
    const config = quotationAiConfig(environment)
    const url = new URL(config.url)
    write({ event: 'configuration', endpointOrigin: safeConfigValue(url.origin, config.key), endpointPath: safeConfigValue(url.pathname, config.key), model: safeConfigValue(config.model, config.key) })
    let revision: Revision | undefined
    if (options.quotation) {
      stage = 'database-read'
      const result = await (dependencies.readRevision ?? readRevision)(options.quotation)
      if (!result) throw new Error('QUOTATION_NOT_FOUND')
      revision = result
    }
    stage = 'layout-input'
    const snapshot = buildDiagnosticSnapshot(revision)
    const payload = JSON.stringify({ items: quotationLayoutInput(snapshot) })
    if (Buffer.byteLength(payload) > 60_000) throw new Error('INVALID_QUOTATION_INPUT')
    write({ event: 'input', source: revision ? 'current-revision' : 'synthetic', itemCount: snapshot.items.length,
      imageCounts: snapshot.items.map((item) => item.images.length), layoutInputBytes: Buffer.byteLength(payload),
      ...(revision ? { revisionNumber: revision.revisionNumber, version: revision.version,
        state: ['DRAFT', 'READY', 'FINALIZING', 'FINALIZED', 'ISSUED', 'SUPERSEDED', 'VOID'].includes(revision.state) ? revision.state : 'UNKNOWN',
        failedAttempts: revision.finalizationAttempts.slice(0, 5).map((attempt) => ({
          createdAt: attempt.createdAt.toISOString(), updatedAt: attempt.updatedAt.toISOString(),
          code: quotationErrorCodeSchema.safeParse(attempt.failureCode).success ? attempt.failureCode : 'UNKNOWN',
          httpStatus: Number(attempt.failureSummary?.slice(0, 2000).match(/HTTP\s+([45]\d{2})\b/)?.[1]) || null,
        })) } : {}),
    })
    if (!options.probe) {
      write({ event: 'complete', success: true, probe: 'not-requested', aiRequests: 0, databaseWrites: 0, storageAccesses: 0 })
      return 0
    }
    stage = 'ai-probe'
    let requests = 0
    const started = Date.now()
    const diagnosticFetch: typeof fetch = async (input, init) => {
      const batch = ++requests
      const requestStarted = Date.now()
      try {
        const response = await (dependencies.fetch ?? fetch)(input, init)
        const failure = response.ok ? {} : await readProviderFailure(response)
        write({ event: 'http', batch, status: response.status, elapsedMs: Date.now() - requestStarted, ...failure })
        // The service discards HTTP-error bodies; we have already inspected a bounded copy.
        return response.ok ? response : new Response(null, { status: response.status })
      } catch (error) {
        write({ event: 'transport', batch, elapsedMs: Date.now() - requestStarted, code: safeError(error) })
        throw error
      }
    }
    const result = await applyQuotationAiLayout(snapshot, { environment, fetch: diagnosticFetch })
    if (!result.layout || requests === 0) throw new Error('PROBE_NOT_VALIDATED')
    write({ event: 'complete', success: true, probe: 'validated-layout', elapsedMs: Date.now() - started,
      aiRequests: requests, databaseWrites: 0, storageAccesses: 0, formalDocumentsGenerated: 0 })
    return 0
  } catch (error) {
    write({ event: 'failure', success: false, stage, code: safeError(error), databaseWrites: 0, storageAccesses: 0 })
    return 1
  }
}

async function main() {
  // Validate before loading environment files. Next's false flag selects production
  // precedence: process > .env.production.local > .env.local > .env.production > .env.
  parseDiagnosticArguments(process.argv.slice(2))
  if (process.env.NODE_ENV === 'test') throw new Error('ENV_LOAD_FAILED')
  let loadFailed = false
  loadEnvConfig(process.cwd(), false, { info() {}, error() { loadFailed = true } })
  if (loadFailed) throw new Error('ENV_LOAD_FAILED')
  process.exitCode = await runQuotationAiDiagnostic(process.argv.slice(2))
}

if (process.argv[1] && /(?:^|[/\\])diagnose-quotation-ai\.ts$/.test(process.argv[1])) {
  void main().catch((error: unknown) => {
    process.stderr.write(`${JSON.stringify({ event: 'failure', success: false, code: safeError(error) })}\n`)
    process.exitCode = 1
  })
}
