'use client'

import { useState } from 'react'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'

export function useQuotationConfirm() {
  const [pending, setPending] = useState<{ title: string; message: string; action: () => void; descriptionClassName?: string } | null>(null)
  return {
    ask: (title: string, message: string, action: () => void, descriptionClassName?: string) => setPending({ title, message, action, descriptionClassName }),
    dialog: <AlertDialog open={pending !== null} onOpenChange={(open) => { if (!open) setPending(null) }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{pending?.title}</AlertDialogTitle><AlertDialogDescription className={pending?.descriptionClassName}>{pending?.message}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>取消</AlertDialogCancel><AlertDialogAction onClick={() => { const action = pending?.action; setPending(null); action?.() }}>确认继续</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>,
  }
}
