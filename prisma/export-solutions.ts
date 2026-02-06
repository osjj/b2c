import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

type ExportSolutionItem = {
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
  sections: Array<{
    key: string
    type: string
    title: string | null
    enabled: boolean
    data: unknown
  }>
  productLinks: Array<{
    blockKey: string
    productId: string
    sort: number
  }>
}

async function main() {
  const outputPath = path.join(__dirname, 'solutions-data.json')

  console.log('Exporting solutions from database...')

  const solutions = await prisma.solution.findMany({
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    include: {
      sections: {
        orderBy: { sort: 'asc' },
      },
      productLinks: {
        orderBy: [{ blockKey: 'asc' }, { sort: 'asc' }],
      },
    },
  })

  const payload: ExportSolutionItem[] = solutions.map((solution) => ({
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
    sections: solution.sections.map((section) => ({
      key: section.key,
      type: section.type,
      title: section.title,
      enabled: section.enabled,
      data: section.data,
    })),
    productLinks: solution.productLinks.map((link) => ({
      blockKey: link.blockKey,
      productId: link.productId,
      sort: link.sort,
    })),
  }))

  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf-8')

  console.log(`Exported ${payload.length} solutions to ${outputPath}`)
}

main()
  .catch((error) => {
    console.error('Export failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

