import { getAdminEmailHistory } from '@/actions/admin/email'
import { EmailAdminPanel } from '@/components/admin/email-admin-panel'

interface AdminEmailPageProps {
  searchParams: Promise<{
    page?: string
  }>
}

const EMAIL_HISTORY_PAGE_SIZE = 20

export default async function AdminEmailPage({ searchParams }: AdminEmailPageProps) {
  const params = await searchParams
  const page = Math.max(Number(params.page) || 1, 1)
  const defaultSender = process.env.SMTP2GO_DEFAULT_SENDER || 'sales@laifappe.com'
  const smtpConfigured = Boolean(process.env.SMTP2GO_API_KEY)
  const { items, pagination } = await getAdminEmailHistory({
    page,
    limit: EMAIL_HISTORY_PAGE_SIZE,
  })

  return (
    <div className="min-w-0 space-y-6">
      <div>
        <h1 className="font-serif text-3xl mb-1">Email</h1>
        <p className="text-muted-foreground">
          Send test or operational emails directly from the admin panel via SMTP2GO, and review paginated delivery history.
        </p>
      </div>

      <EmailAdminPanel
        defaultSender={defaultSender}
        smtpConfigured={smtpConfigured}
        historyItems={items}
        pagination={pagination}
      />
    </div>
  )
}
