import { createHash } from 'node:crypto'
import { Prisma, type AdminMailboxMessage } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getMailboxConfig, type MailboxConfig } from './config'
import { MailboxError } from './errors'
import { type ParsedMailboxMessage } from './mime'
import { mailboxAddressSchema, mailboxAttachmentSchema, type MailboxMessage, type MailboxStatus, type MailboxThread } from './types'

export const mailboxMessageSelect = {
  id: true, account: true, direction: true, messageId: true, dedupeKey: true, threadKey: true,
  fromAddress: true, fromName: true, replyTo: true, to: true, cc: true, subject: true, textBody: true,
  sentAt: true, references: true, inReplyTo: true, attachments: true,
} satisfies Prisma.AdminMailboxMessageSelect

type DtoRow = Pick<AdminMailboxMessage, 'id' | 'threadKey' | 'direction' | 'messageId' | 'fromAddress' | 'fromName' | 'replyTo' | 'to' | 'cc' | 'subject' | 'textBody' | 'sentAt' | 'attachments'>
export function mailboxMessageToDto(row: DtoRow): MailboxMessage {
  return {
    id: row.id, threadKey: row.threadKey, direction: row.direction, messageId: row.messageId,
    from: { address: row.fromAddress, ...(row.fromName ? { name: row.fromName } : {}) },
    replyTo: mailboxAddressSchema.array().parse(row.replyTo), to: mailboxAddressSchema.array().parse(row.to),
    cc: mailboxAddressSchema.array().parse(row.cc), subject: row.subject, textBody: row.textBody,
    sentAt: row.sentAt.toISOString(), attachments: mailboxAttachmentSchema.array().parse(row.attachments),
  }
}

export async function getMailboxParent(account: string, id: string) {
  return prisma.adminMailboxMessage.findFirst({ where: { account, id }, select: { ...mailboxMessageSelect, rawMime: true } })
}

export function resolveMailboxThreadKey(account: string, parsed: Pick<ParsedMailboxMessage, 'messageId' | 'references' | 'inReplyTo' | 'dedupeKey'>, related: { threadKey: string }[]) {
  return related[0]?.threadKey || createHash('sha256').update(`${account}\0${parsed.references[0] || parsed.inReplyTo[0] || parsed.messageId || parsed.dedupeKey}`).digest('hex')
}

export async function persistMailboxMessage(account: string, parsed: ParsedMailboxMessage, ownAddresses: string[], syncLease?: { lockToken: string; scanGeneration: number }) {
  try {
    return await prisma.$transaction(async tx => {
      const duplicate = await tx.adminMailboxMessage.findUnique({ where: { account_dedupeKey: { account, dedupeKey: parsed.dedupeKey } }, select: { id: true } })
      if (duplicate) return { imported: false, id: duplicate.id }
      const ids = [...new Set([parsed.messageId, ...parsed.references, ...parsed.inReplyTo].filter((id): id is string => Boolean(id)))]
      const related = ids.length ? await tx.adminMailboxMessage.findMany({
        where: { account, OR: [{ messageId: { in: ids } }, { references: { hasSome: ids } }, { inReplyTo: { hasSome: ids } }] },
        select: { threadKey: true }, orderBy: { createdAt: 'asc' },
      }) : []
      const threadKey = resolveMailboxThreadKey(account, parsed, related)
      const merging = [...new Set(related.map(row => row.threadKey))].filter(key => key !== threadKey)
      if (merging.length) await tx.adminMailboxMessage.updateMany({ where: { account, threadKey: { in: merging } }, data: { threadKey } })
      const message = await tx.adminMailboxMessage.create({ data: {
        account, direction: ownAddresses.includes(parsed.from.address) ? 'OUTBOUND' : 'INBOUND',
        messageId: parsed.messageId, dedupeKey: parsed.dedupeKey, threadKey,
        fromAddress: parsed.from.address, fromName: parsed.from.name,
        replyTo: parsed.replyTo, to: parsed.to, cc: parsed.cc,
        subject: parsed.subject, textBody: parsed.textBody, preview: parsed.textBody.replace(/\s+/g, ' ').slice(0, 200),
        sentAt: parsed.sentAt, references: parsed.references, inReplyTo: parsed.inReplyTo,
        attachments: parsed.attachments, rawMime: new Uint8Array(parsed.rawMime),
      }, select: { id: true } })
      if (syncLease) {
        const counted = await tx.adminMailboxSyncState.updateMany({
          where: { account, lockToken: syncLease.lockToken, scanGeneration: syncLease.scanGeneration, leaseUntil: { gt: new Date() } },
          data: { generationImported: { increment: 1 } },
        })
        if (counted.count !== 1) throw new MailboxError('SYNC_LEASE_LOST', 'The mailbox sync lease expired. Retry to resume safely.', 409)
      }
      return { imported: true, id: message.id }
    }, { maxWait: 10_000, timeout: 20_000 })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return { imported: false, id: null }
    throw error
  }
}

