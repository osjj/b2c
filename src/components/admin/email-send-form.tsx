'use client'

import { useRef, useState, useTransition } from 'react'
import { Code2, FileText, Mail, Paperclip, Send, X } from 'lucide-react'
import { ContentEditor, type ContentEditorRef, type EditorJSData } from '@/components/admin/content-editor'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useRouter } from 'next/navigation'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

type SendAdminEmailState = {
  success?: boolean
  message?: string
  requestId?: string
  error?: string
  errors?: Record<string, string[]>
}

interface EmailSendFormProps {
  defaultSender: string
  smtpConfigured: boolean
}

const initialState: SendAdminEmailState = {}
const MAX_ATTACHMENT_COUNT = 5
const MAX_ATTACHMENT_TOTAL_BYTES = 25 * 1024 * 1024

export function EmailSendForm({ defaultSender, smtpConfigured }: EmailSendFormProps) {
  const [messageMode, setMessageMode] = useState<'editorjs' | 'html'>('editorjs')
  const [editorContent, setEditorContent] = useState<EditorJSData | null>(null)
  const [htmlContent, setHtmlContent] = useState('')
  const [attachments, setAttachments] = useState<File[]>([])
  const editorRef = useRef<ContentEditorRef>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const [state, setState] = useState<SendAdminEmailState>(initialState)
  const [pending, startTransition] = useTransition()

  const handleAttachmentChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files ?? [])
    if (selectedFiles.length === 0) {
      return
    }

    setAttachments((currentAttachments) => {
      const nextAttachments = [...currentAttachments, ...selectedFiles].slice(0, MAX_ATTACHMENT_COUNT)
      const totalSize = nextAttachments.reduce((sum, file) => sum + file.size, 0)

      if (currentAttachments.length + selectedFiles.length > MAX_ATTACHMENT_COUNT) {
        toast.error(`Attach up to ${MAX_ATTACHMENT_COUNT} files per email.`)
      }

      if (totalSize > MAX_ATTACHMENT_TOTAL_BYTES) {
        toast.error(`Attachments must be ${formatAttachmentSize(MAX_ATTACHMENT_TOTAL_BYTES)} or less before encoding.`)
        return currentAttachments
      }

      return nextAttachments
    })

    event.target.value = ''
  }

  const removeAttachment = (index: number) => {
    setAttachments((currentAttachments) => currentAttachments.filter((_, attachmentIndex) => attachmentIndex !== index))
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const currentForm = formRef.current
    if (!currentForm) {
      return
    }

    let savedEditorContent: EditorJSData | null = null
    if (messageMode === 'editorjs' && editorRef.current) {
      const saved = await editorRef.current.save()
      if (saved) {
        savedEditorContent = saved
        setEditorContent(saved)
      }
    }

    const formData = new FormData(currentForm)
    if (messageMode === 'editorjs') {
      formData.set('editorContent', savedEditorContent ? JSON.stringify(savedEditorContent) : '')
    }
    attachments.forEach((attachment) => {
      formData.append('attachments', attachment)
    })

    startTransition(() => {
      void submitEmail(formData)
    })
  }

  const submitEmail = async (formData: FormData) => {
    try {
      const response = await fetch('/api/admin/email/send', {
        method: 'POST',
        body: formData,
      })
      const result = (await response.json().catch(() => null)) as SendAdminEmailState | null
      const nextState = result || {
        error: `Email request failed with status ${response.status}.`,
      }

      setState(nextState)

      if (nextState.success) {
        toast.success(nextState.message || 'Email sent successfully.')
        setAttachments([])
        router.refresh()
        return
      }

      if (nextState.error) {
        toast.error(nextState.error)
        return
      }

      const fieldError = getFirstFieldError(nextState.errors)
      if (fieldError) {
        toast.error(fieldError)
      }
    } catch (error) {
      const nextState = {
        error: error instanceof Error ? error.message : 'An unexpected error occurred while sending the email.',
      }
      setState(nextState)
      toast.error(nextState.error)
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <Card>
        <CardHeader>
          <CardTitle className="font-serif">Compose Email</CardTitle>
          <CardDescription>
            Compose with EditorJS or paste a full HTML email, then send it through SMTP2GO.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">
            <input type="hidden" name="messageMode" value={messageMode} />
            <input type="hidden" name="editorContent" value={JSON.stringify(editorContent)} />

            {state.error && (
              <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                {state.error}
              </div>
            )}

            {state.success && state.message && (
              <div className="rounded-lg border border-green-600/20 bg-green-50 px-4 py-3 text-sm text-green-700">
                <p>{state.message}</p>
                {state.requestId && (
                  <p className="mt-1 text-xs text-green-700/80">Request ID: {state.requestId}</p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="sender">Sender</Label>
              <Input
                id="sender"
                name="sender"
                type="email"
                defaultValue={defaultSender}
                placeholder="sales@laifappe.com"
                required
              />
              {state.errors?.sender && (
                <p className="text-sm text-destructive">{state.errors.sender[0]}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="to">Recipients</Label>
              <Textarea
                id="to"
                name="to"
                rows={4}
                placeholder="first@example.com, second@example.com"
                required
              />
              <p className="text-sm text-muted-foreground">
                Separate multiple recipients with commas, semicolons, or new lines.
              </p>
              {state.errors?.to && (
                <p className="text-sm text-destructive">{state.errors.to[0]}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input id="subject" name="subject" placeholder="SMTP2GO test" required />
              {state.errors?.subject && (
                <p className="text-sm text-destructive">{state.errors.subject[0]}</p>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <Label htmlFor="attachments">Attachments</Label>
                  <p className="text-sm text-muted-foreground">
                    PDF, Word, Excel, or image files. Total size before encoding: up to 25MB.
                  </p>
                </div>
                <Input
                  ref={fileInputRef}
                  id="attachments"
                  type="file"
                  multiple
                  accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,image/jpeg,image/png,image/gif,image/webp,.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.webp"
                  onChange={handleAttachmentChange}
                  className="hidden"
                />
                <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                  <Paperclip className="mr-2 h-4 w-4" />
                  Add Files
                </Button>
              </div>

              {attachments.length > 0 && (
                <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
                  {attachments.map((attachment, index) => (
                    <div
                      key={`${attachment.name}-${attachment.size}-${attachment.lastModified}-${index}`}
                      className="flex items-center justify-between gap-3 rounded-md bg-background px-3 py-2 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">{attachment.name}</p>
                        <p className="text-xs text-muted-foreground">{formatAttachmentSize(attachment.size)}</p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => removeAttachment(index)}
                        aria-label={`Remove ${attachment.name}`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {state.errors?.attachments && (
                <p className="text-sm text-destructive">{state.errors.attachments[0]}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Message</Label>
              <Tabs value={messageMode} onValueChange={(value) => setMessageMode(value as 'editorjs' | 'html')}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="editorjs">
                    <FileText className="mr-2 h-4 w-4" />
                    EditorJS
                  </TabsTrigger>
                  <TabsTrigger value="html">
                    <Code2 className="mr-2 h-4 w-4" />
                    HTML
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="editorjs" className="space-y-3">
                  <ContentEditor
                    ref={editorRef}
                    value={editorContent}
                    onChange={setEditorContent}
                    placeholder="Write your email content here..."
                  />
                  <p className="text-sm text-muted-foreground">
                    Use this mode for normal rich-text editing. If you need to paste a full HTML template, switch to HTML.
                  </p>
                  {state.errors?.editorContent && (
                    <p className="text-sm text-destructive">{state.errors.editorContent[0]}</p>
                  )}
                </TabsContent>

                <TabsContent value="html" className="space-y-3">
                  <div className="grid gap-4 xl:grid-cols-2">
                    <div className="space-y-3">
                      <Textarea
                        id="htmlContent"
                        name="htmlContent"
                        rows={18}
                        value={htmlContent}
                        onChange={(event) => setHtmlContent(event.target.value)}
                        placeholder={'<table><tr><td><h1>这是一封测试邮件</h1></td></tr></table>'}
                        className="font-mono text-xs"
                      />
                      <p className="text-sm text-muted-foreground">
                        Paste complete HTML email code here. It will be sent as <code>html_body</code>.
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div className="rounded-xl border bg-muted/20 p-3">
                        <div className="mb-3 flex items-center justify-between border-b pb-3">
                          <div>
                            <p className="text-sm font-medium">Live Preview</p>
                            <p className="text-xs text-muted-foreground">
                              Rendered from the HTML you paste on the left.
                            </p>
                          </div>
                          <div className="rounded-full border bg-background px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                            Email
                          </div>
                        </div>

                        {htmlContent.trim() ? (
                          <iframe
                            title="HTML email preview"
                            srcDoc={htmlContent}
                            sandbox=""
                            className="h-[420px] w-full rounded-lg border bg-white"
                          />
                        ) : (
                          <div className="flex h-[420px] items-center justify-center rounded-lg border border-dashed bg-background/80 px-6 text-center">
                            <div className="space-y-2">
                              <p className="text-sm font-medium">Preview will appear here</p>
                              <p className="text-xs text-muted-foreground">
                                Paste HTML email code to inspect layout, spacing, and rendered styles before sending.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {state.errors?.htmlContent && (
                    <p className="text-sm text-destructive">{state.errors.htmlContent[0]}</p>
                  )}
                </TabsContent>
              </Tabs>
            </div>

            <Button type="submit" disabled={pending || !smtpConfigured} className="min-w-32">
              <Send className="mr-2 h-4 w-4" />
              {pending ? 'Sending...' : 'Send Email'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="h-fit">
        <CardHeader>
          <CardTitle className="font-serif">SMTP2GO</CardTitle>
          <CardDescription>Current delivery configuration for this admin tool.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="rounded-lg border bg-muted/40 p-4">
            <div className="flex items-start gap-3">
              <Mail className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div className="space-y-1">
                <p className="font-medium text-foreground">API key status</p>
                <p className={smtpConfigured ? 'text-green-700' : 'text-destructive'}>
                  {smtpConfigured ? 'Configured in environment' : 'Missing SMTP2GO_API_KEY'}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <p className="font-medium text-foreground">Default sender</p>
            <p className="break-all text-muted-foreground">{defaultSender}</p>
          </div>

          <div className="space-y-2 text-muted-foreground">
            <p>Required env vars:</p>
            <p className="font-mono text-xs">SMTP2GO_API_KEY</p>
            <p className="font-mono text-xs">SMTP2GO_DEFAULT_SENDER</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function formatAttachmentSize(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${Math.round((bytes / 1024) * 10) / 10}KB`
  }

  return `${Math.round((bytes / 1024 / 1024) * 10) / 10}MB`
}

function getFirstFieldError(errors?: Record<string, string[]>) {
  if (!errors) {
    return null
  }

  for (const messages of Object.values(errors)) {
    const message = messages[0]
    if (message) {
      return message
    }
  }

  return null
}
