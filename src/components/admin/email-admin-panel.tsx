'use client'

import { useRef } from 'react'
import { EmailHistoryTable } from '@/components/admin/email-history-table'
import { EmailSendForm, type EmailSendFormRef } from '@/components/admin/email-send-form'
import { Pagination } from '@/components/admin/pagination'
import type { AdminEmailHistoryItem } from '@/lib/admin-email-store'

interface EmailAdminPanelProps {
  defaultSender: string
  smtpConfigured: boolean
  historyItems: AdminEmailHistoryItem[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export function EmailAdminPanel({
  defaultSender,
  smtpConfigured,
  historyItems,
  pagination,
}: EmailAdminPanelProps) {
  const formRef = useRef<EmailSendFormRef>(null)
  const handleUseAsTemplate = (item: AdminEmailHistoryItem) => {
    formRef.current?.useTemplate(item)
  }

  return (
    <>
      <EmailSendForm
        ref={formRef}
        defaultSender={defaultSender}
        smtpConfigured={smtpConfigured}
      />
      <EmailHistoryTable
        items={historyItems}
        page={pagination.page}
        pageSize={pagination.limit}
        total={pagination.total}
        onUseAsTemplate={handleUseAsTemplate}
      />
      <Pagination {...pagination} />
    </>
  )
}
