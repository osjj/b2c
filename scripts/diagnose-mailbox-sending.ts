// Read-only database inspection. The optional legacy endpoint probe has no recipients.
import { loadEnvConfig } from '@next/env'
import { z } from 'zod'

loadEnvConfig(process.cwd())

async function main() {
  const { prisma } = await import('../src/lib/prisma')
  const { getMailboxConfig } = await import('../src/lib/mailbox/config')
  const config = getMailboxConfig()
  try {
    if (!config.account) throw new Error('MAILBOX_NOT_CONFIGURED')
    const attempts = await prisma.adminMailboxSendAttempt.findMany({
      where: { account: config.account }, orderBy: { createdAt: 'desc' }, take: 10,
      select: { requestKey: true, status: true, safeErrorCode: true, providerRequestId: true, createdAt: true },
    })
    process.stdout.write(`${JSON.stringify({ attempts })}\n`)
    if (!process.argv.includes('--probe-legacy-mime-permission')) return
    const apiKey = process.env.SMTP2GO_API_KEY
    if (!apiKey) throw new Error('SMTP2GO_NOT_CONFIGURED')
    // A headerless text string has no From/To/Cc/Bcc and cannot form a deliverable email.
    // It passes the JSON string-type check, allowing a permission denial to be observed.
    const mimeProbe = await fetch('https://api.smtp2go.com/v3/email/mime', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Smtp2go-Api-Key': apiKey },
      body: JSON.stringify({ mime_email: Buffer.from('Protocol diagnostic without any email headers or recipient addresses.').toString('base64'), fastaccept: false }),
      signal: AbortSignal.timeout(20000), redirect: 'error',
    })
    const mimeProbePayload = z.object({ data: z.object({ error_code: z.string().optional() }).optional() }).safeParse(await mimeProbe.json())
    const permissionDenied = mimeProbePayload.success && mimeProbePayload.data.data?.error_code === 'E_ApiResponseCodes.ENDPOINT_PERMISSION_DENIED'
    process.stdout.write(`${JSON.stringify({ probe: 'mime-permission-no-addresses', emailSubmitted: false, status: mimeProbe.status,
      result: permissionDenied ? 'LEGACY_MIME_PERMISSION_DENIED' : 'INCONCLUSIVE', standardEndpointPermissionVerified: false })}\n`)
  } finally { await prisma.$disconnect() }
}

void main().catch(error => {
  const code = error && typeof error === 'object' && 'code' in error && typeof error.code === 'string' ? error.code : 'DIAGNOSTIC_FAILED'
  process.stderr.write(`${JSON.stringify({ success: false, code })}\n`)
  process.exitCode = 1
})
