import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getMailboxConfig } from '@/lib/mailbox/config'
import { readMailboxContent } from '@/lib/mailbox/content'
import { MailboxError, requireMailboxAdmin, safeMailboxError } from '@/lib/mailbox/errors'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireMailboxAdmin()
    const config = getMailboxConfig()
    if (!config.account) throw new MailboxError('MAILBOX_NOT_CONFIGURED', 'Configure the QQ mailbox connection first.', 503)
    const { id } = await context.params
    const data = await readMailboxContent(config.account, id, {
      getMessage: (account, messageId) => prisma.adminMailboxMessage.findFirst({
        where: { account, id: messageId }, select: { rawMime: true },
      }),
    })
    return NextResponse.json({ success: true, reason: 'Original message presentation loaded.', data }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    const safe = safeMailboxError(error)
    return NextResponse.json({ success: false, code: safe.code, reason: safe.reason }, { status: safe.status, headers: { 'Cache-Control': 'no-store' } })
  }
}
