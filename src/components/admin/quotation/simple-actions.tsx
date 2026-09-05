'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { z } from 'zod'
import { copySimpleQuotation } from '@/actions/admin/sales-quotations'
import { Button } from '@/components/ui/button'
import { useQuotationConfirm } from './use-quotation-confirm'

export function SimpleQuotationActions({ revisionId, version, state }: { revisionId: string; version: number; state: string }) {
  const router = useRouter()
  const confirmation = useQuotationConfirm()
  const [busy, startTransition] = useTransition()
  const [error, setError] = useState('')
  function copy(newNumber: boolean, confirmed = false) {
    if (!confirmed) { confirmation.ask(newNumber ? '复制为新报价' : '创建修订版', newNumber ? '复制当前已保存的内容，分配新的报价编号。未保存的修改不包括在内。' : '原正式文件保持不变，创建可编辑的新修订草稿。', () => copy(newNumber, true)); return }
    startTransition(async () => {
      setError('')
      try {
        const result = await copySimpleQuotation({ revisionId, expectedVersion: version, newNumber })
        if (!result.success) { setError(result.reason); return }
        const data = z.object({ quotationId: z.string(), revisionId: z.string() }).parse(result.data)
        router.push(`/admin/sales-quotations/${data.quotationId}?revision=${data.revisionId}`); router.refresh()
      } catch { setError('复制失败，请刷新后重试') }
    })
  }
  return <div className="space-y-2">{confirmation.dialog}<div className="flex flex-wrap gap-2"><Button variant="outline" disabled={busy || state === 'FINALIZING'} onClick={() => copy(true)}>复制为新报价</Button>{['FINALIZED', 'ISSUED', 'SUPERSEDED'].includes(state) && <Button disabled={busy} onClick={() => copy(false)}>创建修订版</Button>}{state === 'FINALIZING' && <Button variant="secondary" onClick={() => router.refresh()}>刷新生成状态</Button>}</div>{error && <div className="space-y-2"><p role="alert" className="max-w-sm text-sm text-red-700">{error}</p><Button variant="outline" disabled={busy} onClick={() => router.refresh()}>刷新页面</Button></div>}</div>
}
