import type { OutputData } from '@editorjs/editorjs'
import { PrismaClient, type Prisma } from '@prisma/client'

const prisma = new PrismaClient()
const LEGACY_EMAIL_HISTORY_KEY = 'admin_email_history'

type LegacyAttachment = {
  filename: string
  mimetype: string
  size: number
}

type LegacyEmailHistoryItem = {
  id: string
  sender: string
  recipients: string[]
  subject: string
  messageMode: 'editorjs' | 'html'
  editorContent?: OutputData
  previewText: string
  htmlBody?: string
  textBody: string
  attachments: LegacyAttachment[]
  sentBy: string
  requestId?: string
  createdAt: string
}

async function main() {
  const setting = await prisma.setting.findUnique({
    where: { key: LEGACY_EMAIL_HISTORY_KEY },
  })
  const legacyItems = normalizeLegacyEmailHistory(setting?.value)

  if (legacyItems.length === 0) {
    process.stdout.write('No legacy admin email history found.\n')
    return
  }

  const existingMessages = await prisma.adminEmailMessage.findMany({
    where: {
      id: {
        in: legacyItems.map((item) => item.id),
      },
    },
    select: {
      id: true,
    },
  })
  const existingIds = new Set(existingMessages.map((message) => message.id))
  const itemsToImport = legacyItems.filter((item) => !existingIds.has(item.id))

  if (itemsToImport.length === 0) {
    process.stdout.write(`Legacy admin email history already imported. Checked ${legacyItems.length} item(s).\n`)
    return
  }

  await prisma.$transaction(
    itemsToImport.map((item) => {
      const createdAt = parseLegacyDate(item.createdAt)
      const editorContent = toPrismaJson(item.editorContent)

      return prisma.adminEmailMessage.create({
        data: {
          id: item.id,
          sender: item.sender,
          subject: item.subject,
          messageMode: item.messageMode,
          editorContent,
          previewText: item.previewText,
          htmlBody: item.htmlBody,
          textBody: item.textBody,
          sentBy: item.sentBy,
          requestId: item.requestId,
          createdAt,
          updatedAt: createdAt,
          recipients: {
            create: item.recipients.map((recipient) => ({
              recipient,
              recipientNormalized: normalizeEmailAddress(recipient),
              status: 'SENT',
              createdAt,
            })),
          },
          attachments: {
            create: item.attachments.map((attachment, index) => {
              const attachmentId = `${item.id}-legacy-${index}`
              const filename = sanitizeAttachmentFileName(attachment.filename)

              return {
                id: attachmentId,
                filename,
                contentType: attachment.mimetype,
                sizeBytes: attachment.size,
                storageProvider: 'legacy-json',
                storageBucket: null,
                storageKey: `legacy-json-unavailable/${item.id}/${index}-${filename}`,
                sha256: `legacy-json-unavailable-${item.id}-${index}`,
                createdAt,
                deletedAt: createdAt,
              }
            }),
          },
        },
      })
    })
  )

  process.stdout.write(`Imported ${itemsToImport.length} legacy admin email history item(s).\n`)
}

function normalizeLegacyEmailHistory(value: unknown): LegacyEmailHistoryItem[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
    .map<LegacyEmailHistoryItem>((item) => ({
      id: String(item.id || ''),
      sender: String(item.sender || ''),
      recipients: Array.isArray(item.recipients)
        ? item.recipients.map((recipient) => String(recipient)).filter(Boolean)
        : [],
      subject: String(item.subject || ''),
      messageMode: item.messageMode === 'html' ? 'html' : 'editorjs',
      editorContent: normalizeEmailEditorContent(item.editorContent),
      previewText: String(item.previewText || ''),
      htmlBody: item.htmlBody ? String(item.htmlBody) : undefined,
      textBody: String(item.textBody || ''),
      attachments: normalizeLegacyAttachments(item.attachments),
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

function normalizeLegacyAttachments(value: unknown): LegacyAttachment[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
    .map((item) => ({
      filename: sanitizeAttachmentFileName(String(item.filename || 'attachment')),
      mimetype: String(item.mimetype || 'application/octet-stream'),
      size: Number(item.size || 0),
    }))
    .filter((item) => item.filename && Number.isFinite(item.size))
}

function normalizeEmailAddress(value: string) {
  return value.trim().toLowerCase()
}

function parseLegacyDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? new Date() : date
}

function sanitizeAttachmentFileName(filename: string) {
  const cleaned = filename.replace(/[\\/\r\n]/g, '_').trim()
  return cleaned || 'attachment'
}

function toPrismaJson(value?: OutputData): Prisma.InputJsonValue | undefined {
  if (!value) {
    return undefined
  }

  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue
}

main()
  .catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : 'Legacy admin email migration failed.'}\n`)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
