import type { OutputData } from '@editorjs/editorjs'
import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { requireAdmin } from '@/lib/auth-utils'
import { editorJsToEmailContent, htmlToText } from '@/lib/email-content'
import { prisma } from '@/lib/prisma'

const recipientListSchema = z
  .string()
  .trim()
  .min(1, 'At least one recipient is required')
  .transform((value) =>
    value
      .split(/[\n,;]+/)
      .map((item) => item.trim())
      .filter(Boolean)
  )
  .refine((items) => items.length > 0, 'At least one recipient is required')
  .refine(
    (items) => items.every((item) => z.email().safeParse(item).success),
    'One or more recipient email addresses are invalid'
  )

const optionalFormStringSchema = z.preprocess(
  (value) => (value === null ? undefined : value),
  z.string().optional()
)

const sendEmailSchema = z.object({
  sender: z.email('Sender email is invalid'),
  to: recipientListSchema,
  subject: z.string().trim().min(1, 'Subject is required').max(200, 'Subject is too long'),
  messageMode: z.enum(['editorjs', 'html']),
  editorContent: optionalFormStringSchema,
  htmlContent: optionalFormStringSchema,
})

const EMAIL_HISTORY_KEY = 'admin_email_history'
const MAX_ATTACHMENT_COUNT = 5
const MAX_ATTACHMENT_TOTAL_BYTES = 25 * 1024 * 1024
const ALLOWED_ATTACHMENT_EXTENSIONS = new Set(['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png', 'gif', 'webp'])
const MIME_BY_EXTENSION: Record<string, string> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
}

type AdminEmailAttachmentItem = {
  filename: string
  mimetype: string
  size: number
}

type AdminEmailHistoryItem = {
  id: string
  sender: string
  recipients: string[]
  subject: string
  messageMode: 'editorjs' | 'html'
  previewText: string
  htmlBody?: string
  textBody: string
  attachments: AdminEmailAttachmentItem[]
  sentBy: string
  requestId?: string
  createdAt: string
}

type Smtp2GoAttachment = {
  filename: string
  fileblob: string
  mimetype: string
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin()
  const apiKey = process.env.SMTP2GO_API_KEY

  if (!apiKey) {
    return NextResponse.json(
      { error: 'SMTP2GO_API_KEY is not configured in the server environment.' },
      { status: 500 }
    )
  }

  const formData = await request.formData()
  const parsed = sendEmailSchema.safeParse({
    sender: formData.get('sender'),
    to: formData.get('to'),
    subject: formData.get('subject'),
    messageMode: formData.get('messageMode'),
    editorContent: formData.get('editorContent'),
    htmlContent: formData.get('htmlContent'),
  })

  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const emailContent = buildEmailContent(parsed.data.messageMode, parsed.data.editorContent, parsed.data.htmlContent)
  if ('errors' in emailContent) {
    return NextResponse.json(emailContent, { status: 400 })
  }

  const attachmentsResult = await buildEmailAttachments(formData.getAll('attachments'))
  if ('errors' in attachmentsResult) {
    return NextResponse.json(attachmentsResult, { status: 400 })
  }

  try {
    const response = await fetch('https://api.smtp2go.com/v3/email/send', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Smtp2go-Api-Key': apiKey,
      },
      body: JSON.stringify({
        sender: parsed.data.sender,
        to: parsed.data.to,
        subject: parsed.data.subject,
        text_body: emailContent.textBody,
        ...(emailContent.htmlBody ? { html_body: emailContent.htmlBody } : {}),
        ...(attachmentsResult.smtpAttachments.length > 0 ? { attachments: attachmentsResult.smtpAttachments } : {}),
      }),
      cache: 'no-store',
    })

    const payload = (await response.json().catch(() => null)) as
      | {
          request_id?: string
          error?: string
          data?: {
            email_id?: string
          }
          email_response?: {
            email_id?: string
          }
        }
      | null

    if (!response.ok) {
      return NextResponse.json(
        { error: payload?.error || `SMTP2GO request failed with status ${response.status}.` },
        { status: response.status }
      )
    }

    if (payload?.error) {
      return NextResponse.json({ error: payload.error }, { status: 400 })
    }

    const requestId = payload?.request_id || payload?.data?.email_id || payload?.email_response?.email_id

    await appendAdminEmailHistory({
      sender: parsed.data.sender,
      recipients: parsed.data.to,
      subject: parsed.data.subject,
      messageMode: parsed.data.messageMode,
      previewText: createPreviewText(emailContent.textBody),
      htmlBody: emailContent.htmlBody,
      textBody: emailContent.textBody,
      attachments: attachmentsResult.historyAttachments,
      sentBy: admin.email || admin.name || 'Admin',
      requestId,
    })

    return NextResponse.json({
      success: true,
      message: `Email sent to ${parsed.data.to.length} recipient${parsed.data.to.length > 1 ? 's' : ''}${
        attachmentsResult.historyAttachments.length > 0
          ? ` with ${attachmentsResult.historyAttachments.length} attachment${attachmentsResult.historyAttachments.length > 1 ? 's' : ''}`
          : ''
      }.`,
      requestId,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred while sending the email.',
      },
      { status: 500 }
    )
  }
}

