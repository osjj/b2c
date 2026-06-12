'use client'

import { forwardRef, useImperativeHandle, useRef, useState, useTransition } from 'react'
import { AlertTriangle, CheckCircle2, Code2, FileText, Loader2, Mail, Paperclip, Search, Send, Sparkles, X } from 'lucide-react'
import { ContentEditor, type ContentEditorRef, type EditorJSData } from '@/components/admin/content-editor'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useRouter } from 'next/navigation'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import type { AdminEmailHistoryItem, AdminEmailRecipientCheckItem } from '@/lib/admin-email-store'

type SendAdminEmailState = {
  success?: boolean
  message?: string
  requestId?: string
  error?: string
  errors?: Record<string, string[]>
}

type MessageMode = 'editorjs' | 'html'
type ReplyTemplateKind = 'quotationProgress' | 'facebookInquiry' | 'facebookInquiryNoCatalogue'

type ReplyEmailTemplate = {
  subject: string
  paragraphs: string[]
  greeting?: string
  signatureName?: string
  catalogueUrl?: string
}

type RecipientHistoryCheckResponse = {
  success?: boolean
  reason?: string
  error?: string
  errors?: Record<string, string[]>
  results?: AdminEmailRecipientCheckItem[]
  summary?: {
    total: number
    sentBefore: number
    newRecipients: number
  }
}

interface EmailSendFormProps {
  defaultSender: string
  smtpConfigured: boolean
}

export interface EmailSendFormRef {
  useTemplate: (template: AdminEmailHistoryItem) => void
}

const initialState: SendAdminEmailState = {}
const MAX_ATTACHMENT_COUNT = 5
const MAX_ATTACHMENT_TOTAL_BYTES = 25 * 1024 * 1024
const DEFAULT_EMAIL_TEMPLATE_SUBJECT = 'PPE Supply Proposal and Quotation Support from LAIFAPPE'
const LAIFAPPE_LOGO_URL = 'https://www.laifappe.com/logo2.png'
const REPLY_EMAIL_TEMPLATES: Record<ReplyTemplateKind, ReplyEmailTemplate> = {
  quotationProgress: {
    subject: 'Your Inquiry – Quotation in Progress',
    paragraphs: [
      'Thank you for your inquiry.',
      'We have received your request and will check the attached documents and details accordingly. We will verify the product information and provide you with a quote as soon as possible.',
    ],
  },
  facebookInquiry: {
    subject: 'Thank You for Your Inquiry – LAIFAPPE Safety Equipment',
    paragraphs: [
      'Thank you for your inquiry through our Facebook form.',
      'We have received your contact information and are happy to support your PPE purchasing needs. Could you please let us know which products you are looking for, the estimated quantity, delivery country, and whether you need any specific standards or certifications?',
      'We can supply safety shoes, gloves, helmets, reflective vests, uniforms, workwear, masks, and other safety products.',
      'Once we receive your detailed requirements, we will provide you with a suitable quotation and delivery information.',
    ],
    catalogueUrl: 'https://shop.laifappe.com/LAIFA_PPE_catalog.pdf',
  },
  facebookInquiryNoCatalogue: {
    subject: 'Thank You for Your Inquiry – LAIFAPPE Safety Equipment',
    greeting: 'Hi [Customer Name],',
    paragraphs: [
      'Thank you for your request.',
      'This is Laifappe Safety Equipment. We supply bulk PPE products including safety gloves, safety shoes, helmets and workwear.',
      'Could you please confirm:<br>1. Which PPE products do you need?<br>2. Estimated quantity?<br>3. Destination country?<br>4. Are you buying for distribution, company use, or a project?',
      'After we receive the details, we can send MOQ, factory pricing and lead time.',
    ],
    signatureName: 'Laifappe Safety Equipment',
  },
}

