import type { SearchObject } from 'imapflow'

import { isScopedMailboxMessage, type metadataFromParsed } from './mime'
import { isRfcMessageId } from './threading'

export const MAX_DISCOVERY_IDS = 200
export const MAX_DISCOVERY_IDS_PER_QUERY = 20
export const MAX_DISCOVERY_QUERY_BYTES = 12 * 1024
export const MAX_DISCOVERY_CANDIDATES = 200

export type MailboxDiscoveryMessage = { messageId: string | null; references: string[]; inReplyTo: string[] }
export type MailboxDiscoveryPlan = { conservativeRescan: boolean; queries: SearchObject[]; ids: string[] }

function headerSearch(id: string): SearchObject[] {
  return ['MESSAGE-ID', 'REFERENCES', 'IN-REPLY-TO'].map(header => ({ header: { [header]: id } }))
}

/** The caller supplies only this account's durable, not-yet-probed IMAP imports. */
export function planMailboxDiscovery(imported: readonly MailboxDiscoveryMessage[], existingMessageIds: ReadonlySet<string>): MailboxDiscoveryPlan {
  const ids = new Set<string>()
  for (const message of imported) {
    // New message IDs can unlock an earlier skipped child. Missing ancestors can
    // unlock the original parent or a sibling that shares the same reference.
    // Already imported ancestors need no probe: their scope was previously known.
    if (isRfcMessageId(message.messageId)) ids.add(message.messageId)
    for (const reference of [...message.references, ...message.inReplyTo]) {
      if (isRfcMessageId(reference) && !existingMessageIds.has(reference)) ids.add(reference)
    }
    if (ids.size > MAX_DISCOVERY_IDS) return { conservativeRescan: true, queries: [], ids: [] }
  }

  const queries: SearchObject[] = []
  let batch: string[] = []
  for (const id of ids) {
    const proposed = [...batch, id]
    const query = { or: proposed.flatMap(headerSearch) }
    if (batch.length && (proposed.length > MAX_DISCOVERY_IDS_PER_QUERY || Buffer.byteLength(JSON.stringify(query)) > MAX_DISCOVERY_QUERY_BYTES)) {
      queries.push({ or: batch.flatMap(headerSearch) })
      batch = []
    }
    batch.push(id)
    if (Buffer.byteLength(JSON.stringify({ or: batch.flatMap(headerSearch) })) > MAX_DISCOVERY_QUERY_BYTES) {
      return { conservativeRescan: true, queries: [], ids: [] }
    }
  }
  if (batch.length) queries.push({ or: batch.flatMap(headerSearch) })
  return { conservativeRescan: false, queries, ids: [...ids] }
}

/** IMAP HEADER searches are substring matches; verify parsed IDs before rescan. */
export function discoveryCandidateNeedsRescan(
  metadata: ReturnType<typeof metadataFromParsed>,
  existingMessageIds: ReadonlySet<string>,
  knownReferenceIds: Set<string>,
  aliases: string[],
): boolean {
  if (metadata.messageId && existingMessageIds.has(metadata.messageId)) return false
  // A matching message without an RFC ID cannot be ruled out by headers alone.
  // The bounded history pass will use its raw-MIME hash to suppress duplicates.
  return isScopedMailboxMessage(metadata, aliases, knownReferenceIds)
}
