import Link from 'next/link'
import { Search, Download, Eye, Trash2 } from 'lucide-react'
import { getAdminQuotes } from '@/actions/admin/quotes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import { QuoteFilters } from '@/components/admin/quote-filters'
import { Pagination } from '@/components/admin/pagination'
import { QuoteStatus } from '@prisma/client'

const statusColors: Record<QuoteStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  PENDING: 'secondary',
  PROCESSING: 'default',
  QUOTED: 'default',
  ACCEPTED: 'default',
  REJECTED: 'destructive',
  EXPIRED: 'outline',
}

interface QuotesPageProps {
  searchParams: Promise<{
    page?: string
    search?: string
    status?: QuoteStatus
  }>
}

export default async function AdminQuotesPage({ searchParams }: QuotesPageProps) {
  const params = await searchParams
  const page = Number(params.page) || 1
  const search = params.search || ''
  const status = params.status

  const { quotes, pagination } = await getAdminQuotes({
    page,
    search,
    status,
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Quotes</h1>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <form className="flex-1 max-w-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              name="search"
              placeholder="Search by quote #, name, email..."
              defaultValue={search}
              className="pl-10"
            />
          </div>
        </form>
        <QuoteFilters currentStatus={status} />
      </div>

      <div className="bg-white rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Quote #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-20">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {quotes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No quotes found
                </TableCell>
              </TableRow>
            ) : (
              quotes.map((quote) => (
                <TableRow key={quote.id}>
                  <TableCell className="font-medium">
                    {quote.quoteNumber}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{quote.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {quote.email}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {quote.contact}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {quote.companyName || '-'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(quote.createdAt)}
                  </TableCell>
                  <TableCell>{quote._count.items}</TableCell>
                  <TableCell>
                    <Badge variant={statusColors[quote.status]}>
                      {quote.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" asChild>
                      <Link href={`/admin/quotes/${quote.id}`}>
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Pagination {...pagination} />
    </div>
  )
}
