import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireMailboxAdmin, safeMailboxError } from '@/lib/mailbox/errors'
import { listMailboxThreads } from '@/lib/mailbox/store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const querySchema = z.object({ page: z.coerce.number().int().min(1).max(100000).default(1), search: z.string().trim().max(200).default('') })

export async function GET(request: NextRequest) {
  try {
    await requireMailboxAdmin()
    const query = querySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams))
    if (!query.success) return NextResponse.json({ success: false, reason: 'Invalid mailbox search or page.', code: 'VALIDATION_FAILED' }, { status: 400, headers: { 'Cache-Control': 'no-store' } })
    return NextResponse.json({ success: true, reason: 'Mailbox conversations loaded.', data: await listMailboxThreads(query.data.page, query.data.search) }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    const safe = safeMailboxError(error)
    return NextResponse.json({ success: false, reason: safe.reason, code: safe.code }, { status: safe.status, headers: { 'Cache-Control': 'no-store' } })
  }
}
