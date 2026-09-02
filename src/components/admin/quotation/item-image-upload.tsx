'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ImagePlus } from 'lucide-react'
import { toast } from 'sonner'

import { attachSalesQuotationItemAsset } from '@/actions/admin/sales-quotations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function ItemImageUpload({ itemId, salesQuotationId, expectedVersion, disabled }: {
  itemId: string
  salesQuotationId: string
  expectedVersion: number
  disabled?: boolean
}) {
  const [file, setFile] = useState<File | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const upload = () => {
    if (!file) { toast.error('Choose a PNG or JPEG image first'); return }
    startTransition(async () => {
      const form = new FormData()
      form.set('file', file)
      form.set('salesQuotationId', salesQuotationId)
      const response = await fetch('/api/admin/quotation-files/upload', { method: 'POST', body: form })
      const body: unknown = await response.json().catch(() => null)
      const sourceFileId = sourceFileIdFromUpload(body)
      if (!response.ok || !sourceFileId) {
        toast.error(actionReason(body) ?? 'Private image upload failed')
        return
      }
      const result = await attachSalesQuotationItemAsset({
        itemId,
        sourceFileId,
        expectedVersion,
        assetType: 'PRODUCT_IMAGE',
        sortOrder: 0,
      })
      if (result.success === false) { toast.error(result.reason); return }
      toast.success('Image attached to this quotation line')
      setFile(null)
      router.refresh()
    })
  }

  return <div className="flex flex-wrap items-center gap-2">
    <Input aria-label="Quotation line image" type="file" accept="image/png,image/jpeg" className="max-w-sm" disabled={disabled || isPending} onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
    <Button type="button" variant="outline" onClick={upload} disabled={disabled || isPending || !file}><ImagePlus className="mr-2 h-4 w-4" />{isPending ? 'Uploading…' : 'Upload & attach'}</Button>
  </div>
}

function sourceFileIdFromUpload(value: unknown): string | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const data = (value as Record<string, unknown>).data
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null
  const id = (data as Record<string, unknown>).id
  return typeof id === 'string' ? id : null
}

function actionReason(value: unknown): string | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const reason = (value as Record<string, unknown>).reason
  return typeof reason === 'string' ? reason : null
}
