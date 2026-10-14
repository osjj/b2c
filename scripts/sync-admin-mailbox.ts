import { loadEnvConfig } from '@next/env'

loadEnvConfig(process.cwd())

async function main() {
  const { syncMailbox } = await import('../src/lib/mailbox/sync')
  const { safeMailboxError } = await import('../src/lib/mailbox/errors')
  const { prisma } = await import('../src/lib/prisma')
  const since = process.argv.find(value => value.startsWith('--since='))?.slice('--since='.length)
  try {
    const batches = Number(process.argv.find(value => value.startsWith('--batches='))?.slice('--batches='.length) || '1')
    if (!Number.isInteger(batches) || batches < 1 || batches > 100) throw new Error('INVALID_BATCH_COUNT')
    const diagnostics = process.argv.includes('--diagnostics') ? (event: { stage: string; code: string }) => process.stderr.write(`${JSON.stringify({ diagnostics: event })}\n`) : undefined
    for (let batch = 1; batch <= batches; batch++) {
      const result = await syncMailbox({ since }, diagnostics)
      // No credentials, message subjects, bodies or sender addresses in scheduler logs.
      process.stdout.write(`${JSON.stringify({ success: true, batch, ...result })}\n`)
      if (!result.hasMore) break
    }
  } catch (error) {
    const safe = safeMailboxError(error)
    process.stderr.write(`${JSON.stringify({ success: false, code: safe.code, reason: safe.reason })}\n`)
    process.exitCode = 1
  } finally { await prisma.$disconnect() }
}

void main()
