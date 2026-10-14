// Isolated UI fixture server. Never loads env, DB, IMAP or any sending service.
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { build } from 'esbuild'
import postcss from 'postcss'
import tailwind from '@tailwindcss/postcss'
import { createRequire } from 'node:module'
import MailComposer from 'nodemailer/lib/mail-composer/index.js'
import sharp from 'sharp'

await build({ entryPoints: ['src/lib/mailbox/rich-content.ts'], bundle: true, platform: 'node', format: 'cjs', packages: 'external', outfile: 'outputs/mailbox/rich-content-fixture.cjs' })
const { readRichMailboxContent } = createRequire(import.meta.url)('../outputs/mailbox/rich-content-fixture.cjs')
const demoImage = await sharp(Buffer.from('<svg width="160" height="96" xmlns="http://www.w3.org/2000/svg"><rect width="160" height="96" fill="#e8f1fa"/><rect x="28" y="23" width="104" height="54" rx="5" fill="#d29b5c"/><path d="M28 23L80 9L132 23L80 38Z" fill="#eccb9c"/><path d="M80 38V77" stroke="#946533" stroke-width="3"/></svg>')).png().toBuffer()
const richFixtureMime = await new MailComposer({
  from: 'buyer@example.com', to: 'sales@laifappe.com', subject: 'Packing details — fixture only',
  html: '<html><head><style>body{font-family:Arial;color:#25324b}.heading{color:#ffffff;background-color:#173b67;padding:18px;font-size:22px}.note{color:#8c4510;background-color:#fff2cd;padding:12px}.details td{padding:10px;border:1px solid #d5dfeb}</style></head><body><table width="600" cellpadding="0" cellspacing="0" style="border-collapse:collapse"><tr><td class="heading">Shipment collection</td></tr><tr><td style="padding:18px;background-color:#f5f8fc"><img src="cid:packing-image" width="160" height="96" alt="Packing illustration"><p>Hello,</p><p>Please confirm the collection date and the packing details.</p><table class="details" style="border-collapse:collapse;width:100%"><tr><td><strong>Reference</strong></td><td>Sample shipment</td></tr><tr><td><strong>Documents</strong></td><td style="color:#16734b">Packing list attached</td></tr></table><p class="note"><strong>Please send photos before collection.</strong></p><a href="https://example.com/packing" style="color:#1856a2">View packing reference</a><p>Thank you,<br>Sample Buyer</p><img src="https://example.invalid/external.png" width="24" height="24" alt="External image"></td></tr></table></body></html>',
  attachments: [{ filename: 'packing.png', content: demoImage, cid: 'packing-image', contentType: 'image/png' }],
}).compile().build()
const richFixture = await readRichMailboxContent(richFixtureMime)

