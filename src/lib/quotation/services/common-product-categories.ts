import { prisma } from '@/lib/prisma'
import { readCommonProductCategory } from '../common-product-category'

export async function readCommonProductCategories(): Promise<string[]> {
  const settings = await prisma.setting.findMany({
    where: { key: { startsWith: 'quotation.product-category.' } },
    select: { value: true },
  })
  const categories = settings.map((entry) => readCommonProductCategory(entry.value)).filter(Boolean)
  return [...new Set(categories)].sort((a, b) => a.localeCompare(b, 'zh-CN'))
}
