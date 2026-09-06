import { QuotationError } from './errors'
import { z } from 'zod'

export const catalogOptionsSchema = z.array(z.object({ id: z.string().cuid(), name: z.string(), unitPrice: z.string(), unitCost: z.string().nullable(), updatedAt: z.string().datetime(), imageIds: z.array(z.string()) }))
export type CatalogProductOption = z.infer<typeof catalogOptionsSchema>[number]

export function catalogSpecifications(value: unknown): string {
  if (Array.isArray(value)) return value.flatMap((entry) => typeof entry === 'string' ? [entry] : entry && typeof entry === 'object' && 'name' in entry && 'value' in entry && typeof entry.name === 'string' && ['string', 'number'].includes(typeof entry.value) ? [`${entry.name}: ${entry.value}`] : []).join('\n')
  if (value && typeof value === 'object') return Object.entries(value).flatMap(([key, entry]) => ['string', 'number', 'boolean'].includes(typeof entry) ? [`${key}: ${entry}`] : []).join('\n')
  return ''
}

// Only object keys from our configured catalog bucket; never fetch arbitrary database URLs.
export function catalogImageKey(value: string, publicBase: string): string {
  let url: URL; let base: URL
  try { url = new URL(value); base = new URL(publicBase) } catch { throw new QuotationError('VALIDATION_FAILED', '商品图片不是已配置的商城 R2 图片，请手动上传') }
  const prefix = base.pathname.replace(/\/+$/, '') + '/'
  if (url.protocol !== 'https:' || url.origin !== base.origin || !url.pathname.startsWith(prefix) || url.username || url.password || url.search || url.hash) throw new QuotationError('VALIDATION_FAILED', '商品图片不属于已配置的商城 R2，请手动上传')
  const key = decodeURIComponent(url.pathname.slice(prefix.length))
  if (!key || key.includes('..') || key.includes('\\') || key.startsWith('/') || /[\x00-\x1f]/.test(key)) throw new QuotationError('VALIDATION_FAILED', '商品图片路径无效')
  return key
}
