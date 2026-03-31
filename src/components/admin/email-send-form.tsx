'use client'

import { useActionState, useEffect, useRef, useState, useTransition } from 'react'
import { Code2, FileText, Mail, Send } from 'lucide-react'
import { sendAdminEmail, type SendAdminEmailState } from '@/actions/admin/email'
import { ContentEditor, type ContentEditorRef, type EditorJSData } from '@/components/admin/content-editor'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useRouter } from 'next/navigation'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

interface EmailSendFormProps {
  defaultSender: string
  smtpConfigured: boolean
}

const initialState: SendAdminEmailState = {}

export function EmailSendForm({ defaultSender, smtpConfigured }: EmailSendFormProps) {
  const [messageMode, setMessageMode] = useState<'editorjs' | 'html'>('editorjs')
  const [editorContent, setEditorContent] = useState<EditorJSData | null>(null)
  const [htmlContent, setHtmlContent] = useState('')
  const editorRef = useRef<ContentEditorRef>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const router = useRouter()
  const [state, formAction] = useActionState(sendAdminEmail, initialState)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    if (state.success) {
      toast.success(state.message || 'Email sent successfully.')
      router.refresh()
      return
    }

    if (state.error) {
      toast.error(state.error)
    }
  }, [router, state])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (messageMode === 'editorjs' && editorRef.current) {
      const saved = await editorRef.current.save()
      if (saved) {
        setEditorContent(saved)
        const contentInput = formRef.current?.querySelector('input[name="editorContent"]') as HTMLInputElement | null
        if (contentInput) {
          contentInput.value = JSON.stringify(saved)
        }
      }
    }

    const formData = new FormData(formRef.current!)
    startTransition(() => {
      formAction(formData)
    })
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
