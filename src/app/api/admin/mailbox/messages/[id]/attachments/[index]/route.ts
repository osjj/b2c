import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getMailboxConfig } from '@/lib/mailbox/config'
import { MailboxError, requireMailboxAdmin, safeMailboxError } from '@/lib/mailbox/errors'
import { readMailboxAttachment } from '@/lib/mailbox/attachments'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string; index: string }> }) {
  try {
    await requireMailboxAdmin()
    const { id, index } = await params
    const config = getMailboxConfig()
    if (!config.account) throw new MailboxError('MAILBOX_NOT_CONFIGURED', 'Configure the QQ mailbox connection first.', 503)
    const attachment = await readMailboxAttachment(config.account, id, index, {
      async getRawMime(account, messageId) {
        const message = await prisma.adminMailboxMessage.findFirst({ where: { account, id: messageId }, select: { rawMime: true } })
        return message?.rawMime || null
      },
    })
    return new NextResponse(attachment.content, { headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="attachment"; filename*=UTF-8''${encodeURIComponent(attachment.filename)}`,
      'Content-Length': String(attachment.content.length), 'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "sandbox; default-src 'none'",
    } })
  } catch (error) {
    const safe = safeMailboxError(error)
    return NextResponse.json({ success: false, reason: safe.reason, code: safe.code }, { status: safe.status, headers: { 'Cache-Control': 'no-store' } })
  }
}
