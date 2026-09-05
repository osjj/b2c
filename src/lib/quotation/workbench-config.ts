import { z } from 'zod'

export const WORKBENCH_SETTINGS_KEY = 'quotation.workbench.v2'
export const quotationBrandSchema = z.object({
  companyName: z.string().trim().max(160).default('LAIFAPPE'),
  contactLine: z.string().trim().max(500).default(''),
  tagline: z.string().trim().max(160).default('PERSONAL PROTECTIVE EQUIPMENT'),
  logo: z.object({ dataUrl: z.string().max(1_500_000).regex(/^data:image\/(png|jpeg);base64,/), sha256: z.string().length(64) }).optional(),
  seal: z.object({ dataUrl: z.string().max(1_500_000).regex(/^data:image\/(png|jpeg);base64,/), sha256: z.string().length(64) }).optional(),
})
export const workbenchSettingsSchema = z.object({
  brand: quotationBrandSchema.pick({ companyName: true, contactLine: true, tagline: true }).default({ companyName: 'LAIFAPPE', contactLine: '', tagline: 'PERSONAL PROTECTIVE EQUIPMENT' }),
  logoSourceId: z.string().uuid().nullable().default(null),
  sealSourceId: z.string().uuid().nullable().default(null),
  useSeal: z.boolean().default(false),
  currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/).default('USD'),
  defaultTerms: z.string().max(4000).default(''),
}).refine((settings) => !settings.useSeal || Boolean(settings.sealSourceId), { path: ['sealSourceId'], message: '启用印章前请先上传印章图片' })
export type WorkbenchSettings = z.infer<typeof workbenchSettingsSchema>
export const defaultWorkbenchSettings = workbenchSettingsSchema.parse({})

export function quotationCurrencyMinorUnit(currency: string): number {
  try { return new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits ?? 2 } catch { return 2 }
}

export function revisionStatusLabel(state: string): string {
  return ({ DRAFT: '草稿', READY: '草稿', FINALIZING: '文件生成中', FINALIZED: '已生成', ISSUED: '已发送', SUPERSEDED: '历史版本', VOID: '已作废' } as Record<string, string>)[state] ?? state
}
