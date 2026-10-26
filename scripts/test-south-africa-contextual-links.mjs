import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve, sep } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const require = createRequire(import.meta.url)
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const helperPath = resolve(root, 'src/lib/cases/south-africa-contextual-links.ts')
const cliPath = resolve(root, 'scripts/sync-south-africa-contextual-links.ts')
const sourceBytes = readFileSync(helperPath)
const clone = (value) => structuredClone(value)
const plain = (value) => JSON.parse(JSON.stringify(value))
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex')
const reorder = (value) => {
  if (value instanceof Date || value === null || typeof value !== 'object') return value
  if (Array.isArray(value)) return value.map(reorder)
  return Object.fromEntries(Object.entries(value).reverse().map(([key, item]) => [key, reorder(item)]))
}
const moduleCache = new Map()

// Run the actual pure TypeScript modules without any database or filesystem writes.
function pureModule(path) {
  if (moduleCache.has(path)) return moduleCache.get(path)
  const exports = {}
  moduleCache.set(path, exports)
  const compiled = ts.transpileModule(readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText
  new Function('require', 'exports', 'process', compiled)((name) => {
    if (name.startsWith('.')) return pureModule(resolve(dirname(path), `${name}.ts`))
    return require(name)
  }, exports, { env: {} })
  return exports
}

const helper = pureModule(helperPath)
const { toAdminCaseView } = pureModule(resolve(root, 'src/lib/cases/types.ts'))
const cliSource = readFileSync(cliPath, 'utf8').replace(
  "fileURLToPath(new URL('../', import.meta.url))",
  JSON.stringify(root),
)
const compiledCli = ts.transpileModule(cliSource, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText
const entryIndex = compiledCli.indexOf('main().catch(')
assert.ok(entryIndex > 0, 'Remove the real entrypoint before exercising the CLI with isolated doubles')
const isolatedCli = compiledCli.slice(0, entryIndex)

function sourceRecord() {
  return {
    id: helper.SOUTH_AFRICA_LINK_CASE_ID, slug: helper.SOUTH_AFRICA_LINK_CASE_SLUG,
    title: 'Original procurement case', summary: 'Original summary', country: 'South Africa', industry: 'Mining',
    cooperationDate: new Date('2026-08-02T00:00:00Z'), buyerProfile: 'Original buyer profile',
    coverImage: 'https://shop.laifappe.com/cases/original-cover.jpg', coverAlt: 'Original cover',
    procurement: helper.SOUTH_AFRICA_PROCUREMENT_LINKS.map(({ name, quantity, unit }) => ({ name, quantity, unit, note: 'Preserve original note' })),
    customization: 'Original customization', sections: [{ key: 'original-record', title: 'Original chapter', body: 'Original prose and evidence limits.' }],
    timeline: [{ date: '2026-09-04', label: 'Warehouse dispatch', description: 'No delivery claim' }],
    gallery: [{ url: 'https://shop.laifappe.com/cases/original-cover.jpg', alt: 'Original image', caption: 'Original caption', placement: 'section:original-record', kind: 'document' }],
    relatedLinks: [{ label: 'Existing checklist', href: '/blog/mining-ppe-checklist-by-task' }],
    status: 'PUBLISHED', publicationApproved: true, privateNotes: 'Private note must never enter CLI output',
    featured: false, sortOrder: 7, seoTitle: 'Original SEO title', seoDescription: 'Original SEO description', version: 11,
    publishedAt: new Date('2026-10-05T15:05:12.739Z'), createdAt: new Date('2026-10-05T00:00:00Z'), updatedAt: new Date('2026-10-06T03:20:15.195Z'),
  }
}

function withAppliedLinks(record) {
  const plan = helper.prepareSouthAfricaContextualLinks(toAdminCaseView(record))
  return { ...record, procurement: plan.procurement, relatedLinks: plan.relatedLinks, version: record.version + 1 }
}

function fixture(args = [], options = {}) {
  let row = sourceRecord()
  if (options.existing) row = withAppliedLinks(row)
  options.mutate?.(row)
  const before = clone(row)
  const evidenceDirectory = resolve(root, '.trellis/tasks/10-26-seo-links-and-content-diagnosis/evidence')
  const baselinePath = resolve(evidenceDirectory, 'case-links-reviewed-baseline.json')
  const baseline = { sourceSha256: digest(sourceBytes), record: plain(row) }
  if (options.sourceDrift) baseline.sourceSha256 = '0'.repeat(64)
  if (options.baselineDrift) baseline.record.summary = 'Concurrent editorial change'
  const files = new Map([[baselinePath, Buffer.from(JSON.stringify(baseline))]])
  if (options.missingBaseline) files.delete(baselinePath)
  const calls = { clients: 0, reads: 0, updates: 0, transactions: 0, commits: 0, fileWrites: 0, fetches: 0 }
  const events = []
  const client = (getRow, setRow) => ({
    findUniqueOrThrow: async ({ where }) => {
      calls.reads++
      assert.equal(where.id, helper.SOUTH_AFRICA_LINK_CASE_ID)
      return options.jsonbOrder ? reorder(clone(getRow())) : clone(getRow())
    },
    updateMany: async ({ where, data }) => {
      calls.updates++
      const current = getRow()
      assert.equal(where.id, current.id)
      assert.equal(where.slug, helper.SOUTH_AFRICA_LINK_CASE_SLUG)
      assert.equal(where.version, current.version)
      assert.equal(where.updatedAt.getTime(), current.updatedAt.getTime())
      assert.equal(where.status, 'PUBLISHED')
      assert.equal(where.publicationApproved, true)
      assert.equal(where.publishedAt.equals.getTime(), current.publishedAt.getTime())
      assert.ok(where.publishedAt.lte instanceof Date)
      assert.deepEqual(Object.keys(data).sort(), ['procurement', 'relatedLinks', 'version'])
      assert.deepEqual(data.version, { increment: 1 })
      if (options.guardFailure) return { count: 0 }
      const after = { ...current, procurement: clone(data.procurement), relatedLinks: clone(data.relatedLinks), version: current.version + 1, updatedAt: new Date('2026-10-26T03:00:00Z') }
      if (options.protectedDrift) after.summary = 'Unexpected editorial rewrite'
      setRow(after)
      return { count: 1 }
    },
  })
  class PrismaClient {
    constructor() { calls.clients++ }
    caseStudy = client(() => row, (value) => { row = value })
    async $transaction(callback, settings) {
      calls.transactions++
      assert.equal(settings.isolationLevel, 'Serializable')
      assert.equal(settings.maxWait, 10000)
      assert.equal(settings.timeout, 30000)
      let transactionRow = clone(row)
      if (options.concurrentChange) transactionRow.privateNotes = 'Concurrent private note'
      const result = await callback({ caseStudy: client(() => transactionRow, (value) => { transactionRow = value }) })
      row = transactionRow
      calls.commits++
      return result
    }
    async $disconnect() {}
  }
  const fs = {
    mkdir: async () => {},
    readFile: async (path, encoding) => {
      let bytes
      if (path === helperPath) bytes = options.sourceChangedBeforeTransaction && calls.fileWrites ? Buffer.from('source changed') : sourceBytes
      else bytes = options.backupMismatch && path.includes('case-links-backup-') ? Buffer.from('mismatched backup bytes') : files.get(path)
      if (!bytes) throw new Error('ENOENT')
      return encoding ? bytes.toString(encoding) : Buffer.from(bytes)
    },
    writeFile: async (path, bytes, settings) => {
      calls.fileWrites++
      assert.ok(path.startsWith(evidenceDirectory + sep))
      assert.equal(settings.flag, 'wx')
      assert.equal(settings.mode, 0o600)
      assert.ok(!files.has(path), 'No evidence overwrite')
      files.set(path, Buffer.from(bytes))
    },
  }
  const fetchStub = async (url, settings) => {
    calls.fetches++
    assert.equal(settings.redirect, 'manual')
    assert.ok(settings.signal instanceof AbortSignal)
    return { status: options.destinationStatus ?? 200, headers: new Headers(options.headerNoindex ? { 'x-robots-tag': 'noindex' } : {}), text: async () => `<link rel="canonical" href="${options.canonicalMismatch ? `${url}/other` : url}"><meta name="robots" content="${options.noindex ? 'noindex, follow' : 'index, follow'}">` }
  }
  const runtime = new Function('require', 'exports', 'process', 'fetch', `${isolatedCli}\nreturn { main };`)((name) => {
    if (name === 'dotenv/config') return {}
    if (name === '@prisma/client') return { PrismaClient, Prisma: { TransactionIsolationLevel: { Serializable: 'Serializable' } } }
    if (name === 'undici') return { EnvHttpProxyAgent: class {}, setGlobalDispatcher: () => {} }
    if (name === 'node:fs/promises') return fs
    if (name === '../src/lib/cases/south-africa-contextual-links') return helper
    if (name === '../src/lib/cases/types') return { toAdminCaseView }
    return require(name)
  }, {}, { argv: ['node', cliPath, ...args], stdout: { write: (value) => events.push(JSON.parse(value)) } }, fetchStub)
  return { runtime, calls, events, before, files, baselinePath, row: () => clone(row) }
}

test('pure plan adds six verified category paths and one resource while preserving case facts and media', () => {
  const raw = sourceRecord()
  const current = toAdminCaseView(raw)
  const before = clone(current)
  const plan = helper.prepareSouthAfricaContextualLinks(current)
  assert.equal(plan.action, 'apply')
  assert.equal(plan.procurement.length, 6)
  assert.equal(plan.destinations.length, 7)
  assert.deepEqual(plan.relatedLinks[0], current.relatedLinks[0])
  assert.deepEqual(plan.relatedLinks.at(-1), helper.SOUTH_AFRICA_MINING_RESOURCE)
  assert.deepEqual(plan.procurement.map((item) => {
    const original = { ...item }
    delete original.href
    return original
  }), current.procurement)
  assert.deepEqual(current, before, 'Pure planning may not mutate its source')
  const candidate = { ...current, procurement: plan.procurement, relatedLinks: plan.relatedLinks }
  assert.deepEqual({ ...candidate, procurement: current.procurement, relatedLinks: current.relatedLinks }, before)
  assert.equal(helper.prepareSouthAfricaContextualLinks(candidate).action, 'unchanged')
})

test('pure plan refuses nonpublic, wrong identity, changed quantities and partial prior release', () => {
  for (const mutate of [
    (row) => { row.status = 'DRAFT' },
    (row) => { row.publicationApproved = false },
    (row) => { row.publishedAt = new Date('2099-01-01T00:00:00Z') },
    (row) => { row.id = 'different-case' },
    (row) => { row.procurement[0].quantity = 501 },
    (row) => { row.procurement[0].href = helper.SOUTH_AFRICA_PROCUREMENT_LINKS[0].href },
    (row) => { row.relatedLinks.push(helper.SOUTH_AFRICA_MINING_RESOURCE) },
    (row) => { row.procurement[0].href = '/categories/hand-protection' },
  ]) {
    const row = sourceRecord()
    mutate(row)
    assert.throws(() => helper.prepareSouthAfricaContextualLinks(toAdminCaseView(row)))
  }
})

test('inspect is read-only; unknown or duplicate flags fail before database client creation', async () => {
  const inspected = fixture()
  await inspected.runtime.main()
  assert.equal(inspected.events[0].databaseWrites, 0)
  assert.equal(inspected.calls.updates, 0)
  assert.equal(inspected.calls.fileWrites, 0)
  assert.equal(inspected.calls.fetches, 0)
  for (const args of [['--force'], ['--apply', '--apply'], ['--inspect', '--apply']]) {
    const invalid = fixture(args)
    await assert.rejects(invalid.runtime.main())
    assert.equal(invalid.calls.clients, 0)
    assert.equal(invalid.calls.reads, 0)
    assert.equal(invalid.calls.updates, 0)
  }
})

test('apply checks public destinations, privately backs up and changes only links plus version/timestamp', async () => {
  const result = fixture(['--apply'], { jsonbOrder: true })
  await result.runtime.main()
  assert.equal(result.calls.fetches, 7)
  assert.equal(result.calls.fileWrites, 1)
  assert.equal(result.calls.transactions, 1)
  assert.equal(result.calls.updates, 1)
  assert.equal(result.calls.commits, 1)
  const saved = result.row()
  assert.equal(saved.version, 12)
  assert.deepEqual({ ...saved, procurement: result.before.procurement, relatedLinks: result.before.relatedLinks, version: result.before.version, updatedAt: result.before.updatedAt }, result.before)
  assert.ok(!JSON.stringify(result.events).includes(result.before.privateNotes))
})

test('prepare writes a complete private reviewed baseline and does not touch the database', async () => {
  const result = fixture(['--prepare'], { missingBaseline: true })
  await result.runtime.main()
  const baseline = JSON.parse(result.files.get(result.baselinePath).toString('utf8'))
  assert.equal(baseline.sourceSha256, digest(sourceBytes))
  assert.deepEqual(baseline.record, plain(result.before))
  assert.equal(result.calls.fileWrites, 1)
  assert.equal(result.calls.transactions, 0)
  assert.equal(result.calls.updates, 0)
  assert.equal(result.calls.fetches, 0)
})

test('an exact completed release is idempotent with no backup, destination fetch or transaction', async () => {
  const result = fixture(['--apply'], { existing: true })
  await result.runtime.main()
  assert.equal(result.events[0].action, 'unchanged')
  assert.equal(result.calls.fileWrites, 0)
  assert.equal(result.calls.fetches, 0)
  assert.equal(result.calls.updates, 0)
  assert.equal(result.calls.transactions, 0)
})

test('missing/drifted review or unavailable/noncanonical/noindex destination refuses before write', async () => {
  for (const options of [
    { missingBaseline: true }, { sourceDrift: true }, { baselineDrift: true },
    { destinationStatus: 404 }, { canonicalMismatch: true }, { noindex: true }, { headerNoindex: true },
  ]) {
    const result = fixture(['--apply'], options)
    await assert.rejects(result.runtime.main())
    assert.equal(result.calls.fileWrites, 0)
    assert.equal(result.calls.transactions, 0)
    assert.equal(result.calls.updates, 0)
    assert.deepEqual(result.row(), result.before)
  }
})

test('source mutation after backup, concurrent record edits and guard/protected-field failures never commit', async () => {
  for (const options of [{ backupMismatch: true }, { sourceChangedBeforeTransaction: true }, { concurrentChange: true }, { guardFailure: true }, { protectedDrift: true }]) {
    const result = fixture(['--apply'], options)
    await assert.rejects(result.runtime.main())
    assert.equal(result.calls.fileWrites, 1)
    assert.equal(result.calls.commits, 0)
    assert.deepEqual(result.row(), result.before)
    if (options.backupMismatch || options.sourceChangedBeforeTransaction || options.concurrentChange) assert.equal(result.calls.updates, 0)
  }
})
