import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { resolve, sep } from 'node:path'
import test from 'node:test'
import ts from 'typescript'

const require = createRequire(import.meta.url)
const script = await readFile(new URL('./sync-sample-approval-links.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(script, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText
const isolated = compiled.slice(0, compiled.indexOf('main().catch('))
assert.ok(isolated.length < compiled.length, 'CLI entry must be removed before isolated tests')
const markdown = new Map(await Promise.all(['bulk-construction-ppe-procurement', 'contractor-ppe-supplier-bulk-checklist'].map(async (slug) => [resolve(`${slug}.md`), await readFile(resolve(`${slug}.md`), 'utf8')])))
const clone = (value) => structuredClone(value)
const reorder = (value) => {
  if (value instanceof Date || value === null || typeof value !== 'object') return value
  if (Array.isArray(value)) return value.map(reorder)
  return Object.fromEntries(Object.entries(value).reverse().map(([key, item]) => [key, reorder(item)]))
}

async function fixture(args = [], options = {}) {
  let rows = []
  const backups = new Map()
  const events = []
  const calls = { reads: 0, updates: 0, transactions: 0, commits: 0 }
  const client = (getRows, setRows) => ({
    findMany: async () => { calls.reads++; return options.jsonbOrder ? reorder(clone(getRows())) : clone(getRows()) },
    updateMany: async ({ where, data }) => {
      calls.updates++
      assert.equal(Object.keys(data).join(','), 'content')
      assert.equal(where.isPublished, true)
      const state = getRows()
      const row = state.find((item) => item.id === where.id && item.slug === where.slug && item.isPublished && item.updatedAt.getTime() === where.updatedAt.getTime())
      if (!row || options.guardFailure) return { count: 0 }
      row.content = clone(data.content)
      row.updatedAt = new Date('2026-10-20T00:00:00Z')
      if (options.protectedDrift) row.title = 'unexpected title change'
      setRows(state)
      return { count: 1 }
    },
  })
  class PrismaClient {
    blogPost = client(() => rows, (value) => { rows = value })
    async $transaction(callback, settings) {
      calls.transactions++
      assert.equal(settings.isolationLevel, 'Serializable')
      let transactionRows = clone(rows)
      if (options.concurrentChange) transactionRows[0].excerpt = 'concurrent editor change'
      const result = await callback({ blogPost: client(() => transactionRows, (value) => { transactionRows = value }) })
      rows = transactionRows
      calls.commits++
      return result
    }
    async $disconnect() {}
  }
  const fs = {
    mkdir: async () => {},
    readFile: async (path) => {
      if (markdown.has(path)) return markdown.get(path)
      if (backups.has(path)) return Buffer.from(backups.get(path))
      throw new Error('unexpected filesystem read')
    },
    writeFile: async (path, bytes, settings) => {
      assert.equal(settings.flag, 'wx')
      assert.ok(path.startsWith(resolve('.trellis/tasks/10-19-seo-mobile-sample-approval/evidence') + sep))
      assert.ok(!backups.has(path))
      backups.set(path, bytes)
    },
  }
  const processStub = { argv: ['node', 'sync-sample-approval-links.ts', ...args], stdout: { write: (value) => events.push(JSON.parse(value)) } }
  const runtime = new Function('require', 'exports', 'process', `${isolated}\nreturn { main, sources, plans, snapshot, SOURCES, TARGET };`)((name) => {
    if (name === 'dotenv/config') return {}
    if (name === '@prisma/client') return { Prisma: { TransactionIsolationLevel: { Serializable: 'Serializable' } }, PrismaClient }
    if (name === 'node:fs/promises') return fs
    if (name === 'zod' || name.startsWith('node:')) return require(name)
    throw new Error(`Unexpected import ${name}`)
  }, {}, processStub)
  const definitions = await runtime.sources()
  rows = definitions.map((source, index) => ({
    id: source.id, slug: source.slug, title: `Original title ${index}`, seoTitle: 'Original metadata', excerpt: 'Original excerpt',
    isPublished: true, publishedAt: new Date('2026-09-20T00:00:00Z'), updatedAt: new Date('2026-10-19T00:00:00Z'),
    coverImage: 'https://example.invalid/original-cover.webp',
    content: { version: '2.31', custom: { preserved: true }, blocks: [
      { id: `anchor${index}`, type: 'paragraph', data: { text: source.anchor }, tunes: { unchanged: true } },
      ...(index < (options.existing ?? 0) ? [{ id: source.blockId, type: 'paragraph', data: { text: source.html } }] : []),
      { id: `image${index}`, type: 'image', data: { file: { url: 'https://example.invalid/original-image.webp' }, caption: 'Original caption' } },
    ] },
  }))
  rows.push({ id: 'new-target', slug: runtime.TARGET, isPublished: options.targetPublic !== false, publishedAt: new Date('2026-10-19T00:00:00Z'), updatedAt: new Date('2026-10-19T00:00:00Z'), content: { blocks: [] } })
  options.mutate?.(rows, definitions)
  const before = clone(rows)
  return { runtime, before, definitions, calls, backups, events, rows: () => clone(rows) }
}

test('inspect and invalid flags make no backups, transactions or database writes', async () => {
  const inspected = await fixture([], { targetPublic: false })
  await inspected.runtime.main()
  assert.equal(inspected.events[0].plannedWrites, 2)
  assert.equal(inspected.events[0].targetPublic, false)
  assert.equal(inspected.calls.transactions, 0)
  assert.equal(inspected.calls.updates, 0)
  assert.equal(inspected.backups.size, 0)
  const invalid = await fixture(['--force'])
  await assert.rejects(invalid.runtime.main(), /Unsupported arguments/)
  assert.equal(invalid.calls.reads, 0)
})

test('apply backs up, preserves all old blocks and fields, and accepts JSONB key order', async () => {
  const result = await fixture(['--apply'], { jsonbOrder: true })
  await result.runtime.main()
  assert.equal(result.calls.commits, 1)
  assert.equal(result.calls.updates, 2)
  assert.equal(result.backups.size, 1)
  const saved = result.rows()
  for (let index = 0; index < 2; index++) {
    const row = saved[index]
    const before = result.before[index]
    const inserted = row.content.blocks[1]
    assert.equal(inserted.data.text, result.definitions[index].html)
    assert.deepEqual({ ...row, content: before.content, updatedAt: before.updatedAt }, before)
    assert.deepEqual(row.content.blocks.filter((block) => block.id !== inserted.id), before.content.blocks)
  }
  assert.deepEqual(saved[2], result.before[2])
})

test('both matching paragraphs are idempotent and partial prior updates fail closed', async () => {
  const complete = await fixture(['--apply'], { existing: 2 })
  await complete.runtime.main()
  assert.equal(complete.events[0].plannedWrites, 0)
  assert.equal(complete.calls.transactions, 0)
  assert.equal(complete.backups.size, 0)
  const partial = await fixture(['--apply'], { existing: 1 })
  await assert.rejects(partial.runtime.main(), /Partial prior update/)
  assert.equal(partial.calls.transactions, 0)
})

test('nonpublic target cannot be linked by apply', async () => {
  const result = await fixture(['--apply'], { targetPublic: false })
  await assert.rejects(result.runtime.main(), /Target article must be public/)
  assert.equal(result.calls.transactions, 0)
  assert.equal(result.backups.size, 0)
})

test('missing or duplicate anchors, moved existing links and block ID collisions fail', async () => {
  for (const options of [
    { mutate: (rows) => { rows[0].content.blocks[0].data.text = 'anchor drift' } },
    { mutate: (rows) => { rows[0].content.blocks.push(clone(rows[0].content.blocks[0])) } },
    { mutate: (rows, definitions) => { rows[0].content.blocks[1].id = definitions[0].blockId } },
    { existing: 2, mutate: (rows) => { rows[0].content.blocks.push(rows[0].content.blocks.splice(1, 1)[0]) } },
  ]) {
    const result = await fixture(['--apply'], options)
    await assert.rejects(result.runtime.main())
    assert.equal(result.calls.updates, 0)
    assert.equal(result.backups.size, 0)
  }
})

test('concurrent edits abort before updates and guard/protected-field failures roll back', async () => {
  for (const options of [{ concurrentChange: true }, { guardFailure: true }, { protectedDrift: true }]) {
    const result = await fixture(['--apply'], options)
    await assert.rejects(result.runtime.main())
    assert.equal(result.calls.commits, 0)
    assert.deepEqual(result.rows(), result.before)
    assert.equal(result.backups.size, 1)
    if (options.concurrentChange) assert.equal(result.calls.updates, 0)
  }
})
