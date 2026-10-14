'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { mailboxErrorMessage, mailboxRequest } from './mailbox-client'

export const mailboxRichContentSchema = z.object({
  html: z.string().nullable(),
  hasRemoteImages: z.boolean(),
  omittedImages: z.number().int().nonnegative(),
  inlineImageCount: z.number().int().nonnegative(),
})

type RichContent = z.infer<typeof mailboxRichContentSchema>
type ContentResult = { key: string; data?: RichContent; error?: string }

/** Keeps only this component's current message in memory, never in draft storage. */
export function useMailboxRichContent(messageId: string, enabled: boolean) {
  const [revision, setRevision] = useState(0)
  const [result, setResult] = useState<ContentResult | null>(null)
  const cached = useRef<ContentResult | null>(null)
  const key = `${messageId}:${revision}`

  useEffect(() => {
    if (!enabled || cached.current?.key === key) return
    const controller = new AbortController()
    let active = true
    let timedOut = false
    const timeout = window.setTimeout(() => { timedOut = true; controller.abort() }, 30000)
    void mailboxRequest(`/api/admin/mailbox/messages/${encodeURIComponent(messageId)}/content`, mailboxRichContentSchema, { signal: controller.signal })
      .then(data => {
        if (!active || controller.signal.aborted) return
        cached.current = { key, data }
        setResult(cached.current)
      })
      .catch((error: unknown) => {
        if (!active) return
        cached.current = { key, error: timedOut ? '原邮件样式加载超时，请重试。' : mailboxErrorMessage(error) }
        setResult(cached.current)
      })
      .finally(() => window.clearTimeout(timeout))
    return () => { active = false; controller.abort(); window.clearTimeout(timeout) }
  }, [enabled, key, messageId])

  const current = result?.key === key ? result : null
  return {
    data: current?.data,
    error: current?.error,
    loading: enabled && !current,
    retry: () => setRevision(value => value + 1),
  }
}

/** The body has already been sanitized by the server; the iframe adds isolation. */
export function mailboxRichDocument(html: string, showRemoteImages = false) {
  const imageSources = showRemoteImages ? 'data: https: http:' : 'data:'
  // Sandbox alone still permits navigation inside the frame. Preview links are inert;
  // the server-generated outbound message keeps its ordinary, usable links.
  const previewHtml = html.replace(/<a(?=[\s>])/gi, '<a inert')
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src ${imageSources}; base-uri 'none'; form-action 'none'"><style>html{color-scheme:light}body{margin:16px;background:#fff;color:#1f2937;font-family:Arial,Helvetica,sans-serif;overflow-wrap:anywhere}img{max-width:100%;height:auto}</style></head><body>${previewHtml}</body></html>`
}

export function MailboxRichFrame({ html, hasRemoteImages, omittedImages = 0, title }: {
  html: string
  hasRemoteImages: boolean
  omittedImages?: number
  title: string
}) {
  const [showRemoteImages, setShowRemoteImages] = useState(false)
  const document = useMemo(() => mailboxRichDocument(html, showRemoteImages), [html, showRemoteImages])
  return <div className="mt-3 space-y-2">
    {hasRemoteImages && <div className="flex flex-wrap items-center gap-2 rounded-md bg-muted/50 p-2 text-xs text-muted-foreground">
      <p>{showRemoteImages ? '已允许显示本封邮件的外部图片。' : '外部图片默认隐藏；显示后会连接发件方的图片服务器。'}</p>
      <Button type="button" variant="outline" size="sm" onClick={() => setShowRemoteImages(value => !value)}>{showRemoteImages ? '隐藏外部图片' : '显示外部图片'}</Button>
    </div>}
    {omittedImages > 0 && <p className="text-xs text-muted-foreground">有 {omittedImages} 张图片无法显示，其他正文和样式仍会保留。</p>}
    <iframe title={title} sandbox="" referrerPolicy="no-referrer" srcDoc={document} className="h-[32rem] w-full rounded border bg-white" />
  </div>
}

export function MailboxRichLoading({ error, onRetry }: { error?: string; onRetry: () => void }) {
  return error ? <div role="alert" className="mt-3 space-y-2 text-sm">
    <p>{error} 预览尚未完成。</p>
    <Button type="button" variant="outline" size="sm" onClick={onRetry}>重新加载原邮件样式</Button>
  </div> : <p role="status" className="mt-3 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" aria-hidden="true" />正在加载原邮件样式…</p>
}
