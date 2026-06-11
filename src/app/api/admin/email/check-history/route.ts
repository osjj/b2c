import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { requireAdmin } from '@/lib/auth-utils'
import { checkAdminEmailRecipients } from '@/lib/admin-email-store'

const recipientListSchema = z
  .string()
  .trim()
  .min(1, 'At least one recipient is required')
  .transform((value) =>
    value
      .split(/[\n,;]+/)
      .map((item) => item.trim())
      .filter(Boolean)
  )
  .refine((items) => items.length > 0, 'At least one recipient is required')
  .refine(
    (items) => items.every((item) => z.email().safeParse(item).success),
    'One or more recipient email addresses are invalid'
  )

const checkEmailHistorySchema = z.object({
  recipients: recipientListSchema,
})

export async function POST(request: NextRequest) {
  await requireAdmin()

  const body = (await request.json().catch(() => null)) as unknown
  const parsed = checkEmailHistorySchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        reason: 'Invalid recipients input.',
        errors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    )
  }

  const results = await checkAdminEmailRecipients(parsed.data.recipients)
  const sentBeforeCount = results.filter((item) => item.sentCount > 0).length

  return NextResponse.json({
    success: true,
    reason: 'Recipient history checked.',
    results,
    summary: {
      total: results.length,
      sentBefore: sentBeforeCount,
      newRecipients: results.length - sentBeforeCount,
    },
  })
}
