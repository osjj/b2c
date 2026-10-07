import { QuotationError } from './errors'

const MIB = 1024 * 1024
const MAX_IMAGE_BYTES = 5 * MIB
const MAX_TOTAL_IMAGE_BYTES = 64 * MIB

function formatMiB(bytes: number): string {
  return (bytes / MIB).toFixed(6).replace(/\.?0+$/, '')
}

export function assertQuotationImageBudget(assets: readonly { sizeBytes: number }[]): void {
  let totalBytes = 0
  let largestImageBytes = 0

  for (const asset of assets) {
    if (!Number.isSafeInteger(asset.sizeBytes) || asset.sizeBytes <= 0) {
      throw new QuotationError('VALIDATION_FAILED', '报价图片大小记录无效，请重新上传图片后重试')
    }
    totalBytes += asset.sizeBytes
    if (!Number.isSafeInteger(totalBytes)) {
      throw new QuotationError('VALIDATION_FAILED', '报价图片总大小记录无效，请重新上传图片后重试')
    }
    largestImageBytes = Math.max(largestImageBytes, asset.sizeBytes)
  }

  if (largestImageBytes > MAX_IMAGE_BYTES) {
    throw new QuotationError(
      'FILE_TOO_LARGE',
      `单张报价图片不能超过 5 MiB，当前最大图片为 ${formatMiB(largestImageBytes)} MiB，本次图片总量为 ${formatMiB(totalBytes)} MiB。请压缩或替换超限图片后重试`,
    )
  }
  if (totalBytes > MAX_TOTAL_IMAGE_BYTES) {
    throw new QuotationError(
      'FILE_TOO_LARGE',
      `本次报价图片总量为 ${formatMiB(totalBytes)} MiB，超过 64 MiB 上限。请压缩图片或减少选用图片后重试`,
    )
  }
}
