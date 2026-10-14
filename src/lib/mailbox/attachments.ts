import { simpleParser } from 'mailparser'
import { z } from 'zod'

import { MAX_RAW_MIME_BYTES } from './config'
import { MailboxError } from './errors'
import { safeAttachmentFilename } from './mime'

const messageIdSchema = z.union([z.string().regex(/^[a-z0-9]{20,40}$/), z.uuid()])
type AttachmentRepository = {
  getRawMime(account: string, id: string): Promise<Uint8Array | null>
}

export async function readMailboxAttachment(account: string, id: string, index: string, repository: AttachmentRepository) {
  // Imported messages use Prisma CUIDs; replies use independently generated UUIDs.
  if (!messageIdSchema.safeParse(id).success || !/^\d{1,4}$/.test(index)) {
    throw new MailboxError('VALIDATION_FAILED', 'Invalid attachment identifier.')
  }
  const rawMime = await repository.getRawMime(account, id)
  if (!rawMime) throw new MailboxError('NOT_FOUND', 'Attachment not found.', 404)
  if (rawMime.byteLength > MAX_RAW_MIME_BYTES) throw new MailboxError('MESSAGE_TOO_LARGE', 'The stored message exceeds the attachment processing limit.', 413)
  const mail = await simpleParser(Buffer.from(rawMime), { skipHtmlToText: true, skipTextToHtml: true, skipImageLinks: true })
  const attachment = mail.attachments[Number(index)]
  if (!attachment) throw new MailboxError('NOT_FOUND', 'Attachment not found.', 404)
  return {
    filename: safeAttachmentFilename(attachment.filename || `attachment-${Number(index) + 1}`),
    content: new Uint8Array(attachment.content),
  }
}
