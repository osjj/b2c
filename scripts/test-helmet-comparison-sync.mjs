import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { resolve, sep } from 'node:path'
import test from 'node:test'

import ts from 'typescript'

const require = createRequire(import.meta.url)
const script = await readFile(new URL('./sync-helmet-comparison.ts', import.meta.url), 'utf8')
const entry = script.indexOf('if (process.argv[1] && resolve(process.argv[1])')
assert.ok(entry > 0, 'Isolate exported real functions without invoking CLI')
const compiled = ts.transpileModule(script.slice(0, entry), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText
const slug = 'construction-safety-helmet-vs-hard-hat'
const evidence = resolve('.trellis/tasks/10-24-helmet-comparison-seo/evidence')
const sourcePaths = ['prisma/seed-blog.ts', `${slug}.md`, `prisma/blog-images.${slug}.generated.json`].map((path) => resolve(path))
const realSources = new Map(await Promise.all(sourcePaths.map(async (path) => [path, Buffer.from(await readFile(path))])))
const clone = (value) => structuredClone(value)
const reorder = (value) => {
  if (value instanceof Date || value === null || typeof value !== 'object') return value
  if (Array.isArray(value)) return value.map(reorder)
  return Object.fromEntries(Object.entries(value).reverse().map(([key, item]) => [key, reorder(item)]))
}

async function fixture(options = {}) {
  const files = new Map([...realSources].map(([path, bytes]) => [path, Buffer.from(bytes)]))
  const counters = { reads: 0, transactions: 0, updates: 0, commits: 0 }
  let rows = []
  const fs = {
    mkdir: async (path, settings) => { assert.equal(path, evidence); assert.equal(settings.mode, 0o700) },
    readFile: async (path, encoding) => {
      const bytes = files.get(path)
      if (!bytes) throw new Error('missing private fixture file')
      const output = options.corruptBackup && path.includes('apply-before-') ? Buffer.from('corrupt') : bytes
      return encoding ? output.toString(encoding) : Buffer.from(output)
    },
    writeFile: async (path, value, settings) => {
      assert.ok(path.startsWith(evidence + sep))
      assert.equal(settings.flag, 'wx')
      assert.equal(settings.mode, 0o600)
      assert.ok(!files.has(path), 'Existing snapshot must never be replaced')
      files.set(path, Buffer.from(value))
    },
  }
  const blogClient = (getRows, saveRows) => ({
    findMany: async ({ where }) => {
      counters.reads++
      assert.deepEqual(where, { slug })
      const selected = getRows().filter((row) => row.slug === where.slug)
      return options.jsonbOrder ? reorder(clone(selected)) : clone(selected)
    },
    updateMany: async ({ where, data }) => {
      counters.updates++
      assert.deepEqual(Object.keys(data).sort(), ['title', 'excerpt', 'seoTitle', 'seoDescription', 'seoKeywords', 'content'].sort())
      assert.equal(where.slug, slug)
      assert.equal(where.isPublished, true)
      const state = getRows()
      const row = state.find((item) => item.id === where.id && item.slug === where.slug && item.isPublished && item.updatedAt.toISOString() === where.updatedAt.toISOString() && item.publishedAt.toISOString() === where.publishedAt.toISOString())
      if (!row || options.guardFailure) return { count: 0 }
      Object.assign(row, clone(data), { updatedAt: new Date('2026-10-24T01:00:00Z') })
      if (options.protectedDrift) row.authorId = 'unexpected-author'
      if (options.readbackDrift) row.content.blocks.pop()
      saveRows(state)
      return { count: 1 }
    },
  })
  const client = {
    blogPost: blogClient(() => rows, (next) => { rows = next }),
    $transaction: async (callback, settings) => {
      counters.transactions++
      assert.equal(settings.isolationLevel, 'Serializable')
      let transactionRows = clone(rows)
      if (options.concurrentChange) transactionRows[0].excerpt = 'concurrent edit'
      if (options.transactionSourceDrift) files.set(sourcePaths[1], Buffer.from(files.get(sourcePaths[1]).toString() + '\nUnreviewed source change.\n'))
      const result = await callback({ blogPost: blogClient(() => transactionRows, (next) => { transactionRows = next }) })
      rows = transactionRows
      counters.commits++
      return result
    },
  }
  const exports = {}
  new Function('require', 'exports', compiled)((name) => {
    if (name === 'dotenv/config') return {}
    if (name === '@prisma/client') return { Prisma: { TransactionIsolationLevel: { Serializable: 'Serializable' } }, PrismaClient: class {} }
    if (name === 'node:fs/promises') return fs
    if (name === 'typescript' || name === 'zod' || name.startsWith('node:')) return require(name)
    throw new Error('unexpected import')
  }, exports)
  const source = await exports.loadSources()
  rows = [{
    id: 'cmoxsewqx0000umqcvslzm5oi', slug,
    title: 'Original title', excerpt: 'Original excerpt', seoTitle: 'Original SEO title', seoDescription: 'Original SEO description', seoKeywords: 'Original keywords',
    coverImage: source.manifest.hero, isPublished: true,
    publishedAt: new Date('2026-05-09T03:31:32.569Z'), createdAt: new Date('2026-05-09T03:31:32.569Z'), updatedAt: new Date('2026-07-12T14:40:16.155Z'), authorId: 'original-author',
    content: { ...clone(source.content), time: 123456, customEnvelope: { keep: true }, blocks: clone(source.content.blocks).map((block) => block.type === 'image' ? { ...block, tunes: { preserve: true }, data: { ...block.data, customImageField: 'keep' } } : block) },
  }, { id: 'unrelated-post', slug: 'unrelated', title: 'Never touched' }]
  const before = clone(rows)
  const inspect = () => exports.execute('inspect', client)
  const review = () => {
    const bytes = files.get(resolve(evidence, 'plan.json'))
    assert.ok(bytes)
    files.set(resolve(evidence, 'reviewed-plan.json'), Buffer.from(JSON.stringify({ reviewed: true, planHash: exports.digest(bytes) })))
  }
  const apply = () => exports.execute('apply', client)
  return { runtime: exports, files, source, counters, before, rows: () => clone(rows), mutate: (fn) => fn(rows), inspect, review, apply }
}

test('default/inspect and invalid flags have zero database writes', async () => {
  const f = await fixture()
  assert.equal(f.runtime.parseMode([]), 'inspect')
  assert.equal(f.runtime.parseMode(['--inspect']), 'inspect')
  for (const args of [['--force'], ['--apply', '--inspect'], ['--slug=other'], ['--apply', '--apply']]) assert.throws(() => f.runtime.parseMode(args), /INVALID_ARGUMENTS/)
  const plan = await f.inspect()
  assert.equal(plan.plannedWrites, 1)
  assert.equal(f.counters.transactions, 0)
  assert.equal(f.counters.updates, 0)
  assert.equal(f.files.size, realSources.size + 2)
  await assert.rejects(f.inspect(), /Existing snapshot/)
})

test('apply requires exact reviewed plan bytes and does not implicitly inspect', async () => {
  const f = await fixture()
  await assert.rejects(f.apply())
  assert.equal(f.files.size, realSources.size)
  await f.inspect()
  await assert.rejects(f.apply())
  f.review()
  const planPath = resolve(evidence, 'plan.json')
  f.files.set(planPath, Buffer.from(f.files.get(planPath).toString() + ' '))
  await assert.rejects(f.apply(), /PLAN_REVIEW/)
  assert.equal(f.counters.transactions, 0)
})

test('successful write reuses complete media, protects envelope/other records and accepts JSONB key order', async () => {
  const f = await fixture({ jsonbOrder: true })
  await f.inspect()
  f.review()
  assert.equal((await f.apply()).writes, 1)
  assert.equal(f.counters.commits, 1)
  assert.equal(f.counters.updates, 1)
  const saved = f.rows()
  assert.deepEqual(saved[1], f.before[1])
  assert.deepEqual(saved[0].content.blocks.filter((b) => b.type === 'image'), f.before[0].content.blocks.filter((b) => b.type === 'image'))
  assert.equal(saved[0].content.time, 123456)
  assert.deepEqual(saved[0].content.customEnvelope, { keep: true })
  assert.equal(saved[0].publishedAt.toISOString(), f.before[0].publishedAt.toISOString())
  assert.equal(saved[0].coverImage, f.before[0].coverImage)
  assert.equal((await f.apply()).writes, 0)
  assert.equal(f.counters.updates, 1)
  assert.equal(f.counters.transactions, 1)
})

test('already-equal content has deterministic IDs and zero writes', async () => {
  const f = await fixture()
  const row = await f.runtime.snapshot({ blogPost: { findMany: async () => f.rows().slice(0, 1) } })
  const desired = f.runtime.desiredFor(row, f.source)
  const repeatedSource = await f.runtime.loadSources()
  assert.ok(f.runtime.equal(desired, f.runtime.desiredFor(row, repeatedSource)))
  f.mutate((rows) => Object.assign(rows[0], clone(desired)))
  assert.equal((await f.inspect()).plannedWrites, 0)
  f.review()
  assert.equal((await f.apply()).writes, 0)
  assert.equal(f.counters.transactions, 0)
})

test('reviewed Markdown, config/parser and manifest source drift fail before transaction', async () => {
  for (const index of [0, 1, 2]) {
    const f = await fixture()
    await f.inspect()
    f.review()
    if (index === 0) f.files.set(sourcePaths[0], Buffer.from(f.files.get(sourcePaths[0]).toString().replace('function makeId(): string {', 'function makeId(): string {\n  // unreviewed parser change')))
    if (index === 1) f.files.set(sourcePaths[1], Buffer.from(f.files.get(sourcePaths[1]).toString() + '\nUnreviewed text.\n'))
    if (index === 2) f.files.set(sourcePaths[2], Buffer.from(f.files.get(sourcePaths[2]).toString() + ' '))
    await assert.rejects(f.apply(), /SOURCE_DRIFT/)
    assert.equal(f.counters.transactions, 0)
    assert.equal(f.counters.updates, 0)
  }
})

test('identity, publication, metadata and media drift never overwrite current state', async () => {
  const mutations = [
    (row) => { row.id = 'different-id' },
    (row) => { row.isPublished = false },
    (row) => { row.publishedAt = new Date('2026-06-01T00:00:00Z') },
    (row) => { row.coverImage = 'https://example.invalid/replaced.webp' },
    (row) => { row.excerpt = 'new manual edit' },
    (row) => { row.updatedAt = new Date('2026-10-24T00:00:00Z') },
    (row) => { row.content.blocks.find((block) => block.type === 'image').data.caption = 'new image caption' },
  ]
  for (const mutate of mutations) {
    const f = await fixture()
    await f.inspect()
    f.review()
    f.mutate((rows) => mutate(rows[0]))
    const changed = f.rows()
    await assert.rejects(f.apply())
    assert.equal(f.counters.transactions, 0)
    assert.equal(f.counters.updates, 0)
    assert.deepEqual(f.rows(), changed)
  }
})

test('missing/duplicate targets and malformed media fail inspect without plan', async () => {
  for (const mutate of [
    (rows) => rows.splice(0, 1),
    (rows) => rows.push(clone(rows[0])),
    (rows) => { rows[0].content.blocks.find((block) => block.type === 'image').data.file.url = 'different.webp' },
    (rows) => { rows[0].content.blocks.find((block) => block.type === 'image').id = rows[0].content.blocks[0].id },
  ]) {
    const f = await fixture()
    f.mutate(mutate)
    await assert.rejects(f.inspect())
    assert.equal(f.files.size, realSources.size)
  }
})

test('transaction concurrent/source drift, write guard and readback failures roll back', async () => {
  for (const options of [{ concurrentChange: true }, { transactionSourceDrift: true }, { guardFailure: true }, { protectedDrift: true }, { readbackDrift: true }, { corruptBackup: true }]) {
    const f = await fixture(options)
    await f.inspect()
    f.review()
    await assert.rejects(f.apply())
    assert.equal(f.counters.commits, 0)
    assert.deepEqual(f.rows(), f.before)
    if (options.concurrentChange || options.transactionSourceDrift || options.corruptBackup) assert.equal(f.counters.updates, 0)
    if (options.corruptBackup) assert.equal(f.counters.transactions, 0)
  }
})
