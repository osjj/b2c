import type { MailboxMessage } from './types'

const MAX_QUOTED_CHARACTERS = 200000
const MAX_HISTORY_QUOTE_DEPTH = 4
const TRUNCATED_QUOTE_NOTICE = '[Earlier quoted content omitted due to size.]'
const TEXT_STYLE = 'white-space:pre-wrap;overflow-wrap:anywhere;word-wrap:break-word;word-break:break-word;'
const QUOTE_STYLE = 'margin:0 0 0 4px;padding:0 0 0 12px;border-left:2px solid #d1d5db;'

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

function normalizeLines(text: string): string {
  return text.replace(/\r\n?/g, '\n')
}

function htmlText(text: string): string {
  return escapeHtml(text).replace(/\n/g, '<br>')
}

function readableDate(sentAt: string): string {
  const date = new Date(sentAt)
  if (!Number.isFinite(date.getTime())) return 'an unknown date'
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Shanghai', weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(date)
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(value => value.type === type)?.value || ''
  return `${part('weekday')}, ${part('month')} ${part('day')}, ${part('year')} at ${part('hour')}:${part('minute')} (UTC+08:00)`
}

function quoteAttribution(parent: Pick<MailboxMessage, 'from' | 'sentAt'>): string {
  const address = parent.from.address.replace(/[\x00-\x1f\x7f]/g, ' ').trim()
  const name = parent.from.name?.replace(/[\x00-\x1f\x7f]/g, ' ').trim()
  const sender = name && name !== address ? `${name} <${address}>` : address
  return `On ${readableDate(parent.sentAt)}, ${sender} wrote:`
}

function quotedLine(line: string): { depth: number; text: string } {
  let depth = 0
  let offset = 0
  // Only interpret conventional quote prefixes. A comparison such as >100 stays text.
  while (line[offset] === '>' && (offset + 1 === line.length || /[> \t]/.test(line[offset + 1]))) {
    depth++
    offset++
    if (line[offset] === ' ' || line[offset] === '\t') offset++
  }
  return { depth: Math.min(depth, MAX_HISTORY_QUOTE_DEPTH), text: line.slice(offset) }
}

function quotedHtml(text: string): string {
  const output: string[] = []
  let depth = 0
  let lines: string[] = []
  const flush = () => {
    if (!lines.length) return
    output.push(`<div style="${TEXT_STYLE}">${lines.map(htmlText).join('<br>') || '<br>'}</div>`)
    lines = []
  }
  for (const line of text.split('\n')) {
    const quote = quotedLine(line)
    if (quote.depth !== depth) {
      flush()
      while (depth < quote.depth) { output.push(`<blockquote style="${QUOTE_STYLE}">`); depth++ }
      while (depth > quote.depth) { output.push('</blockquote>'); depth-- }
    }
    lines.push(quote.text)
  }
  flush()
  while (depth > 0) { output.push('</blockquote>'); depth-- }
  return output.join('')
}

/** Shared by outbound delivery and its sandboxed preview; imported mail is always plain text. */
export function buildReplyBodies(
  input: { text: string; includeQuote: boolean },
  parent: Pick<MailboxMessage, 'from' | 'sentAt' | 'textBody'>,
): { textBody: string; htmlBody: string } {
  const reply = normalizeLines(input.text)
  let textBody = reply
  let html = `<div style="${TEXT_STYLE}">${htmlText(reply)}</div>`
  if (input.includeQuote) {
    const original = normalizeLines(parent.textBody.slice(0, MAX_QUOTED_CHARACTERS))
    const quoted = parent.textBody.length > MAX_QUOTED_CHARACTERS ? `${original}\n${TRUNCATED_QUOTE_NOTICE}` : original
    const attribution = quoteAttribution(parent)
    textBody += `\n\n${attribution}\n${quoted.split('\n').map(line => `> ${line}`).join('\n')}`
    html += `<div style="margin-top:24px;margin-bottom:8px;color:#6b7280;${TEXT_STYLE}">${escapeHtml(attribution)}</div>`
    html += `<blockquote style="${QUOTE_STYLE}">${quotedHtml(quoted)}</blockquote>`
  }
  return {
    textBody,
    htmlBody: `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#1f2937;${TEXT_STYLE}">${html}</div>`,
  }
}
