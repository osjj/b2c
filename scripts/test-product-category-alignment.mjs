// Exercise the real maintenance CLI with in-memory database/filesystem doubles.
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const sourceUrl = new URL('./align-product-categories.ts', import.meta.url)
const source = await readFile(sourceUrl, 'utf8')
const body = source.slice(source.indexOf('const groups ='), source.indexOf('if (process.argv[1]'))
assert.ok(body.startsWith('const groups =') && body.includes('export async function main('))
const compiled = ts.transpile(body.replaceAll('export ', '').replaceAll('import.meta.url', JSON.stringify(sourceUrl.href)), {
  target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.None,
})

const originals = [
  'fall-protection', 'respiratory-protection', 'body-protection', 'hand-protection',
  'hearing-protection', 'head-protection', 'eye-protection', 'rainwear', 'foot-protection',
  'face-shields', 'unrelated-hidden', 'uncategorized',
]
function fixture() {
  return {
    categories: originals.map((slug, index) => ({
      id: slug,
      slug,
      name: slug,
      description: `Original ${slug}`,
      image: `https://example.test/${slug}.webp`,
      parentId: slug === 'hearing-protection' || slug === 'face-shields'
        ? 'head-protection' : slug === 'rainwear' ? 'body-protection' : null,
      sortOrder: index,
      isActive: slug !== 'unrelated-hidden',
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-01-02T00:00:00Z'),
      metaTitle: `Original title ${slug}`,
      metaDescription: `Original description ${slug}`,
    })),
    products: [
      { id: 'active', categoryId: 'face-shields', isActive: true, updatedAt: new Date('2026-01-03T00:00:00Z') },
      { id: 'unassigned-hidden', categoryId: null, isActive: false, updatedAt: new Date('2026-01-03T00:00:00Z') },
    ],
  }
}

function harness(options = {}) {
  let state = fixture()
  if (options.assignedRetired) state.products[0].categoryId = 'uncategorized'
  const metrics = { clients: 0, disconnects: 0, transactions: 0, commits: 0, updates: 0, creates: 0, backups: 0 }
  const files = new Map()
  const output = []
  const sort = (rows) => structuredClone(rows).sort((a, b) => a.id.localeCompare(b.id))
  const reads = (current) => ({
    category: { findMany: async () => sort(current.categories) },
    product: { findMany: async () => sort(current.products) },
  })
  const prisma = {
    ...reads(state),
    $disconnect: async () => { metrics.disconnects++ },
    $transaction: async (callback, config) => {
      assert.equal(config.isolationLevel, 'Serializable')
      metrics.transactions++
      const pending = structuredClone(state)
      if (options.concurrent) pending.categories[0].description = 'Concurrent change'
      if (options.concurrentProduct) pending.products[0].isActive = false
      const tx = reads(pending)
      tx.category.updateMany = async ({ where, data }) => {
        metrics.updates++
        assert.deepEqual(Object.keys(where).sort(), ['id', 'isActive', 'parentId', 'slug', 'updatedAt'])
        const row = pending.categories.find(({ id }) => id === where.id)
        assert.ok(row)
        assert.equal(row.slug, where.slug)
        assert.equal(row.parentId, where.parentId)
        assert.equal(row.isActive, where.isActive)
        assert.equal(row.updatedAt.getTime(), where.updatedAt.getTime())
        Object.assign(row, data, { updatedAt: new Date('2026-10-29T01:00:00Z') })
        if (options.protectedDrift && metrics.updates === 1) row.description = 'Accidental change'
        return { count: options.guardFailure && metrics.updates === 1 ? 0 : 1 }
      }
      tx.category.createMany = async ({ data }) => {
        metrics.creates += data.length
        pending.categories.push(...data.map((row) => ({
          id: row.slug, description: null, image: null, parentId: null, sortOrder: 0, isActive: true,
          createdAt: new Date('2026-10-29T01:00:00Z'), updatedAt: new Date('2026-10-29T01:00:00Z'),
          metaTitle: null, metaDescription: null, ...row,
        })))
        if (options.productDrift) pending.products[0].categoryId = 'wrong-category'
        return { count: options.createFailure ? data.length - 1 : data.length }
      }
      await callback(tx)
      state.categories.splice(0, state.categories.length, ...pending.categories)
      state.products.splice(0, state.products.length, ...pending.products)
      metrics.commits++
    },
  }
  const scope = {
    assert,
    mkdir: async () => {},
    readFile: async (path) => options.backupFailure ? Buffer.from('bad readback') : files.get(path),
    writeFile: async (path, bytes, config) => {
      assert.equal(config.flag, 'wx')
      assert.equal(config.mode, 0o600)
      assert.ok(!files.has(path))
      files.set(path, Buffer.from(bytes))
      metrics.backups++
    },
    resolve,
    fileURLToPath,
    Prisma: { TransactionIsolationLevel: { Serializable: 'Serializable' } },
    PrismaClient: class { constructor() { metrics.clients++; return prisma } },
    process: { argv: [], stdout: { write: (value) => output.push(JSON.parse(value)) } },
  }
  const real = new Function(...Object.keys(scope), `${compiled}\nreturn { main, planCategoryAlignment };`)(...Object.values(scope))
  return { ...real, metrics, output, files, state: () => structuredClone(state) }
}

let checks = 0
async function check(name, run) { await run(); checks++; console.log(`PASS ${name}`) }

