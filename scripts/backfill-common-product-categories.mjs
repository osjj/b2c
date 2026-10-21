// Explicitly reviewed category-only maintenance. Dry-run unless --apply is supplied.
import 'dotenv/config'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { Prisma, PrismaClient } from '@prisma/client'
import { z } from 'zod'

const args = process.argv.slice(2)
const apply = args.includes('--apply')
const manifestArg = args.indexOf('--manifest')
if (manifestArg < 0 || !args[manifestArg + 1]) throw new Error('Usage: node scripts/backfill-common-product-categories.mjs --manifest <reviewed-plan.json> [--apply]')
const manifestPath = resolve(args[manifestArg + 1])
const manifest = z.object({
  version: z.literal(1),
  entries: z.array(z.object({ id: z.string().cuid(), internalNumber: z.string(), name: z.string(), expectedUpdatedAt: z.string().datetime(), category: z.string().trim().min(1).max(80), evidence: z.string().min(1) })).min(1),
}).parse(JSON.parse(await readFile(manifestPath, 'utf8')))
assert.equal(new Set(manifest.entries.map(row => row.id)).size, manifest.entries.length, 'Duplicate product IDs in manifest')
if (process.env.QUOTATION_WORKBENCH_ENABLED === 'false' || (process.env.NODE_ENV === 'production' && process.env.QUOTATION_WORKBENCH_ENABLED !== 'true')) throw new Error('Quotation workbench disabled')
// One bounded connection avoids exhausting the application's remote DB pool.
const databaseUrl = new URL(process.env.DATABASE_URL ?? '')
databaseUrl.searchParams.set('connection_limit', '1')
databaseUrl.searchParams.set('connect_timeout', '15')
databaseUrl.searchParams.set('pool_timeout', '15')
const prisma = new PrismaClient({ log: [], datasourceUrl: databaseUrl.toString() })
const prefix = 'quotation.product-category.'
const ids = manifest.entries.map(row => row.id)
const actorId = 'codex:user-authorized:2026-10-21:common-product-categories'
const runId = new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-')
const digest = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex')
const productsWithoutTimestamp = (products) => products.map(product => { const fields = { ...product }; delete fields.updatedAt; return fields })
const output = dirname(manifestPath)
let phase = 'preflight'

async function readState(db) {
  // The maintenance client intentionally has one connection; avoid queuing reads
  // behind a relation query until the connection-pool acquisition timeout expires.
  // Compute stable comparison fingerprints in PostgreSQL rather than repeatedly
  // transferring large quotation specifications over the maintenance connection.
  // This hashes every protected column, with each relation ordered by its ID.
  const products = await db.$queryRaw(Prisma.sql`
    SELECT p.id, p.internal_number AS "internalNumber", p.name_en AS "nameEn",
      p.name_zh AS "nameZh", p.updated_at AS "updatedAt",
      md5(jsonb_build_object(
        'product', to_jsonb(p) - 'updated_at',
        'images', (SELECT COALESCE(jsonb_agg(to_jsonb(i) ORDER BY i.id), '[]'::jsonb) FROM quotation_product_images i WHERE i.quotation_product_id = p.id),
        'sources', (SELECT COALESCE(jsonb_agg(to_jsonb(s) ORDER BY s.id), '[]'::jsonb) FROM quotation_product_sources s WHERE s.quotation_product_id = p.id),
        'costRecords', (SELECT COALESCE(jsonb_agg(to_jsonb(c) ORDER BY c.id), '[]'::jsonb) FROM quotation_product_cost_records c WHERE c.quotation_product_id = p.id),
        'quotationItems', (SELECT COALESCE(jsonb_agg(to_jsonb(q) ORDER BY q.id), '[]'::jsonb) FROM sales_quotation_items q WHERE q.quotation_product_id = p.id)
      )::text) AS "protectedFingerprint"
    FROM quotation_products p WHERE p.id IN (${Prisma.join(ids)}) ORDER BY p.id ASC
  `)
  const defaults = await db.setting.findMany({ where: { key: { in: ids.map(id => `quotation.product-defaults.${id}`) } }, orderBy: { key: 'asc' } })
  const categories = await db.setting.findMany({ where: { key: { in: ids.map(id => `${prefix}${id}`) } }, orderBy: { key: 'asc' } })
  return { products, defaults, categories }
}

