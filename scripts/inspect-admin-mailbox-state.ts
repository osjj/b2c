import { loadEnvConfig } from '@next/env'
import { ImapFlow } from 'imapflow'

loadEnvConfig(process.cwd())

async function main() {
  const { prisma } = await import('../src/lib/prisma')
  const { getMailboxConfig } = await import('../src/lib/mailbox/config')
  const config = getMailboxConfig()
  if (!config.account) throw new Error('MAILBOX_NOT_CONFIGURED')
  try {
    const [counts, state, cursors] = await Promise.all([
      prisma.adminMailboxMessage.groupBy({ by: ['direction'], where: { account: config.account }, _count: true }),
      prisma.adminMailboxSyncState.findUnique({ where: { account: config.account }, select: { leaseUntil: true, lastSyncedAt: true, scanGeneration: true, generationImported: true } }),
      prisma.adminMailboxCursor.findMany({ where: { account: config.account }, select: { folder: true, since: true, backfillUid: true, backfillUpperUid: true, latestUid: true, backfillComplete: true, scanGeneration: true } }),
    ])
    process.stdout.write(`${JSON.stringify({ counts, state, cursors })}\n`)
    const search = process.argv.find(value => value.startsWith('--search='))?.slice('--search='.length)
    if (search) {
      const matched = await prisma.adminMailboxMessage.findMany({
        where: { account: config.account, subject: { contains: search, mode: 'insensitive' } },
        select: { id: true, subject: true, threadKey: true, messageId: true, direction: true, sentAt: true, cc: true, attachments: true, references: true, inReplyTo: true }, orderBy: { sentAt: 'asc' }, take: 200,
      })
      const threadKeys = [...new Set(matched.map(message => message.threadKey))]
      if (process.argv.includes('--show-subjects')) process.stdout.write(`${JSON.stringify({ sourceSubjects: matched.map(message => message.subject) })}\n`)
      const threadCounts = await prisma.adminMailboxMessage.groupBy({ by: ['threadKey'], where: { account: config.account, threadKey: { in: threadKeys } }, _count: true })
      process.stdout.write(`${JSON.stringify({ sourceExample: { matched: matched.length, threads: threadKeys.length, messages: matched.map(message => ({
        direction: message.direction, sentAt: message.sentAt.toISOString(), hasMessageId: Boolean(message.messageId),
        ccCount: Array.isArray(message.cc) ? message.cc.length : 0,
        attachmentCount: Array.isArray(message.attachments) ? message.attachments.length : 0,
        referencesCount: message.references.length, inReplyToCount: message.inReplyTo.length,
        threadMessageCount: threadCounts.find(thread => thread.threadKey === message.threadKey)?._count || 0,
      })) } })}\n`)
      const { simpleParser } = await import('mailparser')
      for (const message of matched.slice(0, 10)) {
        const source = await prisma.adminMailboxMessage.findUnique({ where: { id: message.id }, select: { rawMime: true } })
        if (!source?.rawMime) continue
        const mail = await simpleParser(Buffer.from(source.rawMime), { skipHtmlToText: true, skipTextToHtml: true, skipImageLinks: true })
        process.stdout.write(`${JSON.stringify({ sourceAttachmentKinds: mail.attachments.map(attachment => ({ contentType: attachment.contentType, disposition: attachment.contentDisposition || null, related: attachment.related || false })) })}\n`)
      }
    }
    if (process.argv.includes('--remote-counts') && config.imap) {
      const client = new ImapFlow({ host: config.imap.host, port: config.imap.port, secure: true, auth: { user: config.imap.user, pass: config.imap.password }, logger: false, disableAutoIdle: true, connectionTimeout: 12_000, socketTimeout: 15_000, tls: { rejectUnauthorized: true } })
      client.on('error', () => undefined)
      const timeout = setTimeout(() => client.close(), 45_000)
      try {
        await client.connect()
        const discovered = await client.list()
        const folders = config.folders || ['INBOX', ...discovered.filter(folder => folder.specialUse === '\\Sent').map(folder => folder.path)]
        const since = cursors.reduce((earliest, cursor) => cursor.since < earliest ? cursor.since : earliest, config.since)
        for (const folder of folders) {
          const lock = await client.getMailboxLock(folder, { readOnly: true })
          try {
            if (!client.mailbox || !client.mailbox.readOnly) throw new Error('READ_ONLY_REQUIRED')
            const all = await client.search({ since }, { uid: true })
            const direct = await client.search({ since, or: config.aliases.flatMap(alias => [{ from: alias }, { to: alias }, { cc: alias }, { header: { 'Delivered-To': alias } }]) }, { uid: true })
            process.stdout.write(`${JSON.stringify({ folder, since: since.toISOString().slice(0, 10), windowMessages: Array.isArray(all) ? all.length : null, directAliasCandidates: Array.isArray(direct) ? direct.length : null })}\n`)
          } finally { lock.release() }
        }
      } finally { clearTimeout(timeout); client.close() }
    }
  } finally { await prisma.$disconnect() }
}

void main().catch(() => { process.stderr.write('MAILBOX_STATE_FAILED\n'); process.exitCode = 1 })
