import { z } from 'zod'

export const productSourceSchema = z.string()
  .trim()
  .max(2000, '商品来源不能超过 2000 个字符')
  .transform((value) => value === '' ? null : value)
  .nullable()
  .optional()

export const costPriceTextSchema = z.string()
  .trim()
  .max(2000, '成本价文本不能超过 2000 个字符')
  .transform((value) => value === '' ? null : value)
  .nullable()
  .optional()
