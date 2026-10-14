// Isolated UI fixture server. Never loads env, DB, IMAP or any sending service.
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { build } from 'esbuild'
import postcss from 'postcss'
import tailwind from '@tailwindcss/postcss'

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
  subject: 'Second conversation — fixture only', textBody: 'Second fixture conversation.', sentAt: '2026-10-13T00:00:00.000Z', attachments: [],
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
