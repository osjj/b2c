'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { deleteCommonQuotationProduct } from '@/actions/admin/common-quotation-products'
import { Button } from '@/components/ui/button'
import { useQuotationConfirm } from './use-quotation-confirm'

export function CommonProductDelete({ productId, productName, expectedUpdatedAt, returnToList = false }: {
  productId: string
  productName: string
  expectedUpdatedAt: string
  returnToList?: boolean
}) {
  const router = useRouter()
  const confirmation = useQuotationConfirm()
  const busyRef = useRef(false)
  const [pending, setPending] = useState(false)
  const [deleted, setDeleted] = useState(false)
  const [needsRefresh, setNeedsRefresh] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function remove() {
    if (busyRef.current) return
    busyRef.current = true
    setPending(true)
    setError('')
    setMessage('')
    let succeeded = false
    let requiresRefresh = false
    try {
      const result = await deleteCommonQuotationProduct({ id: productId, expectedUpdatedAt })
      if (!result.success) {
        requiresRefresh = result.code === 'INTERNAL_ERROR'
        setNeedsRefresh(requiresRefresh)
        setError(requiresRefresh ? '删除未完成，请刷新后确认产品状态再重试。' : result.reason)
        return
      }
      succeeded = true
      setDeleted(true)
      setMessage(result.reason)
      if (returnToList) router.push('/admin/quotation-products')
      router.refresh()
    } catch {
      requiresRefresh = true
      setNeedsRefresh(true)
      setError('未能确认删除结果，请刷新后检查产品状态再重试。')
    } finally {
      if (!succeeded && !requiresRefresh) busyRef.current = false
      setPending(false)
    }
  }

  function askToDelete() {
    if (busyRef.current) return
    confirmation.ask(
      '删除常用产品',
      `确认删除“${productName}”？删除后无法从常用产品列表恢复。已保存的报价内容和文件、商城商品及私有图片文件会保留。若已有报价行或成本记录引用，请在编辑页面取消“在常用产品选择器中显示”并保存来停用。`,
      () => { void remove() },
      'min-w-0 max-w-full break-all',
    )
  }

  return <div className="space-y-2">
    {confirmation.dialog}
    <Button type="button" variant="outline" className="min-h-11 border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800" aria-label={`删除常用产品“${productName}”`} disabled={pending || deleted || needsRefresh} onClick={askToDelete}>删除</Button>
    {pending && <p role="status" className="text-sm text-teal-800">正在删除，请勿重复操作…</p>}
    {message && <p role="status" className="text-sm text-teal-800">{message}</p>}
    {error && <div className="space-y-2"><p role="alert" className="max-w-sm text-sm text-red-700">{error}</p><Button type="button" variant="outline" className="min-h-11" disabled={pending} onClick={() => { if (needsRefresh) window.location.reload(); else router.refresh() }}>刷新页面</Button></div>}
  </div>
}
