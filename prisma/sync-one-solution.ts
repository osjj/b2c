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

function getArg(name: string) {
  return process.argv.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3)
}

function hasFlag(name: string) {
  return process.argv.includes(`--${name}`) || process.argv.includes(`--${name}=true`)
}

async function main() {
  const relativeFile = getArg('file')
  const targetSlug = getArg('slug')
  const shouldSyncActive = hasFlag('sync-active')

  if (!relativeFile) {
    throw new Error('Missing --file=prisma/<file>.json')
  }

  const filePath = path.resolve(process.cwd(), relativeFile)
  const raw = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '')
  const parsed: SolutionData[] = JSON.parse(raw)

  const solution = targetSlug
    ? parsed.find((item) => item.slug === targetSlug)
    : parsed[0]

  if (!solution) {
    throw new Error(`Solution not found in ${relativeFile}${targetSlug ? ` for slug ${targetSlug}` : ''}`)
  }

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
        sections: normalizedSections.length ? { create: normalizedSections } : undefined,
        productLinks: normalizedProductLinks.length ? { create: normalizedProductLinks } : undefined,
      },
    })
    console.log(`Created solution: ${solution.slug}`)
    return
  }

  const updateData: Record<string, unknown> = {
    slug: solution.slug,
    title: solution.title,
    excerpt: solution.excerpt,
    usageScenes: solution.usageScenes,
    sortOrder: solution.sortOrder,
    seoTitle: solution.seoTitle,
    seoDescription: solution.seoDescription,
    seoKeywords: solution.seoKeywords,
    coverImage: solution.coverImage,
  }
  if (shouldSyncActive) {
    updateData.isActive = solution.isActive
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

  console.log(`Updated solution: ${solution.slug}`)
}

main()
  .catch((error) => {
    console.error('Single solution sync failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
