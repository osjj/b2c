/**
 * Solutions 批量导入脚本
 *
 * 使用方法:
 * npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed-solutions.ts
 *
 * 或者如果上面的命令不工作，可以用:
 * npx tsx prisma/seed-solutions.ts
 */

import { PrismaClient, Industry } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

interface SolutionData {
  slug: string
  title: string
  subtitle: string | null
  industry: Industry
  coverImage: string | null
  isActive: boolean
  sortOrder: number
  hazardsContent: any
  standardsContent: any
  faqContent: any
  ppeCategories: any
  materials: any
  metaTitle: string | null
  metaDescription: string | null
  metaKeywords: string | null
}

async function main() {
  console.log('🚀 开始导入 Solutions 数据...\n')

  // 读取 JSON 数据文件
  const dataPath = path.join(__dirname, 'solutions-data.json')
  const rawData = fs.readFileSync(dataPath, 'utf-8')
  const solutions: SolutionData[] = JSON.parse(rawData)

  console.log(`📦 找到 ${solutions.length} 条数据\n`)

  let created = 0
  let updated = 0
  let errors = 0

  for (const solution of solutions) {
    try {
      // 检查是否已存在（通过 slug）
      const existing = await prisma.solution.findUnique({
        where: { slug: solution.slug }
      })

      if (existing) {
        // 更新现有记录
        await prisma.solution.update({
          where: { slug: solution.slug },
          data: {
            title: solution.title,
            subtitle: solution.subtitle,
            industry: solution.industry,
            coverImage: solution.coverImage,
            isActive: solution.isActive,
            sortOrder: solution.sortOrder,
            hazardsContent: solution.hazardsContent,
            standardsContent: solution.standardsContent,
            faqContent: solution.faqContent,
            ppeCategories: solution.ppeCategories,
            materials: solution.materials,
            metaTitle: solution.metaTitle,
            metaDescription: solution.metaDescription,
            metaKeywords: solution.metaKeywords,
          }
        })
        console.log(`✏️  更新: ${solution.title} (${solution.slug})`)
        updated++
      } else {
        // 创建新记录
        await prisma.solution.create({
          data: {
            slug: solution.slug,
            title: solution.title,
            subtitle: solution.subtitle,
            industry: solution.industry,
            coverImage: solution.coverImage,
            isActive: solution.isActive,
            sortOrder: solution.sortOrder,
            hazardsContent: solution.hazardsContent,
            standardsContent: solution.standardsContent,
            faqContent: solution.faqContent,
            ppeCategories: solution.ppeCategories,
            materials: solution.materials,
            metaTitle: solution.metaTitle,
            metaDescription: solution.metaDescription,
            metaKeywords: solution.metaKeywords,
          }
        })
        console.log(`✅ 创建: ${solution.title} (${solution.slug})`)
        created++
      }
    } catch (error) {
      console.error(`❌ 错误: ${solution.title} - ${error}`)
      errors++
    }
  }

  console.log('\n' + '='.repeat(50))
  console.log(`📊 导入完成!`)
  console.log(`   ✅ 创建: ${created}`)
  console.log(`   ✏️  更新: ${updated}`)
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
