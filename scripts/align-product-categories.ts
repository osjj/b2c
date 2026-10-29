import assert from 'node:assert/strict'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import 'dotenv/config'
import { Prisma, PrismaClient, type Category } from '@prisma/client'

const groups = [
  { slug: 'fall-protection', name: 'Fall Protection' },
  { slug: 'respiratory-protection', name: 'Respiratory Protection' },
  { slug: 'other-supplies', name: 'Other Supplies', description: 'Additional workplace supplies and accessories.' },
  { slug: 'body-protection', name: 'Body Protection' },
  { slug: 'hand-protection', name: 'Hand Protection' },
  { slug: 'hearing-protection', name: 'Hearing Protection', parent: 'head-protection' },
  { slug: 'head-protection', name: 'Head Protection' },
  { slug: 'firefighting-equipment', name: 'Firefighting Equipment', description: 'Equipment and accessories for firefighting applications.' },
  { slug: 'eye-protection', name: 'Eye & Face Protection' },
  { slug: 'rainwear', name: 'Rainwear & Rain Gear', parent: 'body-protection' },
  { slug: 'foot-protection', name: 'Foot Protection' },
  { slug: 'uncategorized', name: 'Uncategorized', description: 'Products awaiting assignment to a protection category.' },
] as const

const directory = fileURLToPath(new URL('../.trellis/tasks/10-29-products-category-alignment/evidence/', import.meta.url))
type CategoryChange = Pick<Category, 'name' | 'parentId' | 'sortOrder'>

export function planCategoryAlignment(categories: readonly Category[]) {
  const bySlug = new Map(categories.map((category) => [category.slug, category]))
  const updates: { before: Category; data: CategoryChange }[] = []
  const creates: Prisma.CategoryCreateManyInput[] = []

  groups.forEach((group, index) => {
    const existing = bySlug.get(group.slug)
    const parent = 'parent' in group ? bySlug.get(group.parent) : undefined
    if ('parent' in group) assert.ok(parent?.isActive, 'Expected parent is unavailable')
    const data = {
      name: group.name,
      parentId: parent?.id ?? null,
      sortOrder: group.slug === 'uncategorized' ? 9999 : index,
    }
    if (!existing) {
      assert.ok('description' in group, 'Expected existing category is missing')
      creates.push({ ...data, slug: group.slug, description: group.description, isActive: true })
      return
    }
    assert.ok(existing.isActive, 'Expected category is not active')
    assert.equal(existing.parentId, data.parentId, 'Unexpected category hierarchy')
    if (existing.name !== data.name || existing.sortOrder !== data.sortOrder) {
      updates.push({ before: existing, data })
    }
  })

  const face = bySlug.get('face-shields')
  const eye = bySlug.get('eye-protection')
  const head = bySlug.get('head-protection')
  assert.ok(face?.isActive && eye?.isActive && head?.isActive, 'Expected face category is unavailable')
  assert.ok(face.parentId === head.id || face.parentId === eye.id, 'Unexpected face category hierarchy')
  if (face.parentId !== eye.id) {
    updates.push({ before: face, data: { name: face.name, parentId: eye.id, sortOrder: face.sortOrder } })
  }
  return { updates, creates }
}

async function snapshot(prisma: PrismaClient | Prisma.TransactionClient) {
  const [categories, products] = await Promise.all([
    prisma.category.findMany({ orderBy: { id: 'asc' } }),
    prisma.product.findMany({
      select: { id: true, categoryId: true, isActive: true, updatedAt: true },
      orderBy: { id: 'asc' },
    }),
  ])
  return { categories, products }
}

let stage = 'arguments'
export async function main(args = process.argv.slice(2)) {
  assert.ok(args.length <= 1 && args.every((arg) => arg === '--inspect' || arg === '--apply'), 'Invalid arguments')
  const mode = args[0] ?? '--inspect'
  const prisma = new PrismaClient()
  try {
    stage = 'read-current'
    const before = await snapshot(prisma)
    const plan = planCategoryAlignment(before.categories)
    const summary = {
      mode,
      updates: plan.updates.map(({ before: category, data }) => ({ slug: category.slug, ...data })),
      creates: plan.creates.map(({ slug, name, sortOrder }) => ({ slug, name, sortOrder })),
      preservedProducts: before.products.length,
    }
    if (mode === '--inspect' || (!plan.updates.length && !plan.creates.length)) {
      process.stdout.write(`${JSON.stringify({ success: true, ...summary, databaseWrites: 0 }, null, 2)}\n`)
      return
    }

    stage = 'backup'
    await mkdir(directory, { recursive: true })
    const backupPath = resolve(directory, `categories-before-${Date.now()}.json`)
    const bytes = Buffer.from(`${JSON.stringify(before, null, 2)}\n`)
    await writeFile(backupPath, bytes, { flag: 'wx', mode: 0o600 })
    assert.ok((await readFile(backupPath)).equals(bytes), 'Backup verification failed')

    stage = 'transaction'
    await prisma.$transaction(async (tx) => {
      assert.deepEqual(await snapshot(tx), before, 'Concurrent catalog change')
      const writes = await Promise.all(plan.updates.map(({ before: category, data }) => tx.category.updateMany({
        where: { id: category.id, slug: category.slug, updatedAt: category.updatedAt, isActive: true, parentId: category.parentId },
        data,
      })))
      assert.ok(writes.every(({ count }) => count === 1), 'Category update guard failed')
      if (plan.creates.length) {
        const created = await tx.category.createMany({ data: plan.creates })
        assert.equal(created.count, plan.creates.length, 'Category creation failed')
      }

      const saved = await snapshot(tx)
      assert.deepEqual(saved.products, before.products, 'Product data changed')
      assert.equal(saved.categories.length, before.categories.length + plan.creates.length)
      const savedById = new Map(saved.categories.map((category) => [category.id, category]))
      const updatesById = new Map(plan.updates.map((update) => [update.before.id, update.data]))
      before.categories.forEach((category) => {
        const actual = savedById.get(category.id)
        assert.ok(actual, 'Existing category disappeared')
        const change = updatesById.get(category.id)
        assert.deepEqual(
          change ? { ...actual, updatedAt: category.updatedAt } : actual,
          { ...category, ...change },
          'Protected category fields changed',
        )
      })
      plan.creates.forEach((created) => {
        const actual = saved.categories.find((category) => category.slug === created.slug)
        assert.ok(actual, 'New category is missing')
        Object.entries(created).forEach(([key, value]) => assert.deepEqual(actual[key as keyof Category], value))
      })
      const remaining = planCategoryAlignment(saved.categories)
      assert.equal(remaining.updates.length + remaining.creates.length, 0, 'Alignment is incomplete')
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 30000 })

    process.stdout.write(`${JSON.stringify({ success: true, ...summary, databaseWrites: plan.updates.length + plan.creates.length, backupPath }, null, 2)}\n`)
  } finally {
    await prisma.$disconnect()
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(() => {
    process.stderr.write(`Category alignment failed at ${stage}; no sensitive diagnostics emitted.\n`)
    process.exitCode = 1
  })
}
