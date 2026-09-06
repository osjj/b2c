import { prisma } from '@/lib/prisma'
import { defaultWorkbenchSettings, WORKBENCH_SETTINGS_KEY, workbenchSettingsSchema } from '../workbench-config'
import type { WorkbenchSettings } from '../workbench-config'
import { QuotationError } from '../errors'
import { getQuotationPrivateStorage } from '../private-storage'
import type { QuotationSnapshot } from '../artifacts/snapshot'

// Server-only persistence; callers must authorize before reading this configuration.
export async function readWorkbenchSettings() {
  const stored = await prisma.setting.findUnique({ where: { key: WORKBENCH_SETTINGS_KEY } })
  if (!stored) return defaultWorkbenchSettings
  return workbenchSettingsSchema.parse(stored.value)
}

// Call only for a newly claimed finalization; never when replaying/downloading formal files.
export async function refreshFinalizationBrand(snapshot: QuotationSnapshot): Promise<QuotationSnapshot> {
  if (!['jordan-ai-v1', 'presentation-v2'].includes(snapshot.templateVersion)) return snapshot
  const stored = await prisma.setting.findUnique({ where: { key: WORKBENCH_SETTINGS_KEY } })
  if (!stored) return snapshot
  const brand = await readBrandForSnapshot(workbenchSettingsSchema.parse(stored.value))
  return { ...snapshot, brand }
}

export async function readBrandForSnapshot(settings: WorkbenchSettings) {
  async function image(id: string | null) {
    if (!id) return undefined
    const file = await prisma.quotationSourceFile.findFirst({ where: { id, securityStatus: 'CLEAN', deletedAt: null, salesQuotationId: null, contentType: { in: ['image/png', 'image/jpeg'] }, sizeBytes: { lte: 1024 * 1024 } } })
    if (!file) throw new QuotationError('FILE_NOT_CLEAN', '公司 Logo / 印章不可用，请在报价设置中重新选择不超过 1 MB 的 PNG/JPEG')
    const stored = await getQuotationPrivateStorage().get(file.objectKey, file.contentType)
    if (stored.sha256 !== file.sha256 || stored.sizeBytes !== file.sizeBytes) throw new QuotationError('DOCUMENT_VALIDATION_FAILED', '品牌图片完整性校验失败')
    return { dataUrl: `data:${file.contentType};base64,${stored.bytes.toString('base64')}`, sha256: stored.sha256 }
  }
  return { ...settings.brand, logo: await image(settings.logoSourceId), seal: settings.useSeal ? await image(settings.sealSourceId) : undefined }
}
