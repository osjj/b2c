'use client'

import { useRouter } from 'next/navigation'
import { TableRow } from '@/components/ui/table'

interface ClickableTableRowProps {
  href: string
  children: React.ReactNode
}

export function ClickableTableRow({ href, children }: ClickableTableRowProps) {
  const router = useRouter()

  return (
    <TableRow
      className="cursor-pointer hover:bg-muted/50"
      onDoubleClick={() => router.push(href)}
    >
      {children}
    </TableRow>
  )
}
