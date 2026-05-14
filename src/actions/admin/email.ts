'use server'

import { requireAdmin } from '@/lib/auth-utils'
import { editorJsToEmailContent, htmlToText } from '@/lib/email-content'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import type { OutputData } from '@editorjs/editorjs'
import { z } from 'zod'

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

export type SendAdminEmailState = {
  success?: boolean
  message?: string
  requestId?: string
  error?: string
  errors?: Record<string, string[]>
}

export type AdminEmailAttachmentItem = {
  filename: string
  mimetype: string
  size: number
}

export type AdminEmailHistoryItem = {
  id: string
  sender: string
  recipients: string[]
  subject: string
  messageMode: 'editorjs' | 'html'
  editorContent?: OutputData
  previewText: string
  htmlBody?: string
  textBody: string
  attachments: AdminEmailAttachmentItem[]
  sentBy: string
  requestId?: string
  createdAt: string
}

const EMAIL_HISTORY_KEY = 'admin_email_history'
const DEFAULT_EMAIL_HISTORY_PAGE_SIZE = 20
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

type Smtp2GoAttachment = {
  filename: string
  fileblob: string
  mimetype: string
}

export async function sendAdminEmail(
  prevState: SendAdminEmailState,
  formData: FormData
): Promise<SendAdminEmailState> {
  const admin = await requireAdmin()

  const apiKey = process.env.SMTP2GO_API_KEY

  if (!apiKey) {
    return {
      error: 'SMTP2GO_API_KEY is not configured in the server environment.',
    }
  }

  const parsed = sendEmailSchema.safeParse({
    sender: formData.get('sender'),
    to: formData.get('to'),
    subject: formData.get('subject'),
    messageMode: formData.get('messageMode'),
    editorContent: formData.get('editorContent'),
    htmlContent: formData.get('htmlContent'),
  })

  if (!parsed.success) {
    return {
      errors: parsed.error.flatten().fieldErrors,
    }
  }

  const emailContent = buildEmailContent(parsed.data.messageMode, parsed.data.editorContent, parsed.data.htmlContent)
  if ('errors' in emailContent) {
    return emailContent
  }

  const attachmentsResult = await buildEmailAttachments(formData.getAll('attachments'))
  if ('errors' in attachmentsResult) {
    return attachmentsResult
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
            succeeded?: number
            failures?: number
            email_id?: string
          }
        }
      | null

    if (!response.ok) {
      return {
        error: payload?.error || `SMTP2GO request failed with status ${response.status}.`,
      }
    }

    if (payload?.error) {
      return {
        error: payload.error,
      }
    }

    await appendAdminEmailHistory({
      sender: parsed.data.sender,
      recipients: parsed.data.to,
      subject: parsed.data.subject,
      messageMode: parsed.data.messageMode,
      editorContent: emailContent.editorContent,
      previewText: createPreviewText(emailContent.textBody),
      htmlBody: emailContent.htmlBody,
      textBody: emailContent.textBody,
      attachments: attachmentsResult.historyAttachments,
      sentBy: admin.email || admin.name || 'Admin',
      requestId: payload?.request_id || payload?.data?.email_id || undefined,
    })

    return {
      success: true,
      message: `Email sent to ${parsed.data.to.length} recipient${parsed.data.to.length > 1 ? 's' : ''}${
        attachmentsResult.historyAttachments.length > 0
          ? ` with ${attachmentsResult.historyAttachments.length} attachment${attachmentsResult.historyAttachments.length > 1 ? 's' : ''}`
          : ''
      }.`,
      requestId: payload?.request_id || payload?.data?.email_id,
    }
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : 'An unexpected error occurred while sending the email.',
    }
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

export async function getAdminEmailHistory({
  page = 1,
  limit = DEFAULT_EMAIL_HISTORY_PAGE_SIZE,
}: {
  page?: number
  limit?: number
} = {}) {
  await requireAdmin()

  const setting = await prisma.setting.findUnique({
    where: { key: EMAIL_HISTORY_KEY },
  })

  const history = normalizeEmailHistory(setting?.value)
  const pageSize = Number.isFinite(limit) ? Math.max(Math.floor(limit), 1) : DEFAULT_EMAIL_HISTORY_PAGE_SIZE
  const requestedPage = Number.isFinite(page) ? Math.max(Math.floor(page), 1) : 1
  const total = history.length
  const totalPages = Math.ceil(total / pageSize)
  const currentPage = totalPages > 0 ? Math.min(requestedPage, totalPages) : 1
  const start = (currentPage - 1) * pageSize

  return {
    items: history.slice(start, start + pageSize),
    pagination: {
      page: currentPage,
      limit: pageSize,
      total,
      totalPages,
    },
  }
}

function buildEmailContent(
  messageMode: 'editorjs' | 'html',
  editorContentRaw?: string,
  htmlContentRaw?: string
):
  | { textBody: string; htmlBody?: string; editorContent?: OutputData }
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
    editorContent: parsedContent,
    htmlBody: htmlBody || undefined,
    textBody: textBody || ' ',
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
      editorContent: normalizeEmailEditorContent(item.editorContent),
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

function normalizeEmailEditorContent(value: unknown): OutputData | undefined {
  if (!value || typeof value !== 'object') {
    return undefined
  }

  const candidate = value as Partial<OutputData>
  if (!Array.isArray(candidate.blocks)) {
    return undefined
  }

  return candidate as OutputData
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

function createPreviewText(textBody: string) {
  return textBody.replace(/\s+/g, ' ').trim().slice(0, 240)
}