function buildEmailContent(
  messageMode: 'editorjs' | 'html',
  editorContentRaw?: string,
  htmlContentRaw?: string
):
  | { textBody: string; htmlBody?: string }
  | { errors: Record<string, string[]> } {
  if (messageMode === 'html') {
    const htmlContent = (htmlContentRaw || '').trim()

    if (!htmlContent) {
      return {
        errors: {
          htmlContent: ['HTML message is required'],
        },
      }
    }

    return {
      htmlBody: htmlContent,
      textBody: htmlToText(htmlContent) || ' ',
    }
  }

  if (!editorContentRaw) {
    return {
      errors: {
        editorContent: ['Message body is required'],
      },
    }
  }

  let parsedContent: OutputData

  try {
    parsedContent = JSON.parse(editorContentRaw) as OutputData
  } catch {
    return {
      errors: {
        editorContent: ['Editor content is invalid'],
      },
    }
  }

  if (!Array.isArray(parsedContent.blocks) || parsedContent.blocks.length === 0) {
    return {
      errors: {
        editorContent: ['Message body is required'],
      },
    }
  }

  const { htmlBody, textBody } = editorJsToEmailContent(parsedContent)

  if (!textBody && !htmlBody) {
    return {
      errors: {
        editorContent: ['Message body is required'],
      },
    }
  }

  return {
    htmlBody: htmlBody || undefined,
    textBody: textBody || ' ',
  }
}

async function buildEmailAttachments(
  values: FormDataEntryValue[]
): Promise<
  | {
      smtpAttachments: Smtp2GoAttachment[]
      historyAttachments: AdminEmailAttachmentItem[]
    }
  | { errors: Record<string, string[]> }
> {
  const files = values.filter((value): value is File => value instanceof File && value.size > 0)

  if (files.length === 0) {
    return {
      smtpAttachments: [],
      historyAttachments: [],
    }
  }

  if (files.length > MAX_ATTACHMENT_COUNT) {
    return {
      errors: {
        attachments: [`Attach up to ${MAX_ATTACHMENT_COUNT} files per email.`],
      },
    }
  }

  const totalSize = files.reduce((sum, file) => sum + file.size, 0)
  if (totalSize > MAX_ATTACHMENT_TOTAL_BYTES) {
    return {
      errors: {
        attachments: [`Attachments must be ${formatFileSize(MAX_ATTACHMENT_TOTAL_BYTES)} or less before encoding.`],
      },
    }
  }

  const invalidFile = files.find((file) => !isAllowedAttachment(file))
  if (invalidFile) {
    return {
      errors: {
        attachments: [`${invalidFile.name} is not an allowed attachment type.`],
      },
    }
  }

  const preparedAttachments = await Promise.all(
    files.map(async (file) => {
      const filename = sanitizeAttachmentFileName(file.name)
      const mimetype = getAttachmentMimeType(file)
      const fileblob = Buffer.from(await file.arrayBuffer()).toString('base64')

      return {
        smtpAttachment: {
          filename,
          fileblob,
          mimetype,
        },
        historyAttachment: {
          filename,
          mimetype,
          size: file.size,
        },
      }
    })
  )

  return {
    smtpAttachments: preparedAttachments.map((attachment) => attachment.smtpAttachment),
    historyAttachments: preparedAttachments.map((attachment) => attachment.historyAttachment),
  }
}

async function appendAdminEmailHistory(
  entry: Omit<AdminEmailHistoryItem, 'id' | 'createdAt'>
) {
  const existingSetting = await prisma.setting.findUnique({
    where: { key: EMAIL_HISTORY_KEY },
  })

  const existingHistory = normalizeEmailHistory(existingSetting?.value)
  const nextHistory: AdminEmailHistoryItem[] = [
    {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
      ...entry,
    },
    ...existingHistory,
  ].slice(0, 100)

  await prisma.setting.upsert({
    where: { key: EMAIL_HISTORY_KEY },
    update: { value: nextHistory as never },
    create: { key: EMAIL_HISTORY_KEY, value: nextHistory as never },
  })

  revalidatePath('/admin/email')
}

function normalizeEmailHistory(value: unknown): AdminEmailHistoryItem[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
    .map((item) => ({
      id: String(item.id || ''),
      sender: String(item.sender || ''),
      recipients: Array.isArray(item.recipients)
        ? item.recipients.map((recipient) => String(recipient))
        : [],
      subject: String(item.subject || ''),
      messageMode: (item.messageMode === 'html' ? 'html' : 'editorjs') as 'html' | 'editorjs',
      previewText: String(item.previewText || ''),
      htmlBody: item.htmlBody ? String(item.htmlBody) : undefined,
      textBody: String(item.textBody || ''),
      attachments: normalizeEmailHistoryAttachments(item.attachments),
      sentBy: String(item.sentBy || 'Admin'),
      requestId: item.requestId ? String(item.requestId) : undefined,
      createdAt: String(item.createdAt || ''),
    }))
    .filter((item) => item.id && item.subject && item.createdAt)
}

function normalizeEmailHistoryAttachments(value: unknown): AdminEmailAttachmentItem[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
    .map((item) => ({
      filename: String(item.filename || ''),
      mimetype: String(item.mimetype || 'application/octet-stream'),
      size: Number(item.size || 0),
    }))
    .filter((item) => item.filename && Number.isFinite(item.size))
}

function isAllowedAttachment(file: File) {
  return ALLOWED_ATTACHMENT_EXTENSIONS.has(getFileExtension(file.name))
}

function getAttachmentMimeType(file: File) {
  const extension = getFileExtension(file.name)
  return file.type || MIME_BY_EXTENSION[extension] || 'application/octet-stream'
}

function getFileExtension(filename: string) {
  return filename.split('.').pop()?.toLowerCase() || ''
}

function sanitizeAttachmentFileName(filename: string) {
  const cleaned = filename.replace(/[\\/\r\n]/g, '_').trim()
  return cleaned || 'attachment'
}

function formatFileSize(bytes: number) {
  return `${Math.round((bytes / 1024 / 1024) * 10) / 10}MB`
}

function createPreviewText(textBody: string) {
  return textBody.replace(/\s+/g, ' ').trim().slice(0, 240)
}
