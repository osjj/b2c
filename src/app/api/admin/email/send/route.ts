import type { OutputData } from '@editorjs/editorjs'
import { createHash, randomUUID } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { requireAdmin } from '@/lib/auth-utils'
import { editorJsToEmailContent, htmlToText } from '@/lib/email-content'
import {
  createAdminEmailMessage,
  createPreviewText,
  type StoredAdminEmailAttachmentInput,
} from '@/lib/admin-email-store'
import {
  assertR2Configured,
  deleteObjectFromR2,
  r2BucketName,
  uploadObjectToR2,
} from '@/lib/r2'

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

type PreparedEmailAttachment = {
  filename: string
  mimetype: string
  size: number
  buffer: Buffer
  sha256: string
  smtpAttachment: Smtp2GoAttachment
}

type Smtp2GoResponsePayload = {
  request_id?: string
  error?: string
  data?: {
    email_id?: string
  }
  email_response?: {
    email_id?: string
  }
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

  const messageId = randomUUID()
  let uploadedAttachments: StoredAdminEmailAttachmentInput[] = []
  let smtpSucceeded = false

  try {
    uploadedAttachments = await uploadEmailAttachments(messageId, attachmentsResult.preparedAttachments)

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

    const payload = (await response.json().catch(() => null)) as Smtp2GoResponsePayload | null

    if (!response.ok) {
      await cleanupUploadedAttachments(uploadedAttachments)
      return NextResponse.json(
        { error: payload?.error || `SMTP2GO request failed with status ${response.status}.` },
        { status: response.status }
      )
    }

    if (payload?.error) {
      await cleanupUploadedAttachments(uploadedAttachments)
      return NextResponse.json({ error: payload.error }, { status: 400 })
    }

    smtpSucceeded = true

    const requestId = payload?.request_id || payload?.data?.email_id || payload?.email_response?.email_id

    await createAdminEmailMessage({
      id: messageId,
      sender: parsed.data.sender,
      recipients: parsed.data.to,
      subject: parsed.data.subject,
      messageMode: parsed.data.messageMode,
      editorContent: emailContent.editorContent,
      previewText: createPreviewText(emailContent.textBody),
      htmlBody: emailContent.htmlBody,
      textBody: emailContent.textBody,
      attachments: uploadedAttachments,
      sentBy: admin.email || admin.name || 'Admin',
      requestId,
    })

    revalidatePath('/admin/email')

    return NextResponse.json({
      success: true,
      message: `Email sent to ${parsed.data.to.length} recipient${parsed.data.to.length > 1 ? 's' : ''}${
        uploadedAttachments.length > 0
          ? ` with ${uploadedAttachments.length} attachment${uploadedAttachments.length > 1 ? 's' : ''}`
          : ''
      }.`,
      requestId,
    })
  } catch (error) {
    if (!smtpSucceeded) {
      await cleanupUploadedAttachments(uploadedAttachments)
    }

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

async function buildEmailAttachments(
  values: FormDataEntryValue[]
): Promise<
  | {
      smtpAttachments: Smtp2GoAttachment[]
      preparedAttachments: PreparedEmailAttachment[]
    }
  | { errors: Record<string, string[]> }
> {
  const files = values.filter((value): value is File => value instanceof File && value.size > 0)

  if (files.length === 0) {
    return {
      smtpAttachments: [],
      preparedAttachments: [],
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
      const buffer = Buffer.from(await file.arrayBuffer())
      const sha256 = createHash('sha256').update(buffer).digest('hex')

      return {
        filename,
        mimetype,
        size: file.size,
        buffer,
        sha256,
        smtpAttachment: {
          filename,
          fileblob: buffer.toString('base64'),
          mimetype,
        },
      }
    })
  )

  return {
    smtpAttachments: preparedAttachments.map((attachment) => attachment.smtpAttachment),
    preparedAttachments,
  }
}

async function uploadEmailAttachments(
  messageId: string,
  attachments: PreparedEmailAttachment[]
): Promise<StoredAdminEmailAttachmentInput[]> {
  if (attachments.length === 0) {
    return []
  }

  assertR2Configured()

  const uploadResults = await Promise.allSettled(
    attachments.map(async (attachment): Promise<StoredAdminEmailAttachmentInput> => {
      const attachmentId = randomUUID()
      const storageKey = `admin-email-attachments/${messageId}/${attachmentId}-${attachment.filename}`

      await uploadObjectToR2(storageKey, attachment.buffer, attachment.mimetype)

      return {
        id: attachmentId,
        filename: attachment.filename,
        mimetype: attachment.mimetype,
        size: attachment.size,
        storageProvider: 'r2',
        storageBucket: r2BucketName,
        storageKey,
        sha256: attachment.sha256,
      }
    })
  )

  const uploadedAttachments = uploadResults
    .filter((result): result is PromiseFulfilledResult<StoredAdminEmailAttachmentInput> => result.status === 'fulfilled')
    .map((result) => result.value)

  const failedUpload = uploadResults.find((result) => result.status === 'rejected')
  if (failedUpload) {
    await cleanupUploadedAttachments(uploadedAttachments)
    throw new Error('Attachment upload to object storage failed. The email was not sent.')
  }

  return uploadedAttachments
}

async function cleanupUploadedAttachments(attachments: StoredAdminEmailAttachmentInput[]) {
  if (attachments.length === 0) {
    return
  }

  await Promise.allSettled(attachments.map((attachment) => deleteObjectFromR2(attachment.storageKey)))
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
