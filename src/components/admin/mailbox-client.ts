import { z } from 'zod'
import {
  mailboxMessageSchema,
  mailboxStatusSchema,
  mailboxThreadSchema,
  type MailboxAddress,
  type MailboxMessage,
} from '@/lib/mailbox/types'

export const mailboxListSchema = z.object({
  threads: z.array(mailboxThreadSchema),
  page: z.number(),
  totalPages: z.number(),
  total: z.number(),
  status: mailboxStatusSchema,
})

export const mailboxDetailSchema = z.object({
  messages: z.array(mailboxMessageSchema),
  ownAddresses: z.array(z.string()),
  defaultSender: z.string(),
  truncated: z.boolean(),
  total: z.number(),
})

export const mailboxSyncSchema = z.object({
  imported: z.number(),
  skipped: z.number(),
  hasMore: z.boolean(),
  lastSyncedAt: z.string(),
})

export type MailboxListData = z.infer<typeof mailboxListSchema>
export type MailboxDetailData = z.infer<typeof mailboxDetailSchema>

export class MailboxRequestError extends Error {
  constructor(message: string, public code?: string, public status?: number) {
    super(message)
    this.name = 'MailboxRequestError'
  }
}

export async function mailboxRequest<T>(
  url: string,
  schema: z.ZodType<T>,
  init?: RequestInit,
): Promise<T> {
  const headers = new Headers(init?.headers)
  if (init?.method && !['GET', 'HEAD'].includes(init.method.toUpperCase())) headers.set('X-Mailbox-Request', '1')
  const response = await fetch(url, { cache: 'no-store', ...init, headers })
  const body: unknown = await response.json()
  const envelope = z.object({
    success: z.boolean(),
    reason: z.string(),
    code: z.string().optional(),
    data: z.unknown().optional(),
  }).safeParse(body)
  if (!envelope.success) throw new MailboxRequestError('服务器响应无法识别，请刷新后查看。')
  if (!response.ok || !envelope.data.success) {
    throw new MailboxRequestError(envelope.data.reason, envelope.data.code, response.status)
  }
  const result = schema.safeParse(envelope.data.data)
  if (!result.success) throw new MailboxRequestError('邮件数据格式不完整，请刷新后查看。')
  return result.data
}

export function mailboxErrorMessage(error: unknown) {
  return error instanceof MailboxRequestError ? error.message : '连接失败，请检查网络后重试。'
}

export function formatMailboxDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Shanghai',
  }).format(date)
}

export function formatMailboxSize(bytes: number) {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`
}

export function formatMailboxAddress(address: MailboxAddress) {
  return address.name ? `${address.name} <${address.address}>` : address.address
}

export function replyRecipients(parent: MailboxMessage, ownAddresses: string[], mode: 'reply' | 'replyAll') {
  const excluded = new Set(ownAddresses.map((address) => address.toLowerCase()))
  const take = (addresses: MailboxAddress[]) => addresses.filter(({ address }) => {
    const normalized = address.toLowerCase()
    if (excluded.has(normalized) || /^srs[01][=+-]/i.test(normalized)) return false
    excluded.add(normalized)
    return true
  }).map(({ address }) => address)
  const primary = parent.replyTo.length ? parent.replyTo : [parent.from]
  const to = take(mode === 'replyAll' ? [...primary, ...parent.to] : primary)
  const cc = mode === 'replyAll' ? take(parent.cc) : []
  return { to: to.join(', '), cc: cc.join(', ') }
}
