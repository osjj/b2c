import type { OutputData } from '@editorjs/editorjs'
import type { Prisma } from '@prisma/client'

import { prisma } from '@/lib/prisma'

export type AdminEmailAttachmentItem = {
  id: string
  filename: string
  mimetype: string
  size: number
  canDownload: boolean
  storageProvider?: string
  storageKey?: string
  sha256?: string
  deletedAt?: string
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

export type AdminEmailRecipientCheckItem = {
  email: string
  sentCount: number
  latestSentAt?: string
  latestSubject?: string
  recentItems: Array<{
    id: string
    subject: string
    sentBy: string
    createdAt: string
  }>
}

export type StoredAdminEmailAttachmentInput = {
  id: string
  filename: string
  mimetype: string
  size: number
  storageProvider: string
  storageBucket?: string
  storageKey: string
  sha256: string
}

export type CreateAdminEmailMessageInput = {
  id: string
  sender: string
  recipients: string[]
  subject: string
  messageMode: 'editorjs' | 'html'
  editorContent?: OutputData
  previewText: string
  htmlBody?: string
  textBody: string
  attachments: StoredAdminEmailAttachmentInput[]
  sentBy: string
  requestId?: string
}

const DEFAULT_EMAIL_HISTORY_PAGE_SIZE = 20

export function normalizeEmailAddress(value: string) {
  return value.trim().toLowerCase()
}

export function createPreviewText(textBody: string) {
  return textBody.replace(/\s+/g, ' ').trim().slice(0, 240)
}

export async function createAdminEmailMessage(input: CreateAdminEmailMessageInput) {
  const editorContent = toPrismaJson(input.editorContent)

  await prisma.adminEmailMessage.create({
    data: {
      id: input.id,
      sender: input.sender,
      subject: input.subject,
      messageMode: input.messageMode,
      editorContent,
      previewText: input.previewText,
      htmlBody: input.htmlBody,
      textBody: input.textBody,
      sentBy: input.sentBy,
      requestId: input.requestId,
      recipients: {
        create: input.recipients.map((recipient) => ({
          recipient,
          recipientNormalized: normalizeEmailAddress(recipient),
          status: 'SENT',
        })),
      },
      attachments: {
        create: input.attachments.map((attachment) => ({
          id: attachment.id,
          filename: attachment.filename,
          contentType: attachment.mimetype,
          sizeBytes: attachment.size,
          storageProvider: attachment.storageProvider,
          storageBucket: attachment.storageBucket,
          storageKey: attachment.storageKey,
          sha256: attachment.sha256,
        })),
      },
    },
  })
}

export async function getAdminEmailHistoryFromDatabase({
  page = 1,
  limit = DEFAULT_EMAIL_HISTORY_PAGE_SIZE,
}: {
  page?: number
  limit?: number
} = {}) {
  const pageSize = Number.isFinite(limit) ? Math.max(Math.floor(limit), 1) : DEFAULT_EMAIL_HISTORY_PAGE_SIZE
  const requestedPage = Number.isFinite(page) ? Math.max(Math.floor(page), 1) : 1
  const total = await prisma.adminEmailMessage.count()
  const totalPages = Math.ceil(total / pageSize)
  const currentPage = totalPages > 0 ? Math.min(requestedPage, totalPages) : 1
  const skip = (currentPage - 1) * pageSize

  const messages = await prisma.adminEmailMessage.findMany({
    orderBy: { createdAt: 'desc' },
    skip,
    take: pageSize,
    include: {
      recipients: {
        orderBy: { createdAt: 'asc' },
      },
      attachments: {
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  return {
    items: messages.map(toAdminEmailHistoryItem),
    pagination: {
      page: currentPage,
      limit: pageSize,
      total,
      totalPages,
    },
  }
}

export async function checkAdminEmailRecipients(recipients: string[], recentLimit = 3) {
  const normalizedRecipients = Array.from(new Set(recipients.map(normalizeEmailAddress).filter(Boolean)))

  if (normalizedRecipients.length === 0) {
    return []
  }

  const [counts, recentRowsByRecipient] = await Promise.all([
    prisma.adminEmailRecipientLog.groupBy({
      by: ['recipientNormalized'],
      where: {
        recipientNormalized: {
          in: normalizedRecipients,
        },
      },
      _count: {
        _all: true,
      },
    }),
    Promise.all(
      normalizedRecipients.map((recipientNormalized) =>
        prisma.adminEmailRecipientLog.findMany({
          where: { recipientNormalized },
          orderBy: { createdAt: 'desc' },
          take: recentLimit,
          include: {
            message: {
              select: {
                id: true,
                subject: true,
                sentBy: true,
                createdAt: true,
              },
            },
          },
        })
      )
    ),
  ])

  const countMap = new Map(counts.map((item) => [item.recipientNormalized, item._count._all]))

  return normalizedRecipients.map<AdminEmailRecipientCheckItem>((email, index) => {
    const recentRows = recentRowsByRecipient[index] ?? []
    const latestRow = recentRows[0]

    return {
      email,
      sentCount: countMap.get(email) ?? 0,
      latestSentAt: latestRow?.createdAt.toISOString(),
      latestSubject: latestRow?.message.subject,
      recentItems: recentRows.map((row) => ({
        id: row.message.id,
        subject: row.message.subject,
        sentBy: row.message.sentBy,
        createdAt: row.message.createdAt.toISOString(),
      })),
    }
  })
}

export async function getAdminEmailAttachmentForDownload(id: string) {
  return prisma.adminEmailAttachment.findFirst({
    where: {
      id,
      deletedAt: null,
    },
    select: {
      id: true,
      filename: true,
      contentType: true,
      sizeBytes: true,
      storageKey: true,
    },
  })
}

function toAdminEmailHistoryItem(message: Prisma.AdminEmailMessageGetPayload<{
  include: {
    recipients: true
    attachments: true
  }
}>): AdminEmailHistoryItem {
  return {
    id: message.id,
    sender: message.sender,
    recipients: message.recipients.map((recipient) => recipient.recipient),
    subject: message.subject,
    messageMode: message.messageMode === 'html' ? 'html' : 'editorjs',
    editorContent: normalizeEmailEditorContent(message.editorContent),
    previewText: message.previewText,
    htmlBody: message.htmlBody ?? undefined,
    textBody: message.textBody,
    attachments: message.attachments.map((attachment) => ({
      id: attachment.id,
      filename: attachment.filename,
      mimetype: attachment.contentType,
      size: attachment.sizeBytes,
      canDownload: attachment.deletedAt === null && attachment.storageProvider !== 'legacy-json',
      storageProvider: attachment.storageProvider,
      storageKey: attachment.storageKey,
      sha256: attachment.sha256,
      deletedAt: attachment.deletedAt?.toISOString(),
    })),
    sentBy: message.sentBy,
    requestId: message.requestId ?? undefined,
    createdAt: message.createdAt.toISOString(),
  }
}

function normalizeEmailEditorContent(value: Prisma.JsonValue | null): OutputData | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined
  }

  const candidate = value as Partial<OutputData>
  if (!Array.isArray(candidate.blocks)) {
    return undefined
  }

  return candidate as OutputData
}

function toPrismaJson(value?: OutputData): Prisma.InputJsonValue | undefined {
  if (!value) {
    return undefined
  }

  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue
}
