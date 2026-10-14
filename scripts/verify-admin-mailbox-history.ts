// Read-only integration check for stored mailbox metadata and private attachments.
import { loadEnvConfig } from '@next/env'

loadEnvConfig(process.cwd())

async function main() {
  const { prisma } = await import('../src/lib/prisma')
  const { getMailboxConfig } = await import('../src/lib/mailbox/config')
  const { listMailboxThreads, getMailboxThread } = await import('../src/lib/mailbox/store')
  const { mailboxThreadSchema, mailboxMessageSchema } = await import('../src/lib/mailbox/types')
  const { readMailboxAttachment } = await import('../src/lib/mailbox/attachments')
  const { MailboxError, safeMailboxError } = await import('../src/lib/mailbox/errors')
  let stage = 'CONFIG'
  const trace = (next: string) => {
    stage = next
    if (process.argv.includes('--diagnostics')) process.stderr.write(`${JSON.stringify({ stage })}\n`)
  }
  try {
    const config = getMailboxConfig()
    if (!config.account) throw new MailboxError('MAILBOX_NOT_CONFIGURED', 'Configure the mailbox before checking its stored history.', 503)
    const search = process.argv.find(value => value.startsWith('--search='))?.slice('--search='.length) || ''
    trace('LIST_THREADS')
    const list = await listMailboxThreads(1, search)
    trace('VALIDATE_LIST')
    mailboxThreadSchema.array().parse(list.threads)
    const first = list.threads[0]
    if (!first) throw new MailboxError('NO_STORED_MAIL', 'No stored conversation matches this search.', 404)
    trace('LOAD_THREAD')
    const detail = await getMailboxThread(first.threadKey)
    trace('VALIDATE_THREAD')
    mailboxMessageSchema.array().parse(detail.messages)
    const source = detail.messages.find(message => message.attachments.some(file => file.contentType === 'application/pdf'))
      || detail.messages.find(message => message.attachments.length > 0)
    const file = source?.attachments.find(attachment => attachment.contentType === 'application/pdf') || source?.attachments[0]
    let attachmentByteMatch: boolean | null = null
    if (source && file) {
      trace('READ_ATTACHMENT')
      const attachment = await readMailboxAttachment(config.account, source.id, String(file.index), {
        async getRawMime(account, id) {
          const row = await prisma.adminMailboxMessage.findFirst({ where: { account, id }, select: { rawMime: true } })
          return row?.rawMime || null
        },
      })
      attachmentByteMatch = attachment.content.byteLength === file.size
      if (!attachmentByteMatch) throw new MailboxError('ATTACHMENT_SIZE_MISMATCH', 'The stored attachment size does not match the message metadata.', 500)
    }
    process.stdout.write(`${JSON.stringify({ success: true, readOnly: true, matchedThreads: list.total,
      checkedMessages: detail.messages.length, messageIdsPresent: detail.messages.every(message => Boolean(message.messageId)),
      attachmentByteMatch, truncated: detail.truncated })}\n`)
  } catch (error) {
    if (process.argv.includes('--diagnostics')) {
      const candidate = error as { code?: unknown; meta?: { code?: unknown }; issues?: Array<{ path: unknown; code: string; expected?: string }> }
      const safeCode = (value: unknown) => typeof value === 'string' && /^[A-Z0-9_]{1,80}$/.test(value) ? value : 'UNKNOWN'
      process.stderr.write(`${JSON.stringify({ stage, code: safeCode(candidate.code), databaseCode: safeCode(candidate.meta?.code), validation: candidate.issues?.map(issue => ({ path: issue.path, code: issue.code, expected: issue.expected })) })}\n`)
    }
    const safe = safeMailboxError(error)
    process.stderr.write(`${JSON.stringify({ success: false, code: safe.code, reason: safe.reason })}\n`)
    process.exitCode = 1
  } finally { await prisma.$disconnect() }
}

void main()
