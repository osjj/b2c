import { z } from 'zod'
import { MailboxError } from './errors'
import { readRichMailboxContent } from './rich-content'

const messageIdSchema = z.union([z.string().regex(/^[a-z0-9]{20,40}$/), z.uuid()])
export interface MailboxContentRepository {
  getMessage(account: string, id: string): Promise<{ rawMime: Uint8Array | null } | null>
}

export const mailboxContentSchema = z.object({
  html: z.string().nullable(), hasRemoteImages: z.boolean(),
  omittedImages: z.number().int().nonnegative(), inlineImageCount: z.number().int().nonnegative(),
})

export async function readMailboxContent(account: string, id: string, repository: MailboxContentRepository) {
  if (!messageIdSchema.safeParse(id).success) throw new MailboxError('VALIDATION_FAILED', 'Invalid message identifier.')
  const row = await repository.getMessage(account, id)
  if (!row) throw new MailboxError('NOT_FOUND', 'Message not found.', 404)
  const content = await readRichMailboxContent(row.rawMime)
  return mailboxContentSchema.parse({
    html: content.previewHtml, hasRemoteImages: content.hasRemoteImages,
    omittedImages: content.omittedImages, inlineImageCount: content.inlineImages.length,
  })
}