function pendingEntries(state) {
  const productById = new Map(state.products.map(product => [product.id, product]))
  const categoryByKey = new Map(state.categories.map(row => [row.key, row]))
  return manifest.entries.filter(entry => {
    const product = productById.get(entry.id)
    assert.ok(product, `Missing product ${entry.internalNumber}`)
    assert.equal(product.internalNumber, entry.internalNumber, `Product identity changed ${entry.internalNumber}`)
    assert.equal(product.nameEn || product.nameZh, entry.name, `Product name changed ${entry.internalNumber}`)
    const category = categoryByKey.get(`${prefix}${entry.id}`)
    if (category) {
      assert.equal(category.value?.category, entry.category, `Category already changed ${entry.internalNumber}`)
      return false
    }
    assert.equal(product.updatedAt.toISOString(), entry.expectedUpdatedAt, `Product changed since review ${entry.internalNumber}`)
    return true
  })
}

try {
  console.log(apply ? 'Reading reviewed products before category-only apply...' : 'Reading reviewed products for dry-run; no database writes...')
  const before = await readState(prisma)
  const pending = pendingEntries(before)
  const plan = { mode: apply ? 'apply' : 'dry-run', reviewed: manifest.entries.length, pending: pending.length, alreadyClassified: manifest.entries.length - pending.length, groups: Object.fromEntries([...new Set(manifest.entries.map(row => row.category))].map(category => [category, manifest.entries.filter(row => row.category === category).length])) }
  await mkdir(output, { recursive: true })
  await writeFile(`${output}/${runId}-before-${apply ? 'apply' : 'dry-run'}.json`, JSON.stringify(before, null, 2))
  if (!apply || !pending.length) {
    console.log(JSON.stringify(plan, null, 2))
  } else {
    phase = 'transaction'
    console.log(`Preflight passed for ${pending.length} products; starting guarded category transaction...`)
    const result = await prisma.$transaction(async (tx) => {
      const current = await readState(tx)
      assert.equal(digest(current), digest(before), 'Data changed after preflight; no categories written')
      const todo = pendingEntries(current)
      console.log('Transaction snapshot matched; writing categories and audit entries...')
      const timestamp = new Date()
      const guard = await tx.quotationProduct.updateMany({ where: { OR: todo.map(entry => ({ id: entry.id, updatedAt: new Date(entry.expectedUpdatedAt) })) }, data: { updatedAt: timestamp } })
      assert.equal(guard.count, todo.length, 'Product changed during apply; transaction rolled back')
      await tx.setting.createMany({ data: todo.map(entry => ({ key: `${prefix}${entry.id}`, value: { category: entry.category } })) })
      await tx.quotationAuditLog.createMany({ data: todo.map(entry => ({ entityType: 'QuotationProduct', entityId: entry.id, action: 'UPDATE', actorId, metadata: { operation: 'CATEGORY_BACKFILL', previousCategory: null, category: entry.category, evidence: entry.evidence, runId } })) })
      console.log('Category writes staged; verifying protected fields inside transaction...')
      const after = await readState(tx)
      assert.equal(digest(productsWithoutTimestamp(after.products)), digest(productsWithoutTimestamp(current.products)), 'Product fields, images, cost history or saved quote items changed')
      assert.equal(digest(after.defaults), digest(current.defaults), 'Price defaults changed')
      for (const entry of manifest.entries) assert.equal(after.categories.find(row => row.key === `${prefix}${entry.id}`)?.value?.category, entry.category)
      return { changed: todo.length, timestamp: timestamp.toISOString(), protectedHash: digest(productsWithoutTimestamp(after.products)), defaultsHash: digest(after.defaults) }
    }, { maxWait: 15000, timeout: 300000, isolationLevel: 'Serializable' })
    // Read back committed rows, rather than relying only on transaction return data.
    phase = 'post-commit-verification'
    console.log('Transaction committed; reading back categories and protected fields...')
    const after = await readState(prisma)
    assert.equal(pendingEntries(after).length, 0)
    assert.equal(digest(productsWithoutTimestamp(after.products)), result.protectedHash, 'Post-commit protected fields changed')
    assert.equal(digest(after.defaults), result.defaultsHash, 'Post-commit defaults changed')
    const auditCount = await prisma.quotationAuditLog.count({ where: { actorId, metadata: { path: ['runId'], equals: runId } } })
    assert.equal(auditCount, result.changed)
    const report = { ...plan, ...result, runId, actorId, snapshotFormat: 'protected-fingerprints-v1', auditCount, verifiedAfterCommit: true }
    phase = 'report'
    await writeFile(`${output}/${runId}-after.json`, JSON.stringify(after, null, 2))
    await writeFile(`${output}/applied-report.json`, JSON.stringify(report, null, 2))
    console.log(JSON.stringify(report, null, 2))
  }
} catch (error) {
  // Avoid printing Prisma connection details or full commercial records on failure.
  console.error(JSON.stringify({ failure: error instanceof assert.AssertionError ? error.message.split('\n')[0] : 'Category maintenance failed; inspect recorded snapshot before retrying', phase, type: error?.constructor?.name, code: error?.code }))
  process.exitCode = 1
} finally { await prisma.$disconnect() }
