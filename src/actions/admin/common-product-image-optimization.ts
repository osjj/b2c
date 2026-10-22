'use server'

import { revalidatePath } from 'next/cache'

import { requireAdmin } from '@/lib/auth-utils'
import {
  imageOptimizationInputSchema,
  imageOptimizationScanInputSchema,
} from '@/lib/quotation/common-product-image-optimization'
import { toQuotationActionError } from '@/lib/quotation/errors'
import { assertQuotationWorkbenchEnabled } from '@/lib/quotation/feature'
import {
  optimizeCommonProductImageSource,
  scanCommonProductImages,
} from '@/lib/quotation/services/common-product-image-optimization'

export async function scanCommonProductImageOptimization(input: unknown) {
  try {
    assertQuotationWorkbenchEnabled()
    await requireAdmin()
    const data = imageOptimizationScanInputSchema.parse(input)
    return { success: true as const, reason: '常用产品图片已扫描', data: await scanCommonProductImages(data.cursor) }
  } catch (error) {
    return toQuotationActionError(error)
  }
}

export async function optimizeCommonProductImage(input: unknown) {
  try {
    assertQuotationWorkbenchEnabled()
    const actor = await requireAdmin()
    const data = imageOptimizationInputSchema.parse(input)
    const result = await optimizeCommonProductImageSource(data, actor.id)
    revalidatePath('/admin/quotation-products')
    revalidatePath(`/admin/quotation-products/${data.productId}`)
    revalidatePath('/admin/quotation-products/optimize-images')
    return { success: true as const, reason: result.status === 'optimized' ? '图片已优化，原图已保留' : '保留现有图片', data: result }
  } catch (error) {
    return toQuotationActionError(error)
  }
}
