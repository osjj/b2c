'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { z } from 'zod'
import { saveCommonProductImages } from '@/actions/admin/common-quotation-products'
import { reimportCommonProductImages } from '@/actions/admin/quotation-catalog'
import { SimpleImagePicker } from './simple-image-picker'
import { Button } from '@/components/ui/button'
import type { SimpleImage } from '@/lib/quotation/simple-input'
import { useQuotationConfirm } from './use-quotation-confirm'

const reimportResultSchema = z.object({ id: z.string().cuid(), updatedAt: z.string().datetime(), images: z.array(z.object({ id: z.string().uuid(), kind: z.literal('source'), name: z.string() })).min(1).max(8) })
const failureStatusSchema = z.object({ code: z.string(), reason: z.string().min(1), outcomeUnknown: z.boolean().optional() })

export function CommonProductImages({ productId, updatedAt, images, catalogLinked = false }: { productId: string; updatedAt: string; images: SimpleImage[]; catalogLinked?: boolean }) {
  const [value, setValue] = useState(images)
  const [expectedUpdatedAt, setExpectedUpdatedAt] = useState(updatedAt)
  const [receivedUpdatedAt, setReceivedUpdatedAt] = useState(updatedAt)
  const [uploading, setUploading] = useState(false)
  const uploadBusyRef = useRef(false)
  const actionBusyRef = useRef(false)
  const slowNoticeRef = useRef(false)
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState('')
  const [failed, setFailed] = useState(false)
  const [needsStateCheck, setNeedsStateCheck] = useState(false)
  const [operation, setOperation] = useState<'save' | 'reimport'>('save')
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const router = useRouter()
  const confirmation = useQuotationConfirm()
  const locked = pending || needsStateCheck
  // Keep feedback across route refreshes while accepting a new server image/version snapshot.
  if (receivedUpdatedAt !== updatedAt) {
    setReceivedUpdatedAt(updatedAt); setExpectedUpdatedAt(updatedAt); setValue(images)
  }
  useEffect(() => {
    if (startedAt === null) return
    const timer = window.setInterval(() => {
      const seconds = Math.floor((Date.now() - startedAt) / 1000)
      setElapsed(seconds)
      if (seconds >= 90 && !slowNoticeRef.current) {
        slowNoticeRef.current = true; setNeedsStateCheck(true); setFailed(true)
        setMessage('等待服务器响应已超过 90 秒，尚未确认图片保存结果。请先刷新查看当前产品图片，确认状态后再继续；不要重复提交。')
      }
    }, 1000)
    return () => window.clearInterval(timer)
  }, [startedAt])

  function runAction(nextOperation: 'save' | 'reimport') {
    if (uploadBusyRef.current || actionBusyRef.current || needsStateCheck) return
    actionBusyRef.current = true
    slowNoticeRef.current = false
    setOperation(nextOperation); setMessage(''); setFailed(false); setElapsed(0); setStartedAt(Date.now())
    startTransition(async () => {
      let keepLocked = false
      try {
        const result = nextOperation === 'reimport'
          ? await reimportCommonProductImages({ id: productId, updatedAt: expectedUpdatedAt })
          : await saveCommonProductImages({ id: productId, updatedAt: expectedUpdatedAt, sourceIds: value.map((image) => image.id) })
        if (!result.success) {
          const status = failureStatusSchema.parse(result)
          const uncertain = status.outcomeUnknown ?? (status.code === 'INTERNAL_ERROR')
          setNeedsStateCheck(uncertain)
          if (uncertain) keepLocked = true
          setMessage(uncertain ? `${status.reason} 请先刷新查看当前产品图片，确认保存结果后再继续。` : status.reason)
          setFailed(true); return
        }
        const reason = z.string().min(1).parse(result.reason)
        if (nextOperation === 'reimport') {
          const data = reimportResultSchema.parse(result.data)
          if (data.id !== productId) throw new Error('Unexpected product')
          setValue(data.images); setExpectedUpdatedAt(data.updatedAt)
        }
        setNeedsStateCheck(false); setFailed(false); setMessage(reason)
        try { router.refresh() }
        catch {
          keepLocked = true; setNeedsStateCheck(true)
          setMessage(`${reason} 页面刷新失败，请刷新查看当前产品后再继续。`)
        }
      } catch {
        keepLocked = true; setNeedsStateCheck(true); setFailed(true)
        setMessage('未能确认图片保存结果，可能是连接中断或服务器响应异常。请先刷新查看当前产品图片，确认结果后再继续操作。')
      } finally {
        if (!keepLocked) actionBusyRef.current = false
        setStartedAt(null)
      }
    })
  }
  return <section aria-busy={pending} className="min-w-0 space-y-5 rounded-2xl border bg-white p-6">
    {confirmation.dialog}
    <div><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-semibold">常用产品图片</h2><Button type="button" variant="outline" disabled={!catalogLinked || locked || uploading} onClick={() => {
      if (uploadBusyRef.current || actionBusyRef.current || needsStateCheck) return
      confirmation.ask('重新导入商品主图', '将用关联商城商品的当前主图替换此图片组（包括尚未保存的图片选择和顺序），并立即保存。产品资料和已有报价文件保持不变。', () => runAction('reimport'))
    }}>重新导入商品主图</Button></div><p className="mt-1 text-sm text-slate-500">点击图片可放大查看；拖动图片调整顺序，也可用前移、后移按钮；添加或调整后点击“保存图片”。</p>{!catalogLinked && <p className="mt-1 text-xs text-slate-500">此常用产品未关联商城商品，无法重新导入商品主图。</p>}</div>
    <SimpleImagePicker sortable pasteAndDrop preview compressImages images={value} onChange={setValue} onBusy={(busy) => { uploadBusyRef.current = busy; setUploading(busy) }} disabled={locked} />
    <Button type="button" disabled={locked || uploading} variant="outline" onClick={() => runAction('save')}>保存图片</Button>
    {pending && <p role="status" className="text-sm text-teal-800">{operation === 'reimport' ? '正在重新导入商品主图' : '正在保存图片'}，已等待 {elapsed} 秒，请勿重复操作…</p>}
    {message && <p role={failed ? 'alert' : 'status'} className={`break-words text-sm [overflow-wrap:anywhere] ${failed ? 'text-red-700' : ''}`}>{message}</p>}
    {needsStateCheck && <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" onClick={() => window.location.reload()}>刷新查看当前产品</Button><Button asChild type="button" variant="outline"><Link href="/admin/quotation-products">查看常用产品列表</Link></Button></div>}
  </section>
}