export const EmailSendForm = forwardRef<EmailSendFormRef, EmailSendFormProps>(function EmailSendForm(
  { defaultSender, smtpConfigured },
  ref
) {
  const [sender, setSender] = useState(defaultSender)
  const [recipients, setRecipients] = useState('')
  const [subject, setSubject] = useState('')
  const [messageMode, setMessageMode] = useState<MessageMode>('editorjs')
  const [selectedTemplateMode, setSelectedTemplateMode] = useState<MessageMode | null>(null)
  const [editorContent, setEditorContent] = useState<EditorJSData | null>(null)
  const [editorResetKey, setEditorResetKey] = useState(0)
  const [htmlContent, setHtmlContent] = useState('')
  const [attachments, setAttachments] = useState<File[]>([])
  const [recipientHistory, setRecipientHistory] = useState<RecipientHistoryCheckResponse | null>(null)
  const [checkingRecipients, setCheckingRecipients] = useState(false)
  const editorRef = useRef<ContentEditorRef>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const [state, setState] = useState<SendAdminEmailState>(initialState)
  const [pending, startTransition] = useTransition()

  useImperativeHandle(ref, () => ({
    useTemplate(template) {
      setSender(template.sender || defaultSender)
      setRecipients(template.recipients.join(', '))
      setRecipientHistory(null)
      setSubject(template.subject)
      setAttachments([])
      setState(initialState)
      setSelectedTemplateMode(null)

      if (template.messageMode === 'editorjs' && template.editorContent) {
        setMessageMode('editorjs')
        setHtmlContent('')
        setEditorContent(template.editorContent)
        setEditorResetKey((currentKey) => currentKey + 1)
        window.setTimeout(() => {
          if (template.editorContent) {
            void editorRef.current?.render(template.editorContent)
          }
        }, 0)
      } else if (template.htmlBody) {
        setMessageMode('html')
        setHtmlContent(template.htmlBody)
        setEditorContent(null)
      } else {
        const editorData = createEditorContentFromText(template.textBody)
        setMessageMode('editorjs')
        setHtmlContent('')
        setEditorContent(editorData)
        setEditorResetKey((currentKey) => currentKey + 1)
        window.setTimeout(() => {
          void editorRef.current?.render(editorData)
        }, 0)
      }

      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      toast.success('Email copied into the composer.')
    },
  }))

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

  const handleRecipientsChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setRecipients(event.target.value)
    setRecipientHistory(null)
  }

  const handleCheckRecipientHistory = async () => {
    if (!recipients.trim()) {
      toast.error('Enter at least one recipient email first.')
      return
    }

    setCheckingRecipients(true)
    setRecipientHistory(null)

    try {
      const response = await fetch('/api/admin/email/check-history', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ recipients }),
      })
      const result = (await response.json().catch(() => null)) as RecipientHistoryCheckResponse | null

      if (!response.ok || !result?.success) {
        const fieldError = getFirstFieldError(result?.errors)
        toast.error(fieldError || result?.error || result?.reason || 'Could not check recipient history.')
        return
      }

      setRecipientHistory(result)

      if ((result.summary?.sentBefore ?? 0) > 0) {
        toast.success(`Found previous email history for ${result.summary?.sentBefore} recipient(s).`)
      } else {
        toast.success('No previous admin email history found for these recipients.')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not check recipient history.')
    } finally {
      setCheckingRecipients(false)
    }
  }

  const handleUseDefaultTemplate = () => {
    setSender((currentSender) => currentSender.trim() || defaultSender)
    setSubject((currentSubject) => currentSubject.trim() || DEFAULT_EMAIL_TEMPLATE_SUBJECT)
    setMessageMode('html')
    setSelectedTemplateMode('html')
    setHtmlContent(createProfessionalEmailTemplate())
    setEditorContent(null)
    setEditorResetKey((currentKey) => currentKey + 1)
    setState(initialState)

    window.setTimeout(() => {
      document.getElementById('htmlContent')?.focus()
    }, 0)

    toast.success('Formal email template inserted.')
  }

  const handleUseDefaultEditorTemplate = () => {
    const editorData = createProfessionalEditorTemplate()

    setSender((currentSender) => currentSender.trim() || defaultSender)
    setSubject((currentSubject) => currentSubject.trim() || DEFAULT_EMAIL_TEMPLATE_SUBJECT)
    setMessageMode('editorjs')
    setSelectedTemplateMode('editorjs')
    setHtmlContent('')
    setEditorContent(editorData)
    setEditorResetKey((currentKey) => currentKey + 1)
    setState(initialState)

    window.setTimeout(() => {
      void editorRef.current?.render(editorData)
    }, 0)

    toast.success('EditorJS email template inserted.')
  }

  const handleMessageModeChange = (value: string) => {
    const nextMode = value as MessageMode
    setMessageMode(nextMode)
    setSelectedTemplateMode((currentMode) => (currentMode ? nextMode : currentMode))
  }

  const handleUseReplyTemplate = (replyTemplateKind: ReplyTemplateKind) => {
    if (!selectedTemplateMode) {
      toast.error('Select an email template first.')
      return
    }

    const replyTemplate = REPLY_EMAIL_TEMPLATES[replyTemplateKind]

    setSender((currentSender) => currentSender.trim() || defaultSender)
    setSubject(replyTemplate.subject)
    setState(initialState)

    if (selectedTemplateMode === 'html') {
      setMessageMode('html')
      setHtmlContent(createReplyEmailTemplate(replyTemplateKind))
      setEditorContent(null)
      setEditorResetKey((currentKey) => currentKey + 1)

      window.setTimeout(() => {
        document.getElementById('htmlContent')?.focus()
      }, 0)
    } else {
      const editorData = createReplyEditorTemplate(replyTemplateKind)

      setMessageMode('editorjs')
      setHtmlContent('')
      setEditorContent(editorData)
      setEditorResetKey((currentKey) => currentKey + 1)

      window.setTimeout(() => {
        void editorRef.current?.render(editorData)
      }, 0)
    }

    toast.success('Reply email template inserted.')
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
        setRecipientHistory(null)
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

  const canInsertReplyTemplate = selectedTemplateMode !== null
  const canCheckRecipientHistory = recipients.trim().length > 0 && !checkingRecipients

  return (
    <div className="min-w-0">
      <Card className="min-w-0">
        <CardHeader className="grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
          <div className="min-w-0 space-y-1.5">
            <CardTitle className="font-serif">Compose Email</CardTitle>
            <CardDescription>
              Compose with EditorJS or paste a full HTML email, then send it through SMTP2GO.
            </CardDescription>
          </div>
          <div className="flex min-w-0 flex-col gap-2 justify-self-stretch md:col-start-2 md:row-start-1 md:justify-self-end">
            <div className="flex w-full flex-col gap-2 sm:flex-row md:justify-end">
              <Dialog>
                <DialogTrigger asChild>
                  <Button type="button" variant="outline" className="w-full sm:w-auto">
                    <Mail className="mr-2 h-4 w-4" />
                    SMTP2GO
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle className="font-serif">SMTP2GO</DialogTitle>
                    <DialogDescription>Current delivery configuration for this admin tool.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 text-sm">
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
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <div className="flex w-full flex-col gap-2 sm:flex-row md:justify-end">
              <Button
                type="button"
                variant={selectedTemplateMode === 'editorjs' ? 'default' : 'outline'}
                onClick={handleUseDefaultEditorTemplate}
                aria-label="使用 EditorJS 正式邮件模板"
                className="w-full sm:w-auto"
              >
                <FileText className="mr-2 h-4 w-4" />
                EditorJS模板
              </Button>
              <Button
                type="button"
                variant={selectedTemplateMode === 'html' ? 'default' : 'outline'}
                onClick={handleUseDefaultTemplate}
                aria-label="使用 HTML 正式邮件模板"
                className="w-full sm:w-auto"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                HTML模板
              </Button>
            </div>
            <div className="flex w-full flex-col gap-2 sm:flex-row md:justify-end">
              <Button
                type="button"
                variant={canInsertReplyTemplate ? 'default' : 'secondary'}
                disabled={!canInsertReplyTemplate}
                onClick={() => handleUseReplyTemplate('quotationProgress')}
                aria-label="插入报价进度回复"
                title={canInsertReplyTemplate ? undefined : 'Select an EditorJS or HTML template first.'}
                className="w-full sm:w-auto"
              >
                <FileText className="mr-2 h-4 w-4" />
                报价回复
              </Button>
              <Button
                type="button"
                variant={canInsertReplyTemplate ? 'default' : 'secondary'}
                disabled={!canInsertReplyTemplate}
                onClick={() => handleUseReplyTemplate('facebookInquiry')}
                aria-label="插入 Facebook 询盘回复"
                title={canInsertReplyTemplate ? undefined : 'Select an EditorJS or HTML template first.'}
                className="w-full sm:w-auto"
              >
                <Mail className="mr-2 h-4 w-4" />
                Facebook回复
              </Button>
              <Button
                type="button"
                variant={canInsertReplyTemplate ? 'default' : 'secondary'}
                disabled={!canInsertReplyTemplate}
                onClick={() => handleUseReplyTemplate('facebookInquiryNoCatalogue')}
                aria-label="插入 Facebook 无目录回复"
                title={canInsertReplyTemplate ? undefined : 'Select an EditorJS or HTML template first.'}
                className="w-full sm:w-auto"
              >
                <Mail className="mr-2 h-4 w-4" />
                FB无目录
              </Button>
            </div>
          </div>
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
                value={sender}
                onChange={(event) => setSender(event.target.value)}
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
                value={recipients}
                onChange={handleRecipientsChange}
                placeholder="first@example.com, second@example.com"
                required
              />
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  Separate multiple recipients with commas, semicolons, or new lines.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!canCheckRecipientHistory}
                  onClick={handleCheckRecipientHistory}
                  className="w-full sm:w-auto"
                >
                  {checkingRecipients ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="mr-2 h-4 w-4" />
                  )}
                  {checkingRecipients ? 'Checking' : 'Check history'}
                </Button>
              </div>
              {recipientHistory?.results && (
                <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium text-foreground">Recipient send history</p>
                    {recipientHistory.summary && (
                      <p className="text-xs text-muted-foreground">
                        {recipientHistory.summary.sentBefore} sent before, {recipientHistory.summary.newRecipients} new
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    {recipientHistory.results.map((item) => {
                      const hasHistory = item.sentCount > 0

                      return (
                        <div
                          key={item.email}
                          className={`rounded-md border px-3 py-2 text-sm ${
                            hasHistory ? 'border-amber-200 bg-amber-50 text-amber-950' : 'border-green-200 bg-green-50 text-green-950'
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            {hasHistory ? (
                              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                            ) : (
                              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                            )}
                            <div className="min-w-0 flex-1 space-y-1">
                              <p className="break-all font-medium">{item.email}</p>
                              <p className="text-xs">
                                {hasHistory
                                  ? `Sent ${item.sentCount} time${item.sentCount > 1 ? 's' : ''}. Latest: ${formatDateTime(item.latestSentAt)}${item.latestSubject ? ` - ${item.latestSubject}` : ''}`
                                  : 'No admin email history found.'}
                              </p>
                              {item.recentItems.length > 1 && (
                                <div className="space-y-0.5 pt-1 text-xs opacity-80">
                                  {item.recentItems.slice(1).map((recentItem) => (
                                    <p key={recentItem.id} className="truncate">
                                      {formatDateTime(recentItem.createdAt)} - {recentItem.subject}
                                    </p>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
              {state.errors?.to && (
                <p className="text-sm text-destructive">{state.errors.to[0]}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                name="subject"
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                placeholder="SMTP2GO test"
                required
              />
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
              <Tabs value={messageMode} onValueChange={handleMessageModeChange}>
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
                  <div className="email-template-editor">
                    <ContentEditor
                      key={editorResetKey}
                      ref={editorRef}
                      value={editorContent}
                      onChange={setEditorContent}
                      placeholder="Write your email content here..."
                      imageCaption={false}
                    />
                  </div>
                  <style>{`
                    .email-template-editor .image-tool__caption {
                      display: none !important;
                    }

                    .email-template-editor .image-tool__image-picture {
                      height: auto;
                      max-width: 260px !important;
                    }
                  `}</style>
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
    </div>
  )
})

function formatAttachmentSize(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${Math.round((bytes / 1024) * 10) / 10}KB`
  }

  return `${Math.round((bytes / 1024 / 1024) * 10) / 10}MB`
}

function formatDateTime(value?: string) {
  if (!value) {
    return 'unknown time'
  }

  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
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

function createProfessionalEmailTemplate() {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>LAIFAPPE PPE Supply Proposal</title>
  </head>
  <body style="margin:0; padding:0; background:#f4f7fa; font-family:Arial, Helvetica, sans-serif; color:#1f2937;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f4f7fa; padding:28px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:640px; background:#ffffff; border:1px solid #dfe7ef; border-radius:10px;">
            <tr>
              <td style="padding:30px 34px 0;">
                <img src="${LAIFAPPE_LOGO_URL}" width="168" alt="LAIFAPPE logo" style="display:block; width:168px; max-width:100%; height:auto; border:0; margin:0;">
              </td>
            </tr>
            <tr>
              <td style="padding:24px 34px 0;">
                <p style="margin:0 0 18px; font-size:15px; line-height:25px; color:#1f2937;">Dear [Customer Name],</p>

                <p style="margin:0 0 18px; font-size:15px; line-height:25px; color:#1f2937;">
                  Thank you for contacting LAIFAPPE. We are pleased to support your PPE procurement requirements and provide a clear quotation plan based on your project scope, product standards, quantity, and delivery schedule.
                </p>

                <p style="margin:0 0 18px; font-size:15px; line-height:25px; color:#1f2937;">
                  To prepare an accurate proposal, please share any available details for the products you need, including categories, specifications, size range, required certifications, packaging requirements, destination country, and expected delivery timeline.
                </p>

                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:22px 0 24px; border:1px solid #dce5ee; border-left:4px solid #0f3f6e; background:#f8fafc;">
                  <tr>
                    <td style="padding:18px 20px;">
                      <p style="margin:0 0 10px; font-size:14px; line-height:22px; color:#0f3f6e; font-weight:700;">Recommended information for quotation</p>
                      <ul style="margin:0; padding-left:20px; font-size:14px; line-height:24px; color:#334155;">
                        <li>Product name, model, material, or reference image</li>
                        <li>Quantity, size ratio, color, logo, and packaging requirements</li>
                        <li>Applicable safety standards or certification requirements</li>
                        <li>Delivery country, target shipping method, and required lead time</li>
                      </ul>
                    </td>
                  </tr>
                </table>

                <p style="margin:0 0 18px; font-size:15px; line-height:25px; color:#1f2937;">
                  Once we receive your requirements, our sales team will review the details and reply with product recommendations, pricing, MOQ, production lead time, and shipping options.
                </p>

                <p style="margin:0; font-size:15px; line-height:25px; color:#1f2937;">
                  Best regards,<br>
                  <strong>LAIFAPPE Sales Team</strong>
                </p>
              </td>
            </tr>

            <tr>
              <td style="padding:24px 34px 32px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-top:1px solid #dfe7ef;">
                  <tr>
                    <td style="padding:20px 0 0;">
                      <img src="${LAIFAPPE_LOGO_URL}" width="156" alt="LAIFAPPE logo" style="display:block; width:156px; max-width:100%; height:auto; border:0; margin:0 0 12px;">
                      <p style="margin:0 0 8px; font-size:15px; line-height:22px; color:#0f172a; font-weight:700;">LAIFAPPE Safety Equipment Co., Ltd.</p>
                      <p style="margin:0; font-size:13px; line-height:22px; color:#334155;">
                        <span style="color:#64748b;">Website:</span> <a href="https://laifappe.com/" style="color:#0f3f6e; text-decoration:underline;">https://laifappe.com/</a><br>
                        <span style="color:#64748b;">Email:</span> <a href="mailto:sales@laifappe.com" style="color:#0f3f6e; text-decoration:underline;">sales@laifappe.com</a><br>
                        <span style="color:#64748b;">WhatsApp:</span> <a href="https://wa.me/8618029309938" style="color:#0f3f6e; text-decoration:underline;">+86 180 2930 9938</a>
                      </p>
                      <p style="margin:12px 0 0; font-size:12px; line-height:19px; color:#64748b;">
                        Specialized in one-stop PPE supply for engineering, construction, and industrial safety projects.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
}

function createReplyEmailTemplate(replyTemplateKind: ReplyTemplateKind) {
  const replyTemplate = REPLY_EMAIL_TEMPLATES[replyTemplateKind]
  const greeting = replyTemplate.greeting || 'Dear [Customer Name],'
  const signatureName = replyTemplate.signatureName || 'LAIFAPPE Sales Team'
  const paragraphsHtml = replyTemplate.paragraphs
    .map((paragraph, index) => {
      const shouldInsertCatalogue =
        replyTemplate.catalogueUrl && index === replyTemplate.paragraphs.length - 2
      const catalogueHtml = shouldInsertCatalogue
        ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:20px 0 22px; border:1px solid #dce5ee; border-left:4px solid #0f3f6e; background:#f8fafc;">
                  <tr>
                    <td style="padding:16px 18px;">
                      <p style="margin:0 0 8px; font-size:14px; line-height:22px; color:#0f3f6e; font-weight:700;">Product catalogue</p>
                      <p style="margin:0; font-size:14px; line-height:22px; color:#334155;">
                        You may also check our product catalogue here:<br>
                        <a href="${replyTemplate.catalogueUrl}" style="color:#0f3f6e; text-decoration:underline;">${replyTemplate.catalogueUrl}</a>
                      </p>
                    </td>
                  </tr>
                </table>`
        : ''

      return `<p style="margin:0 0 18px; font-size:15px; line-height:25px; color:#1f2937;">
                  ${paragraph}
                </p>
                ${catalogueHtml}`
    })
    .join('')

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${replyTemplate.subject}</title>
  </head>
  <body style="margin:0; padding:0; background:#f4f7fa; font-family:Arial, Helvetica, sans-serif; color:#1f2937;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f4f7fa; padding:28px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:640px; background:#ffffff; border:1px solid #dfe7ef; border-radius:10px;">
            <tr>
              <td style="padding:30px 34px 0;">
                <img src="${LAIFAPPE_LOGO_URL}" width="168" alt="LAIFAPPE logo" style="display:block; width:168px; max-width:100%; height:auto; border:0; margin:0;">
              </td>
            </tr>
            <tr>
              <td style="padding:24px 34px 0;">
                <p style="margin:0 0 18px; font-size:15px; line-height:25px; color:#1f2937;">${greeting}</p>
                ${paragraphsHtml}

                <p style="margin:0; font-size:15px; line-height:25px; color:#1f2937;">
                  Best regards,<br>
                  <strong>${signatureName}</strong>
                </p>
              </td>
            </tr>

            <tr>
              <td style="padding:24px 34px 32px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-top:1px solid #dfe7ef;">
                  <tr>
                    <td style="padding:20px 0 0;">
                      <img src="${LAIFAPPE_LOGO_URL}" width="156" alt="LAIFAPPE logo" style="display:block; width:156px; max-width:100%; height:auto; border:0; margin:0 0 12px;">
                      <p style="margin:0 0 8px; font-size:15px; line-height:22px; color:#0f172a; font-weight:700;">LAIFAPPE Safety Equipment Co., Ltd.</p>
                      <p style="margin:0; font-size:13px; line-height:22px; color:#334155;">
                        <span style="color:#64748b;">Website:</span> <a href="https://laifappe.com/" style="color:#0f3f6e; text-decoration:underline;">https://laifappe.com/</a><br>
                        <span style="color:#64748b;">Email:</span> <a href="mailto:sales@laifappe.com" style="color:#0f3f6e; text-decoration:underline;">sales@laifappe.com</a><br>
                        <span style="color:#64748b;">WhatsApp:</span> <a href="https://wa.me/8618029309938" style="color:#0f3f6e; text-decoration:underline;">+86 180 2930 9938</a>
                      </p>
                      <p style="margin:12px 0 0; font-size:12px; line-height:19px; color:#64748b;">
                        Specialized in one-stop PPE supply for engineering, construction, and industrial safety projects.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
}

function createProfessionalEditorTemplate(): EditorJSData {
  return {
    time: Date.now(),
    blocks: [
      {
        id: createEditorBlockId(),
        type: 'paragraph',
        data: {
          text: 'Dear [Customer Name],',
        },
      },
      {
        id: createEditorBlockId(),
        type: 'paragraph',
        data: {
          text: 'Thank you for contacting LAIFAPPE. We are pleased to support your PPE procurement requirements and provide a clear quotation plan based on your project scope, product standards, quantity, and delivery schedule.',
        },
      },
      {
        id: createEditorBlockId(),
        type: 'paragraph',
        data: {
          text: 'To prepare an accurate proposal, please share any available details for the products you need, including categories, specifications, size range, required certifications, packaging requirements, destination country, and expected delivery timeline.',
        },
      },
      {
        id: createEditorBlockId(),
        type: 'header',
        data: {
          text: 'Recommended information for quotation',
          level: 3,
        },
      },
      {
        id: createEditorBlockId(),
        type: 'list',
        data: {
          style: 'unordered',
          items: [
            {
              content: 'Product name, model, material, or reference image',
              items: [],
            },
            {
              content: 'Quantity, size ratio, color, logo, and packaging requirements',
              items: [],
            },
            {
              content: 'Applicable safety standards or certification requirements',
              items: [],
            },
            {
              content: 'Delivery country, target shipping method, and required lead time',
              items: [],
            },
          ],
        },
      },
      {
        id: createEditorBlockId(),
        type: 'paragraph',
        data: {
          text: 'Once we receive your requirements, our sales team will review the details and reply with product recommendations, pricing, MOQ, production lead time, and shipping options.',
        },
      },
      {
        id: createEditorBlockId(),
        type: 'paragraph',
        data: {
          text: 'Best regards,<br><b>LAIFAPPE Sales Team</b>',
        },
      },
      {
        id: createEditorBlockId(),
        type: 'delimiter',
        data: {},
      },
      {
        id: createEditorBlockId(),
        type: 'image',
        data: {
          file: {
            url: LAIFAPPE_LOGO_URL,
          },
          caption: '',
          withBorder: false,
          stretched: false,
          withBackground: false,
        },
      },
      {
        id: createEditorBlockId(),
        type: 'paragraph',
        data: {
          text: '<b>LAIFAPPE Safety Equipment Co., Ltd.</b>',
        },
      },
      {
        id: createEditorBlockId(),
        type: 'paragraph',
        data: {
          text: 'Website: <a href="https://laifappe.com/">https://laifappe.com/</a><br>Email: <a href="mailto:sales@laifappe.com">sales@laifappe.com</a><br>WhatsApp: <a href="https://wa.me/8618029309938">+86 180 2930 9938</a>',
        },
      },
      {
        id: createEditorBlockId(),
        type: 'paragraph',
        data: {
          text: 'Specialized in one-stop PPE supply for engineering, construction, and industrial safety projects.',
        },
      },
    ],
  }
}

function createReplyEditorTemplate(replyTemplateKind: ReplyTemplateKind): EditorJSData {
  const replyTemplate = REPLY_EMAIL_TEMPLATES[replyTemplateKind]
  const greeting = replyTemplate.greeting || 'Dear [Customer Name],'
  const signatureName = replyTemplate.signatureName || 'LAIFAPPE Sales Team'
  const bodyBlocks = replyTemplate.paragraphs.flatMap((paragraph, index) => {
    const blocks = [createEditorParagraphBlock(paragraph)]

    if (replyTemplate.catalogueUrl && index === replyTemplate.paragraphs.length - 2) {
      blocks.push(
        createEditorParagraphBlock(
          `You may also check our product catalogue here:<br><a href="${replyTemplate.catalogueUrl}">${replyTemplate.catalogueUrl}</a>`
        )
      )
    }

    return blocks
  })

  return {
    time: Date.now(),
    blocks: [
      createEditorParagraphBlock(greeting),
      ...bodyBlocks,
      createEditorParagraphBlock(`Best regards,<br><b>${signatureName}</b>`),
      {
        id: createEditorBlockId(),
        type: 'delimiter',
        data: {},
      },
      {
        id: createEditorBlockId(),
        type: 'image',
        data: {
          file: {
            url: LAIFAPPE_LOGO_URL,
          },
          caption: '',
          withBorder: false,
          stretched: false,
          withBackground: false,
        },
      },
      createEditorParagraphBlock('<b>LAIFAPPE Safety Equipment Co., Ltd.</b>'),
      createEditorParagraphBlock(
        'Website: <a href="https://laifappe.com/">https://laifappe.com/</a><br>Email: <a href="mailto:sales@laifappe.com">sales@laifappe.com</a><br>WhatsApp: <a href="https://wa.me/8618029309938">+86 180 2930 9938</a>'
      ),
      createEditorParagraphBlock(
        'Specialized in one-stop PPE supply for engineering, construction, and industrial safety projects.'
      ),
    ],
  }
}

function createEditorContentFromText(textBody: string): EditorJSData {
  const paragraphs = textBody
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)

  return {
    time: Date.now(),
    blocks: (paragraphs.length > 0 ? paragraphs : ['']).map((paragraph) => ({
      id: createEditorBlockId(),
      type: 'paragraph',
      data: {
        text: escapeEditorText(paragraph).replace(/\n/g, '<br>'),
      },
    })),
  }
}

function createEditorParagraphBlock(text: string) {
  return {
    id: createEditorBlockId(),
    type: 'paragraph',
    data: {
      text,
    },
  }
}

function createEditorBlockId() {
  return Math.random().toString(36).slice(2, 12)
}

function escapeEditorText(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}
