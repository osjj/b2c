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

  const dataPath = path.join(__dirname, 'solutions-data.json')
  const rawData = fs.readFileSync(dataPath, 'utf-8')
  const solutions: SolutionData[] = JSON.parse(rawData)

  let created = 0
  let updated = 0

  for (const solution of solutions) {
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

    await prisma.$transaction(async (tx) => {
      await tx.solution.update({
        where: { id: existing.id },
        data: {
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
        },
      })

      await tx.solutionSection.deleteMany({
        where: { solutionId: existing.id },
      })

      if (normalizedSections.length) {
        await tx.solutionSection.createMany({
          data: normalizedSections.map((section) => ({
            ...section,
            solutionId: existing.id,
          })),
        })
      }

      await tx.solutionProductLink.deleteMany({
        where: { solutionId: existing.id },
      })

      if (normalizedProductLinks.length) {
        await tx.solutionProductLink.createMany({
          data: normalizedProductLinks.map((link) => ({
            ...link,
            solutionId: existing.id,
          })),
        })
      }
    })

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

