import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Download, ExternalLink, Mail, Phone, Building, FileText } from 'lucide-react'
import { getAdminQuote } from '@/actions/admin/quotes'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { formatDate, formatPrice } from '@/lib/utils'
import { QuoteStatusSelect } from '@/components/admin/quote-status-select'
import { QuoteStatus } from '@prisma/client'

const statusColors: Record<QuoteStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  PENDING: 'secondary',
  PROCESSING: 'default',
  QUOTED: 'default',
  ACCEPTED: 'default',
  REJECTED: 'destructive',
  EXPIRED: 'outline',
}

interface QuoteDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function AdminQuoteDetailPage({ params }: QuoteDetailPageProps) {
  const { id } = await params
  const quote = await getAdminQuote(id)

  if (!quote) {
    notFound()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/quotes">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{quote.quoteNumber}</h1>
            <p className="text-muted-foreground">
              Submitted on {formatDate(quote.createdAt)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={statusColors[quote.status]} className="text-sm px-3 py-1">
            {quote.status}
          </Badge>
          <QuoteStatusSelect quoteId={quote.id} currentStatus={quote.status} />
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Customer Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Customer Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Name</p>
              <p className="font-medium">{quote.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <a
                href={`mailto:${quote.email}`}
                className="font-medium text-primary hover:underline flex items-center gap-1"
              >
                <Mail className="h-4 w-4" />
                {quote.email}
              </a>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">WhatsApp / WeChat</p>
              <p className="font-medium flex items-center gap-1">
                <Phone className="h-4 w-4" />
                {quote.contact}
              </p>
            </div>
            {quote.companyName && (
              <div>
                <p className="text-sm text-muted-foreground">Company</p>
                <p className="font-medium flex items-center gap-1">
                  <Building className="h-4 w-4" />
                  {quote.companyName}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Remarks & File */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Additional Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Remark</p>
              <p className="font-medium whitespace-pre-wrap">
                {quote.remark || 'No remarks provided'}
              </p>
            </div>
            {quote.fileUrl && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Attached File</p>
                <Button variant="outline" size="sm" asChild>
                  <a href={quote.fileUrl} target="_blank" rel="noopener noreferrer">
                    <FileText className="h-4 w-4 mr-2" />
                    {quote.fileName || 'Download File'}
                    <ExternalLink className="h-3 w-3 ml-2" />
                  </a>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quote Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Items</span>
              <span className="font-medium">{quote.items.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Quantity</span>
              <span className="font-medium">
                {quote.items.reduce((sum, item) => sum + item.quantity, 0)}
              </span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Estimated Value</span>
              <span className="font-bold text-lg">
                {formatPrice(
                  quote.items.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0)
                )}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quote Items */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Requested Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {quote.items.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-4 p-4 border rounded-lg"
              >
                <div className="w-16 h-16 relative rounded overflow-hidden bg-gray-100 shrink-0">
                  {item.image || item.product?.images?.[0]?.url ? (
                    <Image
                      src={item.image || item.product?.images?.[0]?.url || ''}
                      alt={item.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                      No img
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/admin/products/${item.productId}`}
                    className="font-medium hover:text-primary hover:underline"
                  >
                    {item.name}
                  </Link>
                  {item.sku && (
                    <p className="text-sm text-muted-foreground">SKU: {item.sku}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-medium">{formatPrice(Number(item.price))}</p>
                  <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                </div>
                <div className="text-right min-w-[100px]">
                  <p className="font-bold">
                    {formatPrice(Number(item.price) * item.quantity)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