const messages = [{
  id: 'fixture-inbound-1', threadKey: 'fixture-thread-1', direction: 'INBOUND', messageId: '<one@buyer.example>',
  from: { address: 'buyer@example.com', name: 'Sample Buyer' }, replyTo: [{ address: 'logistics@example.com' }],
  to: [{ address: 'sales@laifappe.com' }, { address: 'external@example.com' }],
  cc: [{ address: 'team@example.com' }, { address: 'fixture@qq.com' }, { address: 'srs0=forward@laifappe.com' }],
  subject: 'Shipment collection — fixture only', textBody: 'Please confirm the collection date.\n\n<img src="https://example.invalid/pixel" onerror="alert(1)">\nUntrusted HTML stays plain text.',
  sentAt: '2026-10-14T00:23:00.000Z', attachments: [{ index: 0, filename: 'packing-list.pdf', contentType: 'application/pdf', size: 1024 }],
}, {
  id: 'fixture-inbound-2', threadKey: 'fixture-thread-2', direction: 'INBOUND', messageId: '<two@buyer.example>',
  from: { address: 'other@example.com', name: 'Other Buyer' }, replyTo: [], to: [{ address: 'sales@laifappe.com' }], cc: [],
  subject: 'Second conversation — fixture only', textBody: 'Hello,\n\nPlease confirm the collection date and the attached packing details.\n\nReference: https://example.com/documents/packing-details?reference=fixture-only-long-reference-for-email-wrapping-check-123456789012345678901234567890\n\nThank you,\nSample Buyer\n\n> Previous message\n> Please keep these items in the same shipment.', sentAt: '2026-10-13T00:00:00.000Z', attachments: [],
}]
const ownAddresses = ['sales@laifappe.com', 'fixture@qq.com']
const status = { configured: true, smtpConfigured: true, account: 'fixture@qq.com', aliases: ['sales@laifappe.com'], ownAddresses, defaultSender: 'sales@laifappe.com', lastSyncedAt: null, syncSince: '2026-07-16' }
const attempts = new Map()
const bundle = await build({ stdin: {
  contents: `import React from 'react'; import {createRoot} from 'react-dom/client'; import {MailboxPanel} from './src/components/admin/mailbox-panel'; createRoot(document.getElementById('root')).render(<><p className="mb-6 rounded bg-amber-100 p-3 text-sm">UI fixture preview — simulated mail only; no external sending.</p><MailboxPanel/></>);`,
  resolveDir: process.cwd(), loader: 'tsx',
}, bundle: true, write: false, platform: 'browser', jsx: 'automatic', define: { 'process.env.NODE_ENV': '"development"' }, tsconfig: 'tsconfig.json' })
const css = await postcss([tailwind()]).process(await readFile('src/app/globals.css', 'utf8'), { from: 'src/app/globals.css' })
const json = (response, data, code = 200) => { response.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); response.end(JSON.stringify(data)) }
const server = createServer(async (request, response) => {
  const url = new URL(request.url, 'http://127.0.0.1:3127')
  if (url.pathname === '/bundle.js') { response.setHeader('Content-Type', 'text/javascript'); return response.end(bundle.outputFiles[0].contents) }
  if (url.pathname === '/style.css') { response.setHeader('Content-Type', 'text/css'); return response.end(css.css) }
  if (url.pathname.endsWith('/content') && url.pathname.startsWith('/api/admin/mailbox/messages/')) {
    const content = url.pathname.includes('fixture-inbound-2') ? richFixture : null
    return json(response, { success: true, reason: 'Fixture original content', data: {
      html: content?.previewHtml || null, hasRemoteImages: content?.hasRemoteImages || false,
      omittedImages: content?.omittedImages || 0, inlineImageCount: content?.inlineImages.length || 0,
    } })
  }
  if (url.pathname === '/api/admin/mailbox') return json(response, { success: true, reason: 'Fixture list', data: {
    threads: [1, 2].map(number => { const items = messages.filter(message => message.threadKey === `fixture-thread-${number}`); const latest = items.at(-1); return { threadKey: latest.threadKey, subject: latest.subject, preview: latest.textBody.slice(0,100), latestAt: latest.sentAt, messageCount: items.length, participants: ['buyer@example.com'] } }),
    page: 1, totalPages: 1, total: 2, status,
  } })
  if (url.pathname.startsWith('/api/admin/mailbox/threads/')) { const selected = messages.filter(message => message.threadKey === url.pathname.split('/').at(-1)); return json(response, { success: true, reason: 'Fixture thread', data: { messages: selected, ownAddresses, defaultSender: status.defaultSender, total: selected.length, truncated: false } }) }
  if (url.pathname === '/api/admin/mailbox/sync') return json(response, { success: true, reason: 'Fixture sync', data: { imported: 0, skipped: 0, hasMore: false, lastSyncedAt: new Date().toISOString() } })
  if (url.pathname === '/api/admin/mailbox/reply') {
    if (request.method === 'GET') return json(response, { success: true, reason: 'Fixture status', data: attempts.get(url.searchParams.get('requestKey')) || { status: 'UNKNOWN' } })
    const chunks = []; for await (const chunk of request) chunks.push(chunk)
    const form = await new Response(Buffer.concat(chunks), { headers: { 'content-type': request.headers['content-type'] } }).formData()
    const key = form.get('requestKey'); const parent = messages.find(message => message.id === form.get('parentId'))
    if (String(form.get('text')).includes('[denied]')) {
      const reason = 'SMTP2GO 密钥没有此发信接口的调用权限。请更新服务器代码或检查密钥权限后再试。'
      attempts.set(key, { status: 'FAILED', errorCode: 'PROVIDER_PERMISSION_DENIED', reason, requestId: 'fixture-provider-request-001' })
      return json(response, { success: false, code: 'PROVIDER_REJECTED', reason }, 502)
    }
    if (String(form.get('text')).includes('[unknown]')) { attempts.set(key, { status: 'UNKNOWN' }); return json(response, { success: false, code: 'DELIVERY_UNKNOWN', reason: 'Simulated ambiguous result' }, 502) }
    attempts.set(key, { status: 'PENDING' })
    if (String(form.get('text')).includes('[delay]')) await new Promise(resolve => setTimeout(resolve, 15000))
    const recipients = field => String(form.get(field) || '').split(/[,;\n]/).map(address => address.trim()).filter(Boolean).map(address => ({ address }))
    const message = { ...parent, id: `fixture-outbound-${attempts.size}`, direction: 'OUTBOUND', from: { address: status.defaultSender }, replyTo: [], to: recipients('to'), cc: recipients('cc'), textBody: form.get('text'), attachments: [], sentAt: new Date().toISOString() }
    messages.push(message); attempts.set(key, { status: 'SENT', message })
    return json(response, { success: true, reason: 'Fixture accepted; nothing sent', data: { message } })
  }
  if (url.pathname.startsWith('/api/')) return json(response, { success: false, reason: 'Fixture only' }, 404)
  response.setHeader('Content-Type', 'text/html; charset=utf-8')
  response.end('<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Mailbox UI fixture</title><link rel="stylesheet" href="/style.css"></head><body style="font-family:Arial,sans-serif"><main id="root" style="max-width:1440px;margin:auto;padding:24px"></main><script src="/bundle.js"></script></body></html>')
})
server.listen(3127, '127.0.0.1', () => process.stdout.write('Mailbox UI fixture listening on http://127.0.0.1:3127 — no external mail services.\n'))
