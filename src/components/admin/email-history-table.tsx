'use client'

import { useState } from 'react'
import { Copy, Eye, Paperclip } from 'lucide-react'
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
import type { AdminEmailHistoryItem } from '@/actions/admin/email'

interface EmailHistoryTableProps {
  items: AdminEmailHistoryItem[]
  page: number
  pageSize: number
  total: number
  onUseAsTemplate: (item: AdminEmailHistoryItem) => void
}

export function EmailHistoryTable({ items, page, pageSize, total, onUseAsTemplate }: EmailHistoryTableProps) {
  const [selectedItem, setSelectedItem] = useState<AdminEmailHistoryItem | null>(null)
  const startItem = total > 0 ? (page - 1) * pageSize + 1 : 0
  const endItem = Math.min(page * pageSize, total)

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="font-serif">Send History</CardTitle>
          <CardDescription>
            {total > 0
              ? `Showing ${startItem}-${endItem} of ${total} emails sent from the admin panel.`
              : 'Emails sent from the admin panel are recorded here.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Recipients</TableHead>
                <TableHead>Attachments</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead>Operator</TableHead>
                <TableHead>Preview</TableHead>
                <TableHead className="w-24">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                    No emails have been sent yet.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatDateTime(item.createdAt)}
                    </TableCell>
                    <TableCell className="min-w-48">
                      <div className="space-y-1">
                        <p className="font-medium">{item.subject}</p>
                        <p className="text-xs text-muted-foreground">{item.sender}</p>
                        {item.requestId && (
                          <p className="text-xs text-muted-foreground">Request ID: {item.requestId}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-64">
                      <div className="space-y-1">
                        {item.recipients.map((recipient) => (
                          <p key={recipient} className="truncate text-sm text-muted-foreground">
                            {recipient}
                          </p>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      {item.attachments.length > 0 ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Paperclip className="h-4 w-4" />
                          <span>{item.attachments.length}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={item.messageMode === 'html' ? 'default' : 'secondary'}>
                        {item.messageMode === 'html' ? 'HTML' : 'EditorJS'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{item.sentBy}</TableCell>
                    <TableCell className="max-w-md">
                      <p className="line-clamp-3 text-sm text-muted-foreground">
                        {item.previewText || '-'}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" onClick={() => setSelectedItem(item)}>
                        <Eye className="mr-2 h-4 w-4" />
                        Open
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={Boolean(selectedItem)} onOpenChange={(open) => !open && setSelectedItem(null)}>
        <DialogContent className="max-w-5xl">
          {selectedItem && (
            <>
              <DialogHeader>
                <div className="flex flex-col gap-3 pr-8 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-1">
                    <DialogTitle>{selectedItem.subject}</DialogTitle>
                    <DialogDescription>
                      Sent {formatDateTime(selectedItem.createdAt)} by {selectedItem.sentBy} to{' '}
                      {selectedItem.recipients.join(', ')}
                    </DialogDescription>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onUseAsTemplate(selectedItem)
                      setSelectedItem(null)
                    }}
                    className="shrink-0"
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Use as template
                  </Button>
                </div>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid gap-3 rounded-lg border bg-muted/20 p-4 md:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Sender</p>
                    <p className="mt-1 text-sm">{selectedItem.sender}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Mode</p>
                    <p className="mt-1 text-sm">{selectedItem.messageMode === 'html' ? 'HTML' : 'EditorJS'}</p>
                  </div>
                </div>

                {selectedItem.attachments.length > 0 && (
                  <div className="rounded-lg border bg-muted/10 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Attachments</p>
                    <div className="mt-3 space-y-2">
                      {selectedItem.attachments.map((attachment) => (
                        <div key={`${attachment.filename}-${attachment.size}`} className="flex items-center gap-2 text-sm">
                          <Paperclip className="h-4 w-4 text-muted-foreground" />
                          <span className="min-w-0 truncate">{attachment.filename}</span>
                          <span className="shrink-0 text-muted-foreground">{formatFileSize(attachment.size)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Tabs defaultValue={selectedItem.htmlBody ? 'preview' : 'text'} className="space-y-4">
                  <TabsList>
                    {selectedItem.htmlBody && <TabsTrigger value="preview">Preview</TabsTrigger>}
                    <TabsTrigger value="text">Text</TabsTrigger>
                    {selectedItem.htmlBody && <TabsTrigger value="html">HTML</TabsTrigger>}
                  </TabsList>

                  {selectedItem.htmlBody && (
                    <TabsContent value="preview">
                      <div className="rounded-lg border bg-muted/20 p-3">
                        <iframe
                          title={`Email preview ${selectedItem.id}`}
                          srcDoc={selectedItem.htmlBody}
                          sandbox=""
                          className="h-[520px] w-full rounded-md border bg-white"
                        />
                      </div>
                    </TabsContent>
                  )}

                  <TabsContent value="text">
                    <div className="max-h-[520px] overflow-auto rounded-lg border bg-muted/10 p-4">
                      <pre className="whitespace-pre-wrap break-words text-sm leading-6 text-foreground">
                        {selectedItem.textBody || '-'}
                      </pre>
                    </div>
                  </TabsContent>

                  {selectedItem.htmlBody && (
                    <TabsContent value="html">
                      <div className="max-h-[520px] overflow-auto rounded-lg border bg-muted/10 p-4">
                        <pre className="whitespace-pre-wrap break-all font-mono text-xs leading-5 text-foreground">
                          {selectedItem.htmlBody}
                        </pre>
                      </div>
                    </TabsContent>
                  )}
                </Tabs>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
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

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${Math.round((bytes / 1024) * 10) / 10}KB`
  }

  return `${Math.round((bytes / 1024 / 1024) * 10) / 10}MB`
}