export async function getMailboxStatus(config: MailboxConfig): Promise<MailboxStatus> {
  const [state, cursor] = config.account && config.configured ? await Promise.all([
    prisma.adminMailboxSyncState.findUnique({ where: { account: config.account }, select: { lastSyncedAt: true } }),
    prisma.adminMailboxCursor.findFirst({ where: { account: config.account }, orderBy: { since: 'asc' }, select: { since: true } }),
  ]) : [null, null]
  return {
    configured: config.configured, smtpConfigured: config.smtpConfigured, account: config.account, aliases: config.aliases,
    ownAddresses: config.ownAddresses, defaultSender: config.defaultSender, lastSyncedAt: state?.lastSyncedAt?.toISOString() || null,
    syncSince: (cursor?.since || config.since).toISOString().slice(0, 10),
  }
}

export async function listMailboxThreads(page: number, search: string) {
  const config = getMailboxConfig()
  const status = await getMailboxStatus(config)
  if (!config.account || !config.configured) return { threads: [], page: 1, totalPages: 1, total: 0, status }
  // Parameters stay bound; LIKE metacharacters are escaped for literal search.
  const pattern = `%${search.replace(/[\\%_]/g, '\\$&')}%`
  const searchClause = search ? Prisma.sql`AND ("subject" ILIKE ${pattern} OR "fromAddress" ILIKE ${pattern} OR "preview" ILIKE ${pattern})` : Prisma.empty
  const matched = Prisma.sql`SELECT DISTINCT "threadKey" FROM "admin_mailbox_messages" WHERE "account" = ${config.account} ${searchClause}`
  const counts = await prisma.$queryRaw<{ total: bigint }[]>(Prisma.sql`SELECT COUNT(*) AS total FROM (${matched}) matched`)
  const total = Number(counts[0]?.total || 0)
  const totalPages = Math.max(1, Math.ceil(total / 25))
  const currentPage = Math.min(page, totalPages)
  // PostgreSQL aggregates and pages metadata. Bodies and raw MIME never cross this query.
  const rows = await prisma.$queryRaw<{ threadKey: string; subject: string; preview: string; latestAt: Date; messageCount: bigint; participants: string[] }[]>(Prisma.sql`
    WITH matched AS (${matched}), grouped AS (
      SELECT m."threadKey", MAX(m."sentAt") AS "latestAt", COUNT(*) AS "messageCount", ARRAY_AGG(DISTINCT m."fromAddress") AS participants
      FROM "admin_mailbox_messages" m JOIN matched ON matched."threadKey" = m."threadKey"
      WHERE m."account" = ${config.account} GROUP BY m."threadKey"
      ORDER BY MAX(m."sentAt") DESC, m."threadKey" ASC LIMIT 25 OFFSET ${(currentPage - 1) * 25}
    )
    SELECT g.*, latest."subject", latest."preview" FROM grouped g
    CROSS JOIN LATERAL (
      SELECT "subject", "preview" FROM "admin_mailbox_messages"
      WHERE "account" = ${config.account} AND "threadKey" = g."threadKey"
      ORDER BY "sentAt" DESC, "id" DESC LIMIT 1
    ) latest ORDER BY g."latestAt" DESC, g."threadKey" ASC
  `)
  const threads: MailboxThread[] = rows.map(row => ({ ...row, latestAt: row.latestAt.toISOString(), messageCount: Number(row.messageCount) }))
  return { threads, page: currentPage, totalPages, total, status }
}

export async function getMailboxThread(threadKey: string) {
  const config = getMailboxConfig()
  if (!config.account) throw new MailboxError('MAILBOX_NOT_CONFIGURED', 'Configure the QQ mailbox connection first.', 503)
  const where = { account: config.account, threadKey }
  const [rows, total] = await Promise.all([
    prisma.adminMailboxMessage.findMany({ where, select: mailboxMessageSelect, orderBy: { sentAt: 'desc' }, take: 100 }),
    prisma.adminMailboxMessage.count({ where }),
  ])
  if (!rows.length) throw new MailboxError('NOT_FOUND', 'Conversation not found.', 404)
  return { messages: rows.reverse().map(mailboxMessageToDto), ownAddresses: config.ownAddresses, defaultSender: config.defaultSender, truncated: total > rows.length, total }
}
