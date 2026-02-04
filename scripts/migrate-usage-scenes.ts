import { PrismaClient } from '@prisma/client'
import { mapIndustryToUsageScenes } from '../src/lib/usage-scenes'

const prisma = new PrismaClient()

const dedupe = (values: string[]) => {
  const seen = new Set<string>()
  const result: string[] = []
  for (const value of values) {
    if (!seen.has(value)) {
      seen.add(value)
      result.push(value)
    }
  }
  return result
}

const arraysEqual = (a: string[], b: string[]) =>
  a.length === b.length && a.every((value, index) => value === b[index])

const columnExists = async (tableName: string, columnName: string) => {
  const rows = await prisma.$queryRaw<{ count: number }[]>`
    SELECT COUNT(*)::int AS count
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = ${tableName}
      AND column_name = ${columnName}
  `
  return rows[0]?.count > 0
}

const migrateSolutions = async () => {
  const hasUsageScenes = await columnExists('solutions', 'usageScenes')
  if (!hasUsageScenes) {
    throw new Error('solutions.usageScenes column is missing. Run the migration that adds it first.')
  }

  const hasIndustry = await columnExists('solutions', 'industry')
  if (!hasIndustry) {
    console.log('ℹ️  solutions.industry column not found. Skipping solution migration.')
    return
  }

  const industryRows = await prisma.$queryRaw<{ id: string; industry: string | null }[]>`
    SELECT id, industry
    FROM solutions
  `
  const industryById = new Map(industryRows.map((row) => [row.id, row.industry]))

  const solutions = await prisma.solution.findMany({
    select: { id: true, usageScenes: true },
  })

  let updated = 0

  for (const solution of solutions) {
    const industry = industryById.get(solution.id) ?? ''
    const mappedScenes = mapIndustryToUsageScenes(industry)
    const merged = dedupe([...solution.usageScenes, ...mappedScenes])

    if (!arraysEqual(merged, solution.usageScenes)) {
      await prisma.solution.update({
        where: { id: solution.id },
        data: { usageScenes: merged },
      })
      updated++
    }
  }

  console.log(`✅ Solutions migrated: ${updated}`)
}

const migrateProducts = async () => {
  const products = await prisma.product.findMany({
    select: { id: true, usageScenes: true },
  })

  let updated = 0

  for (const product of products) {
    const nextScenes: string[] = []

    for (const scene of product.usageScenes) {
      const mapped = mapIndustryToUsageScenes(scene)
      if (mapped.length > 0) {
        nextScenes.push(...mapped)
      } else {
        nextScenes.push(scene)
      }
    }

    const deduped = dedupe(nextScenes)

    if (!arraysEqual(deduped, product.usageScenes)) {
      await prisma.product.update({
        where: { id: product.id },
        data: { usageScenes: deduped },
      })
      updated++
    }
  }

  console.log(`✅ Products migrated: ${updated}`)
}

const main = async () => {
  console.log('🚀 Migrating usage scenes...')
  await migrateSolutions()
  await migrateProducts()
  console.log('🎉 Usage scenes migration complete.')
}

main()
  .catch((error) => {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })