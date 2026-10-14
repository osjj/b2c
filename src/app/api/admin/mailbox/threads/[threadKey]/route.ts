import { NextRequest, NextResponse } from 'next/server'
import { MailboxError, requireMailboxAdmin, safeMailboxError } from '@/lib/mailbox/errors'
import { getMailboxThread } from '@/lib/mailbox/store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ threadKey: string }> }) {
  try {
    await requireMailboxAdmin()
    const { threadKey } = await params
    if (!/^[a-f0-9]{64}$/.test(threadKey)) throw new MailboxError('VALIDATION_FAILED', 'Invalid conversation identifier.')
    return NextResponse.json({ success: true, reason: 'Conversation loaded.', data: await getMailboxThread(threadKey) }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    const safe = safeMailboxError(error)
    return NextResponse.json({ success: false, reason: safe.reason, code: safe.code }, { status: safe.status, headers: { 'Cache-Control': 'no-store' } })
  }
}
