'use client'
import { PrismaClient } from '@prisma/client'
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
  data: any
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
}

const createId = () => {
  if (typeof randomUUID === 'function') {
    return randomUUID()
  }
  return `id_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

async function main() {
  console.log('🚀 开始导入 Solutions 数据...\n')

  const dataPath = path.join(__dirname, 'solutions-data.json')
  const rawData = fs.readFileSync(dataPath, 'utf-8')
  const solutions: SolutionData[] = JSON.parse(rawData)

  console.log(`📦 找到 ${solutions.length} 条数据\n`)

  let created = 0
  let skipped = 0
  let errors = 0

  for (const solution of solutions) {
    try {
      const existing = await prisma.solution.findUnique({
        where: { slug: solution.slug },
      })

      if (existing) {
        console.log(`⏭️  跳过: ${solution.title} (${solution.slug})`)
        skipped++
        continue
      }

      const normalizedSections = (solution.sections || []).map((section, index) => ({
        id: createId(),
        sort: typeof section.sort === 'number' ? section.sort : index,
        type: section.type,
        key: section.key || `section-${index + 1}`,
        title: section.title ?? null,
        enabled: section.enabled ?? true,
        data: section.data ?? {},
      }))

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
        },
      })
      console.log(`✅ 创建: ${solution.title} (${solution.slug})`)
      created++
    } catch (error) {
      console.error(`❌ 错误: ${solution.title} - ${error}`)
      errors++
    }
  }

  console.log('\n' + '='.repeat(50))
  console.log(`📊 导入完成!`)
  console.log(`   ✅ 创建: ${created}`)
  console.log(`   ⏭️  跳过: ${skipped}`)
  console.log(`   ❌ 错误: ${errors}`)
  console.log('='.repeat(50))
}

main()
  .catch((e) => {
    console.error('导入失败:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
