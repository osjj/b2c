'use client'

import { useEffect, useImperativeHandle, useMemo, useRef, useState, useSyncExternalStore, type Ref } from 'react'
import { z } from 'zod'
import { Loader2, Paperclip, RefreshCw, Send, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { mailboxMessageSchema, type MailboxMessage } from '@/lib/mailbox/types'
import { buildReplyBodies } from '@/lib/mailbox/reply-body'
import { MailboxRequestError, formatMailboxDate, formatMailboxSize, mailboxAttemptSchema, mailboxErrorMessage, mailboxFailedAttemptNotice, mailboxReplyDraftSchema, mailboxRequest, replyRecipients } from './mailbox-client'
import { canApplyMailboxAttempt, subscribeMailboxDraft, writeMailboxDraft } from './mailbox-draft-cache'

type SavedDraft = z.infer<typeof mailboxReplyDraftSchema>
export type MailboxReplyDraft = SavedDraft & { attachments: File[]; missingAttachments: boolean }
export type MailboxDraftCache = Map<string, MailboxReplyDraft>

interface MailboxReplyFormProps {
  ref?: Ref<MailboxReplyFormHandle>
  parent: MailboxMessage
  initialMode: 'reply' | 'replyAll'
  ownAddresses: string[]
  defaultSender: string
  smtpConfigured: boolean
  cache: MailboxDraftCache
  onSent: (message: MailboxMessage) => void
}

export interface MailboxReplyFormHandle {
  selectMode: (mode: 'reply' | 'replyAll') => void
}

const replySchema = z.object({ message: mailboxMessageSchema, requestId: z.string().optional() })
const storageKey = (parentId: string) => `admin-mailbox-reply:${parentId}`

function saveDraft(draft: MailboxReplyDraft) {
  const { attachments, missingAttachments, ...saved } = draft
  sessionStorage.setItem(storageKey(draft.parentId), JSON.stringify({
    ...saved,
    attachmentNames: missingAttachments ? draft.attachmentNames : attachments.map((file) => file.name),
  }))
}

function initialDraft(props: MailboxReplyFormProps): MailboxReplyDraft {
  const cached = props.cache.get(props.parent.id)
  if (cached) return cached
  try {
    const parsed = mailboxReplyDraftSchema.safeParse(JSON.parse(sessionStorage.getItem(storageKey(props.parent.id)) || 'null'))
    if (parsed.success && parsed.data.parentId === props.parent.id) {
      const draft: MailboxReplyDraft = {
        ...parsed.data, attachments: [], missingAttachments: parsed.data.attachmentNames.length > 0,
        status: parsed.data.status === 'sending' ? 'unknown' : parsed.data.status,
      }
      props.cache.set(props.parent.id, draft)
      return draft
    }
  } catch { /* A disabled browser store is reported before any sending. */ }
  const draft: MailboxReplyDraft = {
    parentId: props.parent.id, mode: props.initialMode,
    ...replyRecipients(props.parent, props.ownAddresses, props.initialMode),
    text: '', includeQuote: true, requestKey: crypto.randomUUID(), status: 'draft', notice: '',
    attachmentNames: [], attachments: [], missingAttachments: false,
  }
  props.cache.set(props.parent.id, draft)
  return draft
}

export function MailboxReplyForm(props: MailboxReplyFormProps) {
  const { parent, ownAddresses, defaultSender, smtpConfigured, cache, onSent, ref } = props
  const [initialSnapshot] = useState(() => initialDraft(props))
  const draft = useSyncExternalStore(
    (listener) => subscribeMailboxDraft(cache, parent.id, listener),
    () => cache.get(parent.id) || initialSnapshot,
    () => initialSnapshot,
  )
  const [storageError, setStorageError] = useState('')
  const [checking, setChecking] = useState(false)
  const [sendingHere, setSendingHere] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const previewHtml = useMemo(() => {
    if (!previewOpen) return ''
    const { htmlBody } = buildReplyBodies({ text: draft.text.trim(), includeQuote: draft.includeQuote }, parent)
    return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"></head><body style="margin:16px;background:#fff">${htmlBody}</body></html>`
  }, [previewOpen, draft.text, draft.includeQuote, parent])
  const requestBusy = useRef(false)
  const fileInput = useRef<HTMLInputElement>(null)
  const blocked = draft.status !== 'draft'
  const pending = draft.status === 'sending'
  const id = `reply-${parent.id}`

  function update(next: MailboxReplyDraft) {
    writeMailboxDraft(cache, parent.id, next)
    try { saveDraft(next); setStorageError('') } catch {
      setStorageError('浏览器无法保存此草稿。请允许此网站使用会话存储后再发送；附件刷新后需重新选择。')
    }
  }

  function updateAttempt(next: MailboxReplyDraft) {
    if (!canApplyMailboxAttempt(cache.get(parent.id), next)) return
    update(next)
  }

  useEffect(() => {
    const preventLoss = (event: BeforeUnloadEvent) => {
      if (draft.status !== 'sent' && (draft.text || draft.attachments.length || draft.status === 'sending')) {
        event.preventDefault()
        event.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', preventLoss)
    return () => window.removeEventListener('beforeunload', preventLoss)
  }, [draft.text, draft.attachments.length, draft.status])

  function changeMode(mode: 'reply' | 'replyAll') {
    update({ ...draft, mode, ...replyRecipients(parent, ownAddresses, mode), notice: '' })
  }

  useImperativeHandle(ref, () => ({
    selectMode(mode) {
      if (!blocked && draft.mode !== mode) changeMode(mode)
    },
  }))

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (requestBusy.current || blocked || !draft.text.trim() || !draft.to.trim()) return
    if (draft.missingAttachments) return
    const sending: MailboxReplyDraft = { ...draft, status: 'sending', notice: '', errorCode: undefined, providerRequestId: undefined }
    // Persist the same request key before the request leaves the browser. An uncertain
    // network result never creates another key or repeats the send automatically.
    try { saveDraft(sending) } catch {
      setStorageError('无法保存发送标识，发送已停止。请允许此网站使用会话存储后重试。')
      return
    }
    requestBusy.current = true
    setSendingHere(true)
    update(sending)
    const formData = new FormData()
    formData.set('parentId', parent.id)
    formData.set('mode', draft.mode)
    formData.set('to', draft.to)
    formData.set('cc', draft.cc)
    formData.set('text', draft.text)
    formData.set('includeQuote', String(draft.includeQuote))
    formData.set('requestKey', draft.requestKey)
    draft.attachments.forEach((file) => formData.append('attachments', file))
    try {
      const result = await mailboxRequest('/api/admin/mailbox/reply', replySchema, { method: 'POST', body: formData, signal: AbortSignal.timeout(120000) })
      updateAttempt({ ...sending, status: 'sent', notice: '邮件服务已接受回复，已加入当前会话。', providerRequestId: result.requestId, attachments: [], attachmentNames: [] })
      onSent(result.message)
    } catch (error) {
      const definitelyFailed = error instanceof MailboxRequestError &&
        (error.code === 'PROVIDER_REJECTED' || error.code === 'SEND_ALREADY_FAILED')
      const inputError = error instanceof MailboxRequestError && error.status !== undefined &&
        [400, 401, 403, 404, 413, 422].includes(error.status)
      updateAttempt({
        ...sending,
        status: definitelyFailed ? 'failed' : inputError ? 'draft' : 'unknown',
        errorCode: error instanceof MailboxRequestError ? error.code : undefined,
        notice: inputError || definitelyFailed ? mailboxErrorMessage(error) : '发送结果尚未确认。为避免重复发送，此草稿已锁定；请查询发送状态并核对邮件服务记录。',
      })
    } finally { requestBusy.current = false; setSendingHere(false) }
  }

  async function checkStatus() {
    if (checking || requestBusy.current) return
    setChecking(true)
    try {
      const result = await mailboxRequest(`/api/admin/mailbox/reply?requestKey=${encodeURIComponent(draft.requestKey)}`, mailboxAttemptSchema)
      const diagnostics = { providerRequestId: result.requestId || draft.providerRequestId, errorCode: result.errorCode }
      if (result.status === 'SENT' && result.message) {
        updateAttempt({ ...draft, ...diagnostics, status: 'sent', notice: '已确认：邮件服务已接受回复，已加入当前会话。', attachments: [], attachmentNames: [], missingAttachments: false })
        onSent(result.message)
      } else if (result.status === 'FAILED') {
        updateAttempt({ ...draft, ...diagnostics, status: 'failed', notice: mailboxFailedAttemptNotice(result) })
      } else {
        updateAttempt({ ...draft, ...diagnostics, status: 'unknown', notice: result.status === 'PENDING' ? '服务器仍在处理，请稍后再次查询。请勿通过其他入口重复发送。' : '仍无法确认是否已发送。请核对邮件服务记录后处理，当前草稿保持锁定。' })
      }
    } catch (error) {
      updateAttempt({ ...draft, notice: `${mailboxErrorMessage(error)} 当前发送锁定状态保持不变。` })
    } finally { setChecking(false) }
  }

  function addFiles(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || [])
    event.target.value = ''
    const attachments = [...draft.attachments, ...files]
    if (attachments.length > 5 || attachments.reduce((sum, file) => sum + file.size, 0) > 25 * 1024 * 1024) {
      update({ ...draft, notice: '最多 5 个附件，总大小不能超过 25 MB。此次选择未添加。' })
      return
    }
    update({ ...draft, attachments, attachmentNames: attachments.map((file) => file.name), missingAttachments: false, notice: '' })
  }

  return (
    <form id="mailbox-reply" onSubmit={submit} className="min-w-0 space-y-4 rounded-xl border bg-card p-4 sm:p-5">
      <div>
        <h3 className="font-semibold">回复原邮件</h3>
        <p className="mt-1 break-words text-xs text-muted-foreground">关联：{parent.subject || '（无主题）'} · {formatMailboxDate(parent.sentAt)}</p>
        <p className="mt-1 break-all text-xs text-muted-foreground">发件人：{defaultSender} · 发出的回复保存到本后台，不会写入 QQ「已发送」。</p>
      </div>
      <fieldset disabled={blocked} className="min-w-0 space-y-4 disabled:opacity-70">
        <div className="flex flex-wrap gap-3">
          <label className="flex items-center gap-2 text-sm"><input type="radio" name={`${id}-mode`} checked={draft.mode === 'reply'} onChange={() => changeMode('reply')} />回复</label>
          <label className="flex items-center gap-2 text-sm"><input type="radio" name={`${id}-mode`} checked={draft.mode === 'replyAll'} onChange={() => changeMode('replyAll')} />回复全部</label>
          <span className="text-xs text-muted-foreground">切换模式会按原邮件重置下方收件人。</span>
        </div>
        <div className="space-y-2"><Label htmlFor={`${id}-to`}>收件人</Label><Input id={`${id}-to`} value={draft.to} onChange={(event) => update({ ...draft, to: event.target.value })} required maxLength={5000} placeholder="name@example.com, another@example.com" /><p className="text-xs text-muted-foreground">多个邮箱用逗号分隔。发送前请核对收件人和抄送。</p></div>
        <div className="space-y-2"><Label htmlFor={`${id}-cc`}>抄送</Label><Input id={`${id}-cc`} value={draft.cc} onChange={(event) => update({ ...draft, cc: event.target.value })} maxLength={5000} placeholder="可选" /></div>
        <div className="space-y-2"><Label htmlFor={`${id}-text`}>本次回复正文</Label><Textarea id={`${id}-text`} rows={8} value={draft.text} onChange={(event) => update({ ...draft, text: event.target.value })} required maxLength={100000} placeholder="直接输入本次回复，原邮件内容可在下方引用。" /></div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.includeQuote} onChange={(event) => update({ ...draft, includeQuote: event.target.checked })} />在回复下方引用原邮件正文</label>
        {draft.includeQuote && <details className="rounded-md bg-muted/50 p-3 text-xs"><summary className="cursor-pointer text-muted-foreground">预览引用的原文（不属于本次新写的内容）</summary><blockquote className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words border-l-2 pl-3 [overflow-wrap:anywhere]">{parent.textBody || '原邮件无文本正文。'}</blockquote></details>}
        <div className="space-y-2">
          <Label htmlFor={`${id}-files`}>添加附件（最多 5 个，共 25 MB）</Label>
          <Input ref={fileInput} id={`${id}-files`} type="file" multiple onChange={addFiles} />
          <p className="text-xs text-muted-foreground">邮件编码会增加体积；较大的附件建议合计控制在约 18 MB 以内。</p>
          {draft.attachments.length > 0 && <ul className="space-y-1">{draft.attachments.map((file, index) => <li key={`${file.name}-${index}`} className="flex items-center gap-2 text-xs"><Paperclip className="size-3 shrink-0" aria-hidden="true" /><span className="min-w-0 truncate">{file.name}</span><span className="shrink-0 text-muted-foreground">{formatMailboxSize(file.size)}</span><Button type="button" size="icon-sm" variant="ghost" aria-label={`移除附件 ${file.name}`} onClick={() => { const attachments = draft.attachments.filter((_, fileIndex) => fileIndex !== index); update({ ...draft, attachments, attachmentNames: attachments.map((item) => item.name) }) }}><X className="size-3" /></Button></li>)}</ul>}
          {draft.missingAttachments && <div role="alert" className="rounded-md border border-amber-300 p-3 text-xs"><p>刷新前选择的附件需要重新添加：{draft.attachmentNames.join('、')}</p><Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => update({ ...draft, missingAttachments: false, attachmentNames: [] })}>确认不再附加这些文件</Button></div>}
        </div>
      </fieldset>
      {draft.status !== 'sent' && <details className="rounded-md border p-3" onToggle={(event) => setPreviewOpen(event.currentTarget.open)}>
        <summary className="cursor-pointer text-sm font-medium">预览发送后的邮件排版</summary>
        <p className="mt-2 text-xs text-muted-foreground">正文和引用按下方排版发送，附件单独附加。不同邮箱的字体和间距可能略有差异。</p>
        {previewOpen && <iframe title="邮件正文排版预览" sandbox="" referrerPolicy="no-referrer" srcDoc={previewHtml} className="mt-3 h-96 w-full rounded border bg-white" />}
      </details>}
      {storageError && <p role="alert" className="text-sm text-destructive">{storageError}</p>}
      {draft.notice && <p role={draft.status === 'sent' ? 'status' : 'alert'} className={`rounded-md border p-3 text-sm ${draft.status === 'sent' ? 'border-green-300 bg-green-50 text-green-900' : 'border-amber-300 bg-amber-50 text-amber-950'}`}>{draft.notice}</p>}
      {draft.status !== 'draft' && <details className="rounded-md border p-3 text-xs text-muted-foreground"><summary className="cursor-pointer">发送诊断信息</summary><dl className="mt-2 grid min-w-0 gap-1"><dt>本次发送编号</dt><dd className="break-all font-mono">{draft.requestKey}</dd>{draft.providerRequestId && <><dt className="mt-1">邮件服务请求编号</dt><dd className="break-all font-mono">{draft.providerRequestId}</dd></>}{draft.errorCode && <><dt className="mt-1">错误代码</dt><dd className="break-all font-mono">{draft.errorCode}</dd></>}</dl></details>}
      {!smtpConfigured && <p role="alert" className="text-sm text-destructive">发信服务尚未配置，当前可以阅读和保存草稿。</p>}
      <div className="flex flex-wrap items-center gap-2">
        {draft.status === 'draft' || pending ? <Button type="submit" disabled={pending || !smtpConfigured || !parent.messageId || draft.missingAttachments || !draft.text.trim() || !draft.to.trim()}>{pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Send aria-hidden="true" />}{pending ? '正在发送…' : '发送回复'}</Button> : null}
        {(draft.status === 'unknown' || draft.status === 'failed' || pending) && <Button type="button" variant="outline" disabled={checking || sendingHere} onClick={() => void checkStatus()}><RefreshCw className={checking ? 'animate-spin' : ''} aria-hidden="true" />{checking ? '查询中…' : draft.status === 'failed' ? '查询失败原因' : '查询发送状态'}</Button>}
        {draft.status === 'failed' && <Button type="button" variant="outline" disabled={checking} onClick={() => update({ ...draft, status: 'draft', requestKey: crypto.randomUUID(), notice: '', errorCode: undefined, providerRequestId: undefined })}>保留草稿，新建发送尝试</Button>}
        {draft.status === 'sent' && <Button type="button" variant="outline" onClick={() => update({ ...draft, text: '', status: 'draft', requestKey: crypto.randomUUID(), notice: '', errorCode: undefined, providerRequestId: undefined, attachments: [], attachmentNames: [], missingAttachments: false })}>撰写另一封回复</Button>}
        <p className="text-xs text-muted-foreground">草稿保存在当前浏览器会话；附件刷新后需重新选择。</p>
      </div>
    </form>
  )
}