await check('inspect and default never write or open a transaction', async () => {
  const h = harness()
  const before = h.state()
  await h.main([])
  await h.main(['--inspect'])
  assert.equal(h.metrics.transactions + h.metrics.updates + h.metrics.creates + h.metrics.backups, 0)
  assert.deepEqual(h.state(), before)
  assert.equal(h.output[0].databaseWrites, 0)
  assert.equal(h.output[0].creates.length, 2)
})

await check('invalid arguments fail before a Prisma client is constructed', async () => {
  const h = harness()
  await assert.rejects(h.main(['--delete']), /Invalid arguments/)
  await assert.rejects(h.main(['--apply', '--inspect']), /Invalid arguments/)
  assert.equal(h.metrics.clients, 0)
})

await check('retirement rejects assigned products before any mutation or backup', async () => {
  const h = harness({ assignedRetired: true })
  const before = h.state()
  await assert.rejects(h.main(['--apply']), /Retired category still has assigned products/)
  assert.deepEqual(h.state(), before)
  assert.equal(h.metrics.transactions + h.metrics.updates + h.metrics.creates + h.metrics.backups, 0)
})

await check('apply aligns eleven groups, retires Uncategorized and keeps Other Supplies last', async () => {
  const h = harness()
  const before = h.state()
  const expected = h.planCategoryAlignment(before.categories)
  await h.main(['--apply'])
  const saved = h.state()
  assert.equal(h.metrics.commits, 1)
  assert.equal(h.metrics.creates, 2)
  assert.equal(h.metrics.updates, expected.updates.length)
  assert.deepEqual(saved.products, before.products)
  assert.equal(saved.categories.length, before.categories.length + 2)
  assert.deepEqual(saved.categories.find(({ slug }) => slug === 'unrelated-hidden'), before.categories.find(({ slug }) => slug === 'unrelated-hidden'))
  assert.equal(saved.categories.find(({ slug }) => slug === 'hearing-protection').parentId, 'head-protection')
  assert.equal(saved.categories.find(({ slug }) => slug === 'rainwear').parentId, 'body-protection')
  assert.equal(saved.categories.find(({ slug }) => slug === 'face-shields').parentId, 'eye-protection')
  assert.equal(saved.categories.find(({ slug }) => slug === 'uncategorized').isActive, false)
  assert.equal(saved.categories.find(({ slug }) => slug === 'other-supplies').sortOrder, 9999)
  assert.equal(h.metrics.backups, 1)
  assert.deepEqual(JSON.parse([...h.files.values()][0].toString()).products.map(({ id }) => id), ['active', 'unassigned-hidden'])
})

await check('an exact repeated apply performs zero further writes and creates no backup', async () => {
  const h = harness()
  await h.main(['--apply'])
  const saved = h.state()
  const writes = { ...h.metrics }
  await h.main(['--apply'])
  assert.equal(h.metrics.transactions, writes.transactions)
  assert.equal(h.metrics.updates, writes.updates)
  assert.equal(h.metrics.creates, writes.creates)
  assert.equal(h.metrics.backups, writes.backups)
  assert.deepEqual(h.state(), saved)
  assert.equal(h.output.at(-1).databaseWrites, 0)
})

for (const [option, expectedError] of [
  ['backupFailure', /Backup verification failed/],
  ['concurrent', /Concurrent catalog change/],
  ['concurrentProduct', /Concurrent catalog change/],
  ['guardFailure', /Category update guard failed/],
  ['protectedDrift', /Protected category fields changed/],
  ['createFailure', /Category creation failed/],
  ['productDrift', /Product data changed/],
]) {
  await check(`${option} rejects without committing any changes`, async () => {
    const h = harness({ [option]: true })
    const before = h.state()
    await assert.rejects(h.main(['--apply']), expectedError)
    assert.deepEqual(h.state(), before)
    assert.equal(h.metrics.commits, 0)
    assert.equal(h.metrics.disconnects, 1)
    if (option === 'backupFailure') assert.equal(h.metrics.transactions, 0)
    if (option.startsWith('concurrent')) assert.equal(h.metrics.updates + h.metrics.creates, 0)
  })
}

await check('missing or inactive required categories and unexpected hierarchy fail closed', async () => {
  const h = harness()
  const before = h.state().categories
  assert.throws(() => h.planCategoryAlignment(before.filter(({ slug }) => slug !== 'hand-protection')), /Expected existing category is missing/)
  assert.throws(() => h.planCategoryAlignment(before.map((row) => row.slug === 'head-protection' ? { ...row, isActive: false } : row)), /Expected parent is unavailable|Expected category is not active/)
  assert.throws(() => h.planCategoryAlignment(before.map((row) => row.slug === 'rainwear' ? { ...row, parentId: 'unexpected' } : row)), /Unexpected category hierarchy/)
  assert.throws(() => h.planCategoryAlignment(before.map((row) => row.slug === 'face-shields' ? { ...row, parentId: 'unexpected' } : row)), /Unexpected face category hierarchy/)
  assert.throws(() => h.planCategoryAlignment(before.map((row) => row.slug === 'unrelated-hidden' ? { ...row, parentId: 'uncategorized' } : row)), /Retired category still has children/)
})

console.log(`Category maintenance passed (${checks} checks); no actual database, filesystem writes or network access.`)
