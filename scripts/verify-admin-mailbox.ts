import { existsSync } from 'node:fs'
import { config as loadEnv } from 'dotenv'
import { ImapFlow } from 'imapflow'
import { getMailboxConfig } from '../src/lib/mailbox/config'

loadEnv({ path: '.env', quiet: true })
if (existsSync('.env.local')) loadEnv({ path: '.env.local', override: true, quiet: true })

async function main() {
  const config = getMailboxConfig()
  if (!config.imap) throw new Error('NOT_CONFIGURED')
  const client = new ImapFlow({
    host: config.imap.host, port: config.imap.port, secure: true,
    auth: { user: config.imap.user, pass: config.imap.password },
    logger: false, disableAutoIdle: true, connectionTimeout: 12000, greetingTimeout: 10000, socketTimeout: 15000,
    tls: { rejectUnauthorized: true },
  })
  client.on('error', () => undefined)
  const timeout = setTimeout(() => client.close(), 25000)
  try {
    await client.connect()
    const folders = await client.list()
    const lock = await client.getMailboxLock('INBOX', { readOnly: true })
    try {
      if (!client.mailbox || !client.mailbox.readOnly) throw new Error('READ_ONLY_REQUIRED')
      process.stdout.write(JSON.stringify({
        connected: true, tls: true, readOnly: true,
        folders: folders.map(folder => ({ path: folder.path, specialUse: folder.specialUse || null })),
        inboxCount: client.mailbox.exists,
      }) + '\n')
    } finally { lock.release() }
  } finally { clearTimeout(timeout); client.close() }
}

main().catch(() => {
  process.stderr.write('MAILBOX_VERIFY_FAILED: Check IMAP authorization, TLS/network access and server configuration. No credentials or server response have been logged.\n')
  process.exitCode = 1
})
