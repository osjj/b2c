'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCcw } from 'lucide-react'
import { toast } from 'sonner'

import { reconcileFinalizingQuotations } from '@/actions/admin/sales-quotations'
import { Button } from '@/components/ui/button'

export function ReconciliationAction() {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  return <Button type="button" variant="outline" disabled={isPending} onClick={() => {
    if (!window.confirm('Check expired finalization leases and return abandoned revisions to READY? Active leases will not be touched.')) return
    startTransition(async () => {
      const result = await reconcileFinalizingQuotations({ limit: 25 })
      if (result.success === false) { toast.error(result.reason); return }
      toast.success(result.reason); router.refresh()
    })
  }}><RefreshCcw className="mr-2 h-4 w-4" />{isPending ? 'Checking…' : 'Recover expired finalizations'}</Button>
}
