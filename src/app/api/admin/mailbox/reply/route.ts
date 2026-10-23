import { Prisma } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'

import { prisma } from '@/lib/prisma'
import { getMailboxConfig } from '@/lib/mailbox/config'
import { MailboxError, requireMailboxAdmin, requireMailboxMutationRequest, safeMailboxError } from '@/lib/mailbox/errors'
import { computeDedupeKey } from '@/lib/mailbox/mime'
import { getReplyAttemptStatus, parseReplyForm, readReplyForm, sendMailboxReply, type ReplyRepository } from '@/lib/mailbox/reply'
import { addReplyAttemptDiagnostics, readReplyAttemptDiagnostics } from '@/lib/mailbox/reply-attempt-diagnostics'
import { getMailboxParent, mailboxMessageSelect, mailboxMessageToDto } from '@/lib/mailbox/store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
// Includes the bounded provider call plus remote database acquisition/commit time.
export const maxDuration = 120

const attemptSelect = {
  requestKey: true, account: true, parentId: true, payloadHash: true, status: true,
  outboundMessageId: true, providerRequestId: true, safeErrorCode: true, createdAt: true, response: true,
} satisfies Prisma.AdminMailboxSendAttemptSelect

function replyAttempt(row: Prisma.AdminMailboxSendAttemptGetPayload<{ select: typeof attemptSelect }>) {
  const { response, ...attempt } = row
  return { ...attempt, diagnostics: readReplyAttemptDiagnostics(response) }
}

const repository: ReplyRepository = {
  async getParent(account, id) {
    const row = await getMailboxParent(account, id)
    return row ? { ...mailboxMessageToDto(row), references: row.references, inReplyTo: row.inReplyTo, rawMime: row.rawMime } : null
  },
  async getAttempt(requestKey) {
    const row = await prisma.adminMailboxSendAttempt.findUnique({ where: { requestKey }, select: attemptSelect })
    return row ? replyAttempt(row) : null
  },
  async reserve(prepared) {
    try {
      const attempt = await prisma.adminMailboxSendAttempt.create({ data: {
        requestKey: prepared.requestKey, account: prepared.account, parentId: prepared.parentId,
        payloadHash: prepared.payloadHash, status: 'SENDING', messageId: prepared.message.messageId || '',
        rawMime: new Uint8Array(prepared.rawMime),
        response: { message: prepared.message, references: prepared.references, inReplyTo: prepared.inReplyTo },
      }, select: attemptSelect })
      return { created: true, attempt: replyAttempt(attempt) }
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') throw error
      const attempt = await prisma.adminMailboxSendAttempt.findUnique({ where: { requestKey: prepared.requestKey }, select: attemptSelect })
      if (!attempt) throw error
      return { created: false, attempt: replyAttempt(attempt) }
    }
  },
  async getSentMessage(account, id) {
    const row = await prisma.adminMailboxMessage.findFirst({ where: { account, id, direction: 'OUTBOUND' }, select: mailboxMessageSelect })
    return row ? mailboxMessageToDto(row) : null
  },
  async finish(prepared, requestId) {
    const message = prepared.message
    return prisma.$transaction(async tx => {
      // A concurrent history sync may have merged this conversation while sending.
      const parent = await tx.adminMailboxMessage.findFirst({
        where: { id: prepared.parentId, account: prepared.account }, select: { threadKey: true },
      })
      if (!parent) throw new MailboxError('PARENT_NOT_FOUND', 'The original conversation is unavailable.', 404)
      const row = await tx.adminMailboxMessage.create({ data: {
        id: message.id, account: prepared.account, direction: 'OUTBOUND', messageId: message.messageId,
        dedupeKey: computeDedupeKey(message.messageId, prepared.rawMime), threadKey: parent.threadKey,
        fromAddress: message.from.address, replyTo: message.replyTo, to: message.to, cc: message.cc,
        subject: message.subject, textBody: message.textBody, preview: message.textBody.replace(/\s+/g, ' ').slice(0, 200),
        sentAt: new Date(message.sentAt), references: prepared.references, inReplyTo: prepared.inReplyTo,
        rawMime: new Uint8Array(prepared.rawMime), attachments: message.attachments,
      }, select: mailboxMessageSelect })
      await tx.adminMailboxSendAttempt.update({ where: { requestKey: prepared.requestKey }, data: {
        status: 'SENT', outboundMessageId: message.id, providerRequestId: requestId,
        // The same transaction has stored the private MIME in the message table.
        rawMime: null, response: Prisma.DbNull,
      } })
      return mailboxMessageToDto(row)
    }, { maxWait: 10_000, timeout: 20_000 })
  },
  async markOutcome(requestKey, status, code, requestId, diagnostics) {
    // Read only the small JSON archive, never its MIME bytes. The guarded update
    // below still owns the SENDING -> outcome transition under concurrent calls.
    const archive = status === 'FAILED' && diagnostics
      ? await prisma.adminMailboxSendAttempt.findUnique({ where: { requestKey }, select: { response: true } })
      : null
    await prisma.adminMailboxSendAttempt.updateMany({
      where: { requestKey, status: 'SENDING' },
      data: {
        status, safeErrorCode: code, providerRequestId: requestId,
        ...(archive ? { response: addReplyAttemptDiagnostics(archive.response, diagnostics) } : {}),
      },
    })
  },
}

function failure(error: unknown) {
  const safe = safeMailboxError(error)
  return NextResponse.json({
    success: false, code: safe.code, reason: safe.reason,
    ...('requestId' in safe ? { requestId: safe.requestId } : {}),
    ...('diagnostics' in safe ? { diagnostics: safe.diagnostics } : {}),
  }, { status: safe.status, headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request: NextRequest) {
  try {
    await requireMailboxAdmin()
    requireMailboxMutationRequest(request)
    const config = getMailboxConfig()
    const input = await parseReplyForm(await readReplyForm(request))
    const data = await sendMailboxReply(input, { ...config, apiKey: process.env.SMTP2GO_API_KEY }, { repository })
    return NextResponse.json({ success: true, reason: 'Reply accepted by the mail provider.', data }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return failure(error)
  }
}

export async function GET(request: NextRequest) {
  try {
    await requireMailboxAdmin()
    const config = getMailboxConfig()
    if (!config.account) throw new MailboxError('MAILBOX_NOT_CONFIGURED', 'Configure the QQ mailbox connection first.', 503)
    const data = await getReplyAttemptStatus(request.nextUrl.searchParams.get('requestKey') || '', config.account, repository)
    return NextResponse.json({ success: true, reason: 'Reply status loaded.', data }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return failure(error)
  }
}
