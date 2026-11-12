'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, RefreshCw } from 'lucide-react'
import { retryQuoteEmailNotification } from '@/actions/admin/quote-email-history'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { QuoteEmailHistoryItem } from '@/lib/quote-email-history'

interface QuoteEmailHistoryTableProps {
  items: QuoteEmailHistoryItem[]
  page: number
  pageSize: number
  total: number
  checkedAt: number
}

export function QuoteEmailHistoryTable({ items, page, pageSize, total, checkedAt }: QuoteEmailHistoryTableProps) {
  const router = useRouter()
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [retryingId, setRetryingId] = useState<string | null>(null)
  const [retryMessage, setRetryMessage] = useState<{ success: boolean; reason: string } | null>(null)
  const selectedItem = items.find((item) => item.id === selectedItemId) ?? null
  const startItem = total > 0 ? (page - 1) * pageSize + 1 : 0
  const endItem = Math.min(page * pageSize, total)

  async function handleRetry(id: string) {
    if (retryingId) return
    setRetryingId(id)
    setRetryMessage(null)
    try {
      setRetryMessage(await retryQuoteEmailNotification(id))
    } catch {
      setRetryMessage({ success: false, reason: 'The notification could not be checked. Refresh and try again.' })
    } finally {
      setRetryingId(null)
      router.refresh()
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="font-serif">Saved Quote Inquiries</CardTitle>
          <CardDescription>
            {total > 0
              ? `Showing ${startItem}-${endItem} of ${total} saved quote requests.`
              : 'Saved quote requests and legacy email records appear here.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {retryMessage && (
            <p className={`mb-4 text-sm ${retryMessage.success ? 'text-muted-foreground' : 'text-destructive'}`} role="status" aria-live="polite">
              {retryMessage.reason}
            </p>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Recipient</TableHead>
                <TableHead>Notification</TableHead>
                <TableHead>Message</TableHead>
                <TableHead className="w-24">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                    No quote inquiries have been recorded yet.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatDateTime(item.createdAt)}
                    </TableCell>
                    <TableCell className="min-w-52">
                      <div className="space-y-1">
                        <p className="font-medium">{item.customerEmail}</p>
                        <p className="text-xs text-muted-foreground">
                          {[item.name || 'No name', item.companyName].filter(Boolean).join(' - ')}
                        </p>
                        {item.requestId && (
                          <p className="text-xs text-muted-foreground">Request ID: {item.requestId}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{item.phone || '-'}</TableCell>
                    <TableCell>
                      {item.source ? (
                        <Badge variant="secondary">{item.source}</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-48 truncate text-muted-foreground">{item.recipient}</TableCell>
                    <TableCell className="min-w-44">
                      <NotificationStatus item={item} />
                    </TableCell>
                    <TableCell className="max-w-md">
                      <p className="line-clamp-3 text-sm text-muted-foreground">
                        {item.message || '-'}
                      </p>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col items-start gap-2">
                        <Button variant="outline" size="sm" onClick={() => setSelectedItemId(item.id)}>
                          <Eye className="mr-2 h-4 w-4" />
                          Open
                        </Button>
                        {canRetryQuoteEmailNotification(item, checkedAt) && (
                          <Button variant="outline" size="sm" disabled={Boolean(retryingId)} onClick={() => void handleRetry(item.id)}>
                            <RefreshCw className={`mr-2 h-4 w-4 ${retryingId === item.id ? 'animate-spin' : ''}`} aria-hidden="true" />
                            {retryingId === item.id ? 'Retrying...' : 'Retry notification'}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={Boolean(selectedItem)} onOpenChange={(open) => !open && setSelectedItemId(null)}>
        <DialogContent className="max-w-5xl">
          {selectedItem && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedItem.subject}</DialogTitle>
                <DialogDescription>
                  Recorded {formatDateTime(selectedItem.createdAt)}. Notification from {selectedItem.sender} to {selectedItem.recipient}.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid gap-3 rounded-lg border bg-muted/20 p-4 md:grid-cols-2">
                  <Detail label="Customer Email" value={selectedItem.customerEmail} />
                  <Detail label="Mobile/WhatsApp" value={selectedItem.phone || '-'} />
                  <Detail label="Name" value={selectedItem.name || '-'} />
                  <Detail label="Company" value={selectedItem.companyName || '-'} />
                  <Detail label="Source" value={selectedItem.source || '-'} />
                  <Detail label="Entry Page" value={selectedItem.entryPage || '-'} />
                  <Detail label="Referrer" value={selectedItem.referrer || '-'} />
                  <Detail label="Request ID" value={selectedItem.requestId || '-'} />
                  <Detail label="Inquiry ID" value={selectedItem.id} />
                  <Detail label="Notification" value={quoteEmailNotificationLabel(selectedItem)} />
                  {typeof selectedItem.attempts === 'number' && <Detail label="Attempts" value={String(selectedItem.attempts)} />}
                  {selectedItem.sentAt && <Detail label="Provider accepted" value={formatDateTime(selectedItem.sentAt)} />}
                  {selectedItem.lastError && <Detail label="Last notification error" value={selectedItem.lastError} />}
                </div>

                <Tabs defaultValue="message" className="space-y-4">
                  <TabsList>
                    <TabsTrigger value="message">Message</TabsTrigger>
                    <TabsTrigger value="preview">Preview</TabsTrigger>
                    <TabsTrigger value="text">Text</TabsTrigger>
                    <TabsTrigger value="html">HTML</TabsTrigger>
                  </TabsList>

                  <TabsContent value="message">
                    <div className="max-h-[520px] overflow-auto rounded-lg border bg-muted/10 p-4">
                      <pre className="whitespace-pre-wrap break-words text-sm leading-6 text-foreground">
                        {selectedItem.message || '-'}
                      </pre>
                    </div>
                  </TabsContent>

                  <TabsContent value="preview">
                    <div className="rounded-lg border bg-muted/20 p-3">
                      <iframe
                        title={`Quote email preview ${selectedItem.id}`}
                        srcDoc={selectedItem.htmlBody}
                        sandbox=""
                        className="h-[520px] w-full rounded-md border bg-white"
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="text">
                    <div className="max-h-[520px] overflow-auto rounded-lg border bg-muted/10 p-4">
                      <pre className="whitespace-pre-wrap break-words text-sm leading-6 text-foreground">
                        {selectedItem.textBody || '-'}
                      </pre>
                    </div>
                  </TabsContent>

                  <TabsContent value="html">
                    <div className="max-h-[520px] overflow-auto rounded-lg border bg-muted/10 p-4">
                      <pre className="whitespace-pre-wrap break-all font-mono text-xs leading-5 text-foreground">
                        {selectedItem.htmlBody || '-'}
                      </pre>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

export function quoteEmailNotificationLabel(item: QuoteEmailHistoryItem) {
  switch (item.notificationStatus) {
    case 'pending': return 'Notification not sent'
    case 'sending': return 'Notification in progress'
    case 'sent': return 'Provider accepted'
    case 'failed': return 'Notification failed; inquiry saved'
    default: return 'Legacy email record'
  }
}

export function canRetryQuoteEmailNotification(item: QuoteEmailHistoryItem, checkedAt: number) {
  if (item.notificationStatus === 'pending' || item.notificationStatus === 'failed') return true
  if (item.notificationStatus !== 'sending' || !item.leaseUntil) return false
  const leaseUntil = Date.parse(item.leaseUntil)
  return Number.isFinite(leaseUntil) && leaseUntil <= checkedAt
}

function NotificationStatus({ item }: { item: QuoteEmailHistoryItem }) {
  return (
    <div className="space-y-1">
      <Badge variant={item.notificationStatus === 'failed' ? 'destructive' : 'secondary'}>
        {quoteEmailNotificationLabel(item)}
      </Badge>
      {typeof item.attempts === 'number' && <p className="text-xs text-muted-foreground">Attempts: {item.attempts}</p>}
      {item.lastError && <p className="max-w-56 text-xs text-destructive">{item.lastError}</p>}
    </div>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
      <p className="mt-1 break-words text-sm">{value}</p>
    </div>
  )
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}
