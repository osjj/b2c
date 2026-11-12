import { getQuoteEmailHistory } from '@/actions/admin/quote-email-history'
import { Pagination } from '@/components/admin/pagination'
import { QuoteEmailHistoryTable } from '@/components/admin/quote-email-history-table'

interface AdminQuoteEmailsPageProps {
  searchParams: Promise<{
    page?: string
  }>
}

const QUOTE_EMAIL_HISTORY_PAGE_SIZE = 20

export default async function AdminQuoteEmailsPage({ searchParams }: AdminQuoteEmailsPageProps) {
  const params = await searchParams
  const page = Math.max(Number(params.page) || 1, 1)
  const { items, pagination, checkedAt } = await getQuoteEmailHistory({
    page,
    limit: QUOTE_EMAIL_HISTORY_PAGE_SIZE,
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl mb-1">Quote Inquiries</h1>
        <p className="text-muted-foreground">
          Review saved quote requests and their email notification status.
        </p>
      </div>

      <QuoteEmailHistoryTable
        items={items}
        page={pagination.page}
        pageSize={pagination.limit}
        total={pagination.total}
        checkedAt={checkedAt}
      />
      <Pagination {...pagination} />
    </div>
  )
}
