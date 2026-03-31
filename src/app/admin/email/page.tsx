import { getAdminEmailHistory } from '@/actions/admin/email'
import { EmailHistoryTable } from '@/components/admin/email-history-table'
import { EmailSendForm } from '@/components/admin/email-send-form'

export default async function AdminEmailPage() {
  const defaultSender = process.env.SMTP2GO_DEFAULT_SENDER || 'sales@laifappe.com'
  const smtpConfigured = Boolean(process.env.SMTP2GO_API_KEY)
  const history = await getAdminEmailHistory()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl mb-1">Email</h1>
        <p className="text-muted-foreground">
          Send test or operational emails directly from the admin panel via SMTP2GO, and review recent delivery history.
        </p>
      </div>

      <EmailSendForm defaultSender={defaultSender} smtpConfigured={smtpConfigured} />
      <EmailHistoryTable items={history} />
    </div>
  )
}
