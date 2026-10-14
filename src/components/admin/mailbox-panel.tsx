'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Inbox, Loader2, RefreshCw, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { MailboxMessage as Message } from '@/lib/mailbox/types'
import { formatMailboxDate, mailboxDetailSchema, mailboxErrorMessage, mailboxListSchema, mailboxRequest, mailboxSyncSchema, type MailboxDetailData, type MailboxListData } from './mailbox-client'
import { MailboxMessage } from './mailbox-message'
import { MailboxReplyForm, type MailboxDraftCache, type MailboxReplyFormHandle } from './mailbox-reply-form'

type SelectedReply = { parentId: string; mode: 'reply' | 'replyAll' }

export function MailboxPanel() {
  const [data, setData] = useState<MailboxListData | null>(null)
  const [listLoading, setListLoading] = useState(true)
  const [listError, setListError] = useState('')
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [listRevision, setListRevision] = useState(0)
  const [selectedThread, setSelectedThread] = useState<string | null>(null)
  const [detail, setDetail] = useState<{ threadKey: string; data: MailboxDetailData } | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState('')
  const [detailRevision, setDetailRevision] = useState(0)
  const [selectedReplies, setSelectedReplies] = useState<Record<string, SelectedReply>>({})
  const [draftCache] = useState<MailboxDraftCache>(() => new Map())
  const [since, setSince] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [syncNotice, setSyncNotice] = useState('')
  const [syncError, setSyncError] = useState('')
  const [hasMore, setHasMore] = useState(false)
  const syncBusy = useRef(false)
  const replyFormRef = useRef<MailboxReplyFormHandle>(null)
  const pendingReplySelection = useRef<SelectedReply | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      setListLoading(true)
      setListError('')
      try {
        const result = await mailboxRequest(`/api/admin/mailbox?${new URLSearchParams({ page: String(page), search })}`, mailboxListSchema, { signal: controller.signal })
        if (!controller.signal.aborted) {
          setData(result)
          // Reuse the server's stored backfill date on first load. Subsequent
          // refreshes must not replace a date the administrator has chosen.
          setSince((current) => current === null ? result.status.syncSince : current)
        }
      } catch (error) {
        if (!controller.signal.aborted) setListError(mailboxErrorMessage(error))
      } finally {
        if (!controller.signal.aborted) setListLoading(false)
      }
    }
    void load()
    return () => controller.abort()
  }, [page, search, listRevision])

  useEffect(() => {
    if (!selectedThread) return
    const threadKey = selectedThread
    const controller = new AbortController()
    async function load() {
      setDetailLoading(true)
      setDetailError('')
      try {
        const result = await mailboxRequest(`/api/admin/mailbox/threads/${encodeURIComponent(threadKey)}`, mailboxDetailSchema, { signal: controller.signal })
        if (!controller.signal.aborted) {
          setDetail({ threadKey, data: result })
          const parent = result.messages.findLast((message) => message.direction === 'INBOUND' && message.messageId)
          if (parent) setSelectedReplies((replies) => replies[threadKey] ? replies : {
            ...replies, [threadKey]: { parentId: parent.id, mode: 'reply' },
          })
        }
      } catch (error) {
        if (!controller.signal.aborted) setDetailError(mailboxErrorMessage(error))
      } finally {
        if (!controller.signal.aborted) setDetailLoading(false)
      }
    }
    void load()
    return () => controller.abort()
  }, [selectedThread, detailRevision])

  const handleSent = useCallback(() => {
    // Refresh whichever conversation is currently open. A response to another
    // conversation never replaces that conversation or its draft.
    setListRevision((revision) => revision + 1)
    setDetailRevision((revision) => revision + 1)
  }, [])

  async function sync() {
    if (syncBusy.current || !data?.status.configured || !since) return
    syncBusy.current = true
    setSyncing(true)
    setSyncError('')
    setSyncNotice('')
    try {
      const result = await mailboxRequest('/api/admin/mailbox/sync', mailboxSyncSchema, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ since }),
      })
      setHasMore(result.hasMore)
      setSyncNotice(`本批新增 ${result.imported} 封，跳过 ${result.skipped} 封。${result.hasMore ? '历史邮件尚未同步完成，可继续下一批。' : '当前历史范围已扫描完成。'}`)
      setListRevision((revision) => revision + 1)
      setDetailRevision((revision) => revision + 1)
    } catch (error) { setSyncError(mailboxErrorMessage(error)) }
    finally { syncBusy.current = false; setSyncing(false) }
  }

  function selectReply(message: Message, mode: 'reply' | 'replyAll') {
    if (!selectedThread) return
    if (replyParent?.id === message.id) replyFormRef.current?.selectMode(mode)
    else pendingReplySelection.current = { parentId: message.id, mode }
    setSelectedReplies((replies) => ({ ...replies, [selectedThread]: { parentId: message.id, mode } }))
    window.setTimeout(() => document.getElementById('mailbox-reply')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0)
  }

  const activeDetail = detail?.threadKey === selectedThread ? detail.data : null
  const selectedReply = selectedThread ? selectedReplies[selectedThread] : undefined
  const replyParent = activeDetail?.messages.find((message) => message.id === selectedReply?.parentId)
    || activeDetail?.messages.findLast((message) => message.direction === 'INBOUND' && message.messageId)
  const status = data?.status
  const connectReplyForm = useCallback((handle: MailboxReplyFormHandle | null) => {
    replyFormRef.current = handle
    const pendingSelection = pendingReplySelection.current
    if (handle && pendingSelection && pendingSelection.parentId === replyParent?.id) {
      pendingReplySelection.current = null
      handle.selectMode(pendingSelection.mode)
    }
  }, [replyParent?.id])

  return (
    <div className="min-w-0 space-y-5">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Inbox className="size-5" aria-hidden="true" />企业邮箱会话</CardTitle>
          <CardDescription>从 QQ 同步企业邮箱往来，在原邮件会话中回复。同步不会改变 QQ 邮件的已读状态。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {status && <div className="grid gap-3 rounded-lg bg-muted/50 p-3 text-xs sm:grid-cols-2 lg:grid-cols-4">
            <div><p className="text-muted-foreground">QQ 收信同步</p><p className="mt-1 font-medium">{status.configured ? '已配置' : '尚未配置'}</p>{status.account && <p className="mt-1 break-all">{status.account}</p>}</div>
            <div><p className="text-muted-foreground">关联企业邮箱</p><p className="mt-1 break-all">{status.aliases.join(', ') || '尚未设置'}</p></div>
            <div><p className="text-muted-foreground">回复发件人</p><p className="mt-1 break-all">{status.defaultSender}</p><p className="mt-1">{status.smtpConfigured ? '发信服务已配置' : '发信服务尚未配置'}</p></div>
            <div><p className="text-muted-foreground">最近同步</p><p className="mt-1">{status.lastSyncedAt ? `${formatMailboxDate(status.lastSyncedAt)}（北京时间）` : '尚未同步'}</p></div>
          </div>}
          {status && !status.configured && <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950" role="status"><p className="font-medium">需要先连接 QQ 邮箱</p><p className="mt-1">在 QQ 邮箱设置中开启 IMAP 服务，将邮箱账号和授权码配置到服务器，并指定需要同步的企业邮箱地址。请勿把授权码填写到邮件正文中。完成配置并重启服务后，点击刷新检查。</p></div>}
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-2"><Label htmlFor="mailbox-since">历史邮件开始日期</Label><Input id="mailbox-since" type="date" value={since ?? ''} max={new Date().toISOString().slice(0, 10)} disabled={syncing || !status} onChange={(event) => { setSince(event.target.value); setHasMore(false); setSyncNotice('') }} className="w-44" /></div>
            <Button type="button" onClick={() => void sync()} disabled={syncing || !status?.configured || !since}>{syncing ? <Loader2 className="animate-spin" aria-hidden="true" /> : <RefreshCw aria-hidden="true" />}{syncing ? '同步本批中…' : hasMore ? '继续同步下一批' : '同步邮件'}</Button>
            <Button type="button" variant="outline" disabled={listLoading} onClick={() => { setListRevision((revision) => revision + 1); setDetailRevision((revision) => revision + 1) }}>刷新列表</Button>
          </div>
          <p className="text-xs text-muted-foreground">首次默认查看最近 90 天，之后沿用上次同步的开始日期。每次同步一批，保留进度；历史较多时可继续同步，或稍后用相同日期恢复。只导入关联企业邮箱的邮件。</p>
          {syncNotice && <p role="status" className="text-sm">{syncNotice}</p>}
          {syncError && <p role="alert" className="text-sm text-destructive">{syncError}</p>}
          {listError && <p role="alert" className="text-sm text-destructive">{listError}</p>}
        </CardContent>
      </Card>

      <div className="grid min-w-0 items-start gap-5 xl:grid-cols-[minmax(17rem,0.75fr)_minmax(0,2fr)]">
        <section className="min-w-0 rounded-xl border bg-card" aria-label="邮件会话列表">
          <form className="flex gap-2 border-b p-3" onSubmit={(event) => { event.preventDefault(); setSearch(searchInput.trim()); setPage(1) }}>
            <Label htmlFor="mailbox-search" className="sr-only">搜索邮件主题或联系人</Label><Input id="mailbox-search" value={searchInput} maxLength={200} placeholder="搜索主题或联系人" onChange={(event) => setSearchInput(event.target.value)} />
            <Button type="submit" variant="outline" size="icon" aria-label="搜索会话"><Search className="size-4" /></Button>
          </form>
          {listLoading && <p className="flex items-center gap-2 p-4 text-sm text-muted-foreground" role="status"><Loader2 className="size-4 animate-spin" aria-hidden="true" />加载会话中…</p>}
          {!listLoading && data?.threads.length === 0 && <p className="p-5 text-sm text-muted-foreground">{search ? '没有找到匹配的会话。' : '暂无邮件。配置连接后，点击上方同步邮件。'}</p>}
          <ul className="max-h-[42rem] divide-y overflow-y-auto">
            {data?.threads.map((thread) => <li key={thread.threadKey}><button type="button" aria-pressed={selectedThread === thread.threadKey} className={`w-full min-w-0 space-y-2 p-4 text-left transition-colors hover:bg-muted/70 focus-visible:outline-2 focus-visible:outline-ring focus-visible:-outline-offset-2 ${selectedThread === thread.threadKey ? 'bg-muted' : ''}`} onClick={() => setSelectedThread(thread.threadKey)}>
              <div className="flex items-start justify-between gap-2"><span className="min-w-0 break-words text-sm font-medium [overflow-wrap:anywhere]">{thread.subject || '（无主题）'}</span><span className="shrink-0 rounded-full bg-background px-2 py-0.5 text-xs">{thread.messageCount}</span></div>
              <p className="truncate text-xs text-muted-foreground">{thread.participants.join(', ')}</p>
              <p className="line-clamp-2 break-words text-xs text-muted-foreground [overflow-wrap:anywhere]">{thread.preview}</p>
              <time className="block text-xs text-muted-foreground" dateTime={thread.latestAt}>{formatMailboxDate(thread.latestAt)}</time>
            </button></li>)}
          </ul>
          {data && data.total > 0 && <div className="flex items-center justify-between gap-2 border-t p-3"><Button type="button" size="icon-sm" variant="outline" disabled={listLoading || page <= 1} aria-label="上一页会话" onClick={() => setPage((current) => current - 1)}><ChevronLeft /></Button><p className="text-xs text-muted-foreground">第 {data.page} / {Math.max(1, data.totalPages)} 页 · {data.total} 个会话</p><Button type="button" size="icon-sm" variant="outline" disabled={listLoading || page >= data.totalPages} aria-label="下一页会话" onClick={() => setPage((current) => current + 1)}><ChevronRight /></Button></div>}
        </section>

        <section className="min-w-0 space-y-4" aria-label="当前邮件会话" aria-busy={detailLoading}>
          {!selectedThread && <div className="flex min-h-72 flex-col items-center justify-center rounded-xl border border-dashed p-6 text-center text-muted-foreground"><Inbox className="mb-3 size-8" aria-hidden="true" /><p>选择左侧会话，查看邮件往来并回复。</p><p className="mt-2 text-xs">邮件正文以纯文本显示；外部图片和跟踪像素不会加载。</p></div>}
          {detailLoading && <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status"><Loader2 className="size-4 animate-spin" aria-hidden="true" />正在加载邮件往来…</p>}
          {detailError && <div role="alert" className="rounded-xl border p-4"><p className="text-sm text-destructive">{detailError}</p><Button className="mt-2" type="button" variant="outline" size="sm" onClick={() => setDetailRevision((revision) => revision + 1)}>重新加载会话</Button></div>}
          {activeDetail && <>
            <div className="space-y-1"><h2 className="break-words text-lg font-semibold">{activeDetail.messages[0]?.subject || '邮件往来'}</h2><p className="text-xs text-muted-foreground">{activeDetail.total} 封邮件 · 安全纯文本预览</p></div>
            {activeDetail.truncated && <p role="status" className="rounded-lg border border-amber-300 p-3 text-sm">此会话邮件较多，目前只显示其中 {activeDetail.messages.length} 封。更早的内容请到 QQ 邮箱查看。</p>}
            {activeDetail.messages.map((message) => <MailboxMessage key={message.id} message={message} selected={message.id === replyParent?.id} onReply={selectReply} />)}
            {replyParent && <MailboxReplyForm key={replyParent.id} ref={connectReplyForm} parent={replyParent} initialMode={selectedReply?.mode || 'reply'} ownAddresses={activeDetail.ownAddresses} defaultSender={activeDetail.defaultSender} smtpConfigured={status?.smtpConfigured || false} cache={draftCache} onSent={handleSent} />}
            {!replyParent && <p className="rounded-xl border p-4 text-sm text-muted-foreground">当前会话中尚无可关联回复的来信。请继续同步包含原始 Message-ID 的历史来信。</p>}
          </>}
        </section>
      </div>
    </div>
  )
}
