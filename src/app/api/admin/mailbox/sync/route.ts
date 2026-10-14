import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireMailboxAdmin, requireMailboxMutationRequest, safeMailboxError } from '@/lib/mailbox/errors'
import { syncMailbox } from '@/lib/mailbox/sync'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120
const inputSchema = z.object({ since: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() }).strict()

export async function POST(request: NextRequest) {
  try {
    await requireMailboxAdmin()
    requireMailboxMutationRequest(request)
    const input = inputSchema.safeParse(await request.json().catch(() => null))
    if (!input.success) return NextResponse.json({ success: false, reason: 'Provide an optional history date using YYYY-MM-DD.', code: 'VALIDATION_FAILED' }, { status: 400, headers: { 'Cache-Control': 'no-store' } })
    const data = await syncMailbox(input.data)
    return NextResponse.json({ success: true, reason: data.hasMore ? 'Batch saved. Sync again to continue remaining history.' : 'Mailbox sync completed.', data }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    const safe = safeMailboxError(error)
    return NextResponse.json({ success: false, reason: safe.reason, code: safe.code }, { status: safe.status, headers: { 'Cache-Control': 'no-store' } })
  }
}
