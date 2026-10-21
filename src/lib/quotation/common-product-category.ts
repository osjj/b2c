import { z } from 'zod'

export const COMMON_PRODUCT_CATEGORIES = [
  '头部防护', '眼面防护', '听力防护', '呼吸防护', '手部防护', '足部防护',
  '身体防护', '雨衣雨具', '防坠落防护', '消防装备', '其他用品',
] as const

export const commonProductCategorySchema = z.string().trim().max(80, '分类最多 80 个字符')

const categorySettingSchema = z.object({ category: commonProductCategorySchema.optional() })

export function readCommonProductCategory(value: unknown): string {
  const parsed = categorySettingSchema.safeParse(value)
  return parsed.success ? parsed.data.category ?? '' : ''
}
