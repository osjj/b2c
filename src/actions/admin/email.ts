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

const sendEmailSchema = z.object({
  sender: z.email('Sender email is invalid'),
  to: recipientListSchema,
  subject: z.string().trim().min(1, 'Subject is required').max(200, 'Subject is too long'),
  messageMode: z.enum(['editorjs', 'html']),
  editorContent: z.string().optional(),
  htmlContent: z.string().optional(),
})

export type SendAdminEmailState = {
  success?: boolean
  message?: string
  requestId?: string
  error?: string
  errors?: Record<string, string[]>
}

export type AdminEmailHistoryItem = {
  id: string
  sender: string
  recipients: string[]
  subject: string
  messageMode: 'editorjs' | 'html'
  previewText: string
  htmlBody?: string
  textBody: string
  sentBy: string
  requestId?: string
  createdAt: string
}

const EMAIL_HISTORY_KEY = 'admin_email_history'

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
      previewText: createPreviewText(emailContent.textBody),
      htmlBody: emailContent.htmlBody,
      textBody: emailContent.textBody,
      sentBy: admin.email || admin.name || 'Admin',
      requestId: payload?.request_id || payload?.data?.email_id || undefined,
    })

    return {
      success: true,
      message: `Email sent to ${parsed.data.to.length} recipient${parsed.data.to.length > 1 ? 's' : ''}.`,
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

export async function getAdminEmailHistory(limit = 20) {
  await requireAdmin()

  const setting = await prisma.setting.findUnique({
    where: { key: EMAIL_HISTORY_KEY },
  })

  return normalizeEmailHistory(setting?.value).slice(0, limit)
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
      sentBy: String(item.sentBy || 'Admin'),
      requestId: item.requestId ? String(item.requestId) : undefined,
      createdAt: String(item.createdAt || ''),
    }))
    .filter((item) => item.id && item.subject && item.createdAt)
}

function createPreviewText(textBody: string) {
  return textBody.replace(/\s+/g, ' ').trim().slice(0, 240)
}
