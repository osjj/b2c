import { PrismaClient } from '@prisma/client'
import type { Prisma } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'
import { randomUUID } from 'crypto'

const prisma = new PrismaClient()

interface SolutionSectionData {
  key: string
  type: string
  title?: string | null
  enabled?: boolean
  sort?: number
  data: unknown
}

interface SolutionProductLinkData {
  blockKey: string
  productId: string
  sort?: number
}

interface SolutionData {
  slug: string
  title: string
  excerpt: string | null
  usageScenes: string[]
  coverImage: string | null
  isActive: boolean
  sortOrder: number
  seoTitle: string | null
  seoDescription: string | null
  seoKeywords: string | null
  sections: SolutionSectionData[]
  productLinks?: SolutionProductLinkData[]
}

const createId = () => {
  if (typeof randomUUID === 'function') {
    return randomUUID()
  }
  return `id_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

async function main() {
  console.log('Syncing solutions from JSON to database...')

  // Read all solutions-*.json files in prisma directory
  const prismaDir = __dirname
  const jsonFiles = fs.readdirSync(prismaDir).filter(
    (f) => f.startsWith('solutions-') && f.endsWith('.json') && !f.includes('_temp'),
  )

  if (jsonFiles.length === 0) {
    console.log('No solutions-*.json files found in prisma directory.')
    return
  }

  const solutions: SolutionData[] = []
  for (const file of jsonFiles) {
    const filePath = path.join(prismaDir, file)
    const rawData = fs.readFileSync(filePath, 'utf-8').replace(/^\uFEFF/, '')
    const parsed: SolutionData[] = JSON.parse(rawData)
    console.log(`  Loaded ${parsed.length} solutions from ${file}`)
    solutions.push(...parsed)
  }

  console.log(`Total: ${solutions.length} solutions from ${jsonFiles.length} files`)

  let created = 0
  let updated = 0

  for (let i = 0; i < solutions.length; i++) {
    const solution = solutions[i]
    console.log(`  [${i + 1}/${solutions.length}] ${solution.slug}...`)
    const normalizedSections = (solution.sections || []).map((section, index) => ({
      id: createId(),
      sort: typeof section.sort === 'number' ? section.sort : index,
      type: section.type,
      key: section.key || `section-${index + 1}`,
      title: section.title ?? null,
      enabled: section.enabled ?? true,
      data: (section.data ?? {}) as Prisma.InputJsonValue,
    }))

    const normalizedProductLinks = (solution.productLinks || []).map((link, index) => ({
      id: createId(),
      blockKey: link.blockKey,
      productId: link.productId,
      sort: typeof link.sort === 'number' ? link.sort : index,
    }))

    const existing = await prisma.solution.findUnique({
      where: { slug: solution.slug },
      select: { id: true },
    })

    if (!existing) {
      await prisma.solution.create({
        data: {
          id: createId(),
          slug: solution.slug,
          title: solution.title,
          excerpt: solution.excerpt,
          usageScenes: solution.usageScenes,
          coverImage: solution.coverImage,
          isActive: solution.isActive,
          sortOrder: solution.sortOrder,
          seoTitle: solution.seoTitle,
          seoDescription: solution.seoDescription,
          seoKeywords: solution.seoKeywords,
          sections: normalizedSections.length
            ? {
                create: normalizedSections,
              }
            : undefined,
          productLinks: normalizedProductLinks.length
            ? {
                create: normalizedProductLinks,
              }
            : undefined,
        },
      })
      created++
      continue
    }

    // Only overwrite coverImage if the JSON explicitly provides a non-null value,
    // so that images set via admin UI are preserved during sync.
    const updateData: Record<string, unknown> = {
      slug: solution.slug,
      title: solution.title,
      excerpt: solution.excerpt,
      usageScenes: solution.usageScenes,
      isActive: solution.isActive,
      sortOrder: solution.sortOrder,
      seoTitle: solution.seoTitle,
      seoDescription: solution.seoDescription,
      seoKeywords: solution.seoKeywords,
    }
    if (solution.coverImage) {
      updateData.coverImage = solution.coverImage
    }

    await prisma.solution.update({
      where: { id: existing.id },
      data: updateData,
    })

    await prisma.solutionSection.deleteMany({
      where: { solutionId: existing.id },
    })

    if (normalizedSections.length) {
      await prisma.solutionSection.createMany({
        data: normalizedSections.map((section) => ({
          ...section,
          solutionId: existing.id,
        })),
      })
    }

    await prisma.solutionProductLink.deleteMany({
      where: { solutionId: existing.id },
    })

    if (normalizedProductLinks.length) {
      await prisma.solutionProductLink.createMany({
        data: normalizedProductLinks.map((link) => ({
          ...link,
          solutionId: existing.id,
        })),
      })
    }

    updated++
  }

  console.log(`Sync complete: created=${created}, updated=${updated}`)
}

main()
  .catch((error) => {
    console.error('Sync failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

