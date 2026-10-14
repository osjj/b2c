import { z } from 'zod'

export const mailboxAddressSchema = z.object({ address: z.string(), name: z.string().optional() })
export const mailboxAttachmentSchema = z.object({
  index: z.number().int().nonnegative(), filename: z.string(), contentType: z.string(), size: z.number().nonnegative(),
})
export const mailboxMessageSchema = z.object({
  id: z.string(), threadKey: z.string(), direction: z.enum(['INBOUND', 'OUTBOUND']), messageId: z.string().nullable(),
  from: mailboxAddressSchema, replyTo: z.array(mailboxAddressSchema), to: z.array(mailboxAddressSchema),
  cc: z.array(mailboxAddressSchema), subject: z.string(), textBody: z.string(), sentAt: z.string(),
  attachments: z.array(mailboxAttachmentSchema),
})
export const mailboxThreadSchema = z.object({
  threadKey: z.string(), subject: z.string(), preview: z.string(), latestAt: z.string(),
  messageCount: z.number().int(), participants: z.array(z.string()),
})
export const mailboxStatusSchema = z.object({
  configured: z.boolean(), smtpConfigured: z.boolean(), account: z.string().nullable(), aliases: z.array(z.string()),
  ownAddresses: z.array(z.string()), defaultSender: z.string(), lastSyncedAt: z.string().nullable(), syncSince: z.string(),
})
export type MailboxAddress = z.infer<typeof mailboxAddressSchema>
export type MailboxAttachment = z.infer<typeof mailboxAttachmentSchema>
export type MailboxMessage = z.infer<typeof mailboxMessageSchema>
export type MailboxThread = z.infer<typeof mailboxThreadSchema>
export type MailboxStatus = z.infer<typeof mailboxStatusSchema>
