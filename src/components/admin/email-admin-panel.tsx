'use client'

import { useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { EmailHistoryTable } from '@/components/admin/email-history-table'
import { EmailSendForm, type EmailSendFormRef } from '@/components/admin/email-send-form'
import { Pagination } from '@/components/admin/pagination'
import type { AdminEmailHistoryItem } from '@/lib/admin-email-store'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MailboxPanel } from '@/components/admin/mailbox-panel'

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
  const searchParams = useSearchParams()
  const activeTab = searchParams.get('view') === 'compose' || (searchParams.has('page') && !searchParams.has('view')) ? 'compose' : 'mailbox'
  const handleUseAsTemplate = (item: AdminEmailHistoryItem) => {
    formRef.current?.useTemplate(item)
  }

  return (
    <Tabs value={activeTab} onValueChange={(value) => {
      const params = new URLSearchParams(searchParams)
      params.set('view', value)
      window.history.replaceState(null, '', `?${params.toString()}`)
    }} className="min-w-0 gap-5">
      <TabsList aria-label="邮件管理视图">
        <TabsTrigger value="mailbox">收件与会话回复</TabsTrigger>
        <TabsTrigger value="compose">写新邮件与发送记录</TabsTrigger>
      </TabsList>
      <TabsContent value="mailbox" forceMount className="min-w-0 data-[state=inactive]:hidden">
        <MailboxPanel />
      </TabsContent>
      <TabsContent value="compose" forceMount className="min-w-0 space-y-6 data-[state=inactive]:hidden">
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
      </TabsContent>
    </Tabs>
  )
}
