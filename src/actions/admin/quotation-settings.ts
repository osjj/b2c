'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { assertQuotationWorkbenchEnabled } from '@/lib/quotation/feature'
import { toQuotationActionError } from '@/lib/quotation/errors'
import { WORKBENCH_SETTINGS_KEY, workbenchSettingsSchema } from '@/lib/quotation/workbench-config'
import { writeQuotationAudit } from '@/lib/quotation/services/audit'
import { readBrandForSnapshot } from '@/lib/quotation/services/workbench-settings'

export async function saveQuotationSettings(input: unknown) {
  try {
    assertQuotationWorkbenchEnabled()
    const actor = await requireAdmin()
    const data = workbenchSettingsSchema.parse(input)
    await readBrandForSnapshot(data)
    await prisma.$transaction(async (tx) => {
      await tx.setting.upsert({ where: { key: WORKBENCH_SETTINGS_KEY }, create: { key: WORKBENCH_SETTINGS_KEY, value: data }, update: { value: data } })
      await writeQuotationAudit(tx, { entityType: 'QuotationSettings', entityId: WORKBENCH_SETTINGS_KEY, action: 'UPDATE', actorId: actor.id })
    })
    revalidatePath('/admin/quotation-settings')
    revalidatePath('/admin/sales-quotations/new')
    return { success: true as const, reason: '报价设置已保存；已生成的文件不会改变。' }
  } catch (error) { return toQuotationActionError(error) }
}
