import { Download, Reply, ReplyAll } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { MailboxMessage as Message } from '@/lib/mailbox/types'
import { formatMailboxAddress, formatMailboxDate, formatMailboxSize } from './mailbox-client'

interface MailboxMessageProps {
  message: Message
  selected: boolean
  onReply: (message: Message, mode: 'reply' | 'replyAll') => void
}

export function MailboxMessage({ message, selected, onReply }: MailboxMessageProps) {
  return (
    <article className={`min-w-0 rounded-xl border p-4 ${selected ? 'border-primary/50 bg-primary/5' : 'bg-card'}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <p className="break-all font-medium">{formatMailboxAddress(message.from)}</p>
          <p className="text-xs text-muted-foreground"><time dateTime={message.sentAt}>{formatMailboxDate(message.sentAt)}（北京时间）</time></p>
        </div>
        <Badge variant={message.direction === 'OUTBOUND' ? 'secondary' : 'outline'}>
          {message.direction === 'OUTBOUND' ? '已发邮件' : '收到的邮件'}
        </Badge>
      </div>
      <dl className="mt-3 space-y-1 break-all text-xs text-muted-foreground">
        <div><dt className="inline font-medium">收件人：</dt><dd className="inline">{message.to.map(formatMailboxAddress).join(', ') || '未提供'}</dd></div>
        {message.cc.length > 0 && <div><dt className="inline font-medium">抄送：</dt><dd className="inline">{message.cc.map(formatMailboxAddress).join(', ')}</dd></div>}
        {message.replyTo.length > 0 && <div><dt className="inline font-medium">回复地址：</dt><dd className="inline">{message.replyTo.map(formatMailboxAddress).join(', ')}</dd></div>}
      </dl>
      <h3 className="mt-3 break-words text-sm font-medium">{message.subject || '（无主题）'}</h3>
      <details className="mt-3" open>
        <summary className="cursor-pointer text-xs text-muted-foreground">邮件正文（纯文本）</summary>
        <div dir="auto" className="mt-2 max-h-[32rem] overflow-auto whitespace-pre-wrap break-words text-sm leading-relaxed [overflow-wrap:anywhere]">
          {message.textBody || '这封邮件没有可显示的文本正文。'}
        </div>
      </details>
      {message.attachments.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-2" aria-label="邮件附件">
          {message.attachments.map((attachment) => (
            <li key={attachment.index} className="max-w-full">
              <a className="inline-flex max-w-full items-center gap-2 rounded-md border bg-background px-3 py-2 text-xs hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
                href={`/api/admin/mailbox/messages/${encodeURIComponent(message.id)}/attachments/${attachment.index}`} download>
                <Download className="size-3 shrink-0" aria-hidden="true" />
                <span className="truncate">{attachment.filename}</span>
                <span className="shrink-0 text-muted-foreground">{formatMailboxSize(attachment.size)}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
      {message.direction === 'INBOUND' && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" disabled={!message.messageId} onClick={() => onReply(message, 'reply')}><Reply aria-hidden="true" />回复此邮件</Button>
          <Button type="button" variant="outline" size="sm" disabled={!message.messageId} onClick={() => onReply(message, 'replyAll')}><ReplyAll aria-hidden="true" />回复全部</Button>
          {!message.messageId && <p className="text-xs text-muted-foreground">原邮件缺少 Message-ID，无法关联回复。</p>}
        </div>
      )}
    </article>
  )
}
