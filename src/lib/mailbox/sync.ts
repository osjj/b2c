import { createHash, randomUUID } from 'node:crypto'
import { ImapFlow, type FetchMessageObject } from 'imapflow'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getMailboxConfig, MAX_RAW_MIME_BYTES, parseHistoryDate } from './config'
import { MailboxError } from './errors'
import { isScopedMailboxMessage, parseMailboxHeaders, parseMailboxMime } from './mime'
import { persistMailboxMessage } from './store'
import { discoveryCandidateNeedsRescan, planMailboxDiscovery } from './discovery'

const SYNC_DEADLINE_MS = 45_000
const SYNC_LEASE_MS = 90_000
const MAX_RELEVANT_PER_FOLDER = 50
const MAX_HEADERS_PER_PASS = 100
const HEADER_FIELDS = ['FROM', 'TO', 'CC', 'REPLY-TO', 'SUBJECT', 'MESSAGE-ID', 'REFERENCES', 'IN-REPLY-TO', 'DELIVERED-TO', 'X-ORIGINAL-TO', 'ENVELOPE-TO', 'DATE']

type RangeInput = { start: number; end: number; since: Date; maxRelevant: number; maxScanned: number }
type Header = { headers: Buffer; size: number; internalDate: Date }
type RangeDependencies = {
  search: (start: number, end: number, since: Date) => Promise<number[]>
  readHeaders: (uid: number) => Promise<Header | null>
  relevant: (headers: Buffer) => Promise<boolean>
  consume: (uid: number, header: Header) => Promise<boolean>
  checkpoint: (uid: number, complete: boolean) => Promise<void>
  shouldStop: () => boolean
}

export function mailboxScopeHash(aliases: string[], folders: string[]): string {
  return createHash('sha256').update(JSON.stringify({ aliases: [...new Set(aliases.map(value => value.toLowerCase()))].sort(), folders: [...new Set(folders)].sort() })).digest('hex')
}

/** A fixed point is reached only after every selected folder finishes a round with no new business messages. */
export function needsHistoryReconciliation(hasMore: boolean, generationImported: number): boolean {
  return !hasMore && generationImported > 0
}

/** Sequential checkpoints are deliberate: an error must never skip the failing UID. */
export async function scanUidRange(input: RangeInput, deps: RangeDependencies) {
  if (input.start > input.end) return { imported: 0, skipped: 0, relevant: 0, complete: true }
  const found = (await deps.search(input.start, input.end, input.since)).filter(uid => uid >= input.start && uid <= input.end).sort((a, b) => a - b)
  const uids = found.slice(0, input.maxScanned)
  let imported = 0
  let skipped = 0
  let relevant = 0
  let processed = 0
  let pendingUid: number | null = null
  let flushedUid: number | null = null
  try {
    for (const uid of uids) {
      if (deps.shouldStop() || relevant >= input.maxRelevant) break
      const header = await deps.readHeaders(uid)
      if (!header) {
        // An IMAP expunge between SEARCH and FETCH is safe to advance past.
        skipped++
      } else if (await deps.relevant(header.headers)) {
        if (header.size > MAX_RAW_MIME_BYTES) throw new MailboxError('MESSAGE_TOO_LARGE', 'A relevant message exceeds the 25 MiB import limit. The scan has stopped before this message.', 413)
        if (await deps.consume(uid, header)) imported++
        else skipped++
        relevant++
      } else skipped++
      pendingUid = uid
      processed++
      // A crash may replay one ten-header batch; message persistence is idempotent.
      // Batching avoids a remote transaction per unrelated/already imported email.
      if (processed % 10 === 0) {
        await deps.checkpoint(uid, false)
        flushedUid = uid
      }
    }
  } catch (error) {
    if (pendingUid !== null && pendingUid !== flushedUid) {
      try { await deps.checkpoint(pendingUid, false) } catch { /* Earlier durable cursor remains safe to replay. */ }
    }
    throw error
  }
  const complete = processed === found.length
  if (complete) await deps.checkpoint(input.end, true)
  else if (pendingUid !== null && pendingUid !== flushedUid) await deps.checkpoint(pendingUid, false)
  return { imported, skipped, relevant, complete }
}

function headerFromFetch(value: FetchMessageObject | false | undefined): Header | null {
  if (!value) return null
  if (!value.headers || typeof value.size !== 'number') throw new MailboxError('IMAP_INCOMPLETE_RESPONSE', 'The mailbox returned incomplete message headers. Sync can be retried.', 503)
  return { headers: value.headers, size: value.size, internalDate: value.internalDate instanceof Date ? value.internalDate : new Date() }
}

export async function syncMailbox(input: { since?: string } = {}, diagnostics?: (event: { stage: string; code: string }) => void) {
  const config = getMailboxConfig()
  if (!config.imap || !config.account) throw new MailboxError('MAILBOX_NOT_CONFIGURED', 'Configure the QQ mailbox address and IMAP authorization code first.', 503)
  const { account, imap } = config
  const requestedSince = input.since ? parseHistoryDate(input.since) : config.since
  const lockToken = randomUUID()
  await prisma.adminMailboxSyncState.upsert({ where: { account }, create: { account }, update: {} })
  const acquired = await prisma.adminMailboxSyncState.updateMany({
    where: { account, OR: [{ leaseUntil: null }, { leaseUntil: { lt: new Date() } }] },
    data: { lockToken, leaseUntil: new Date(Date.now() + SYNC_LEASE_MS) },
  })
  if (acquired.count !== 1) throw new MailboxError('SYNC_IN_PROGRESS', 'A mailbox sync is already running. Wait before trying again.', 409)
  const client = new ImapFlow({
    host: imap.host, port: imap.port, secure: true, auth: { user: imap.user, pass: imap.password },
    logger: false, disableAutoIdle: true, connectionTimeout: 12_000, greetingTimeout: 10_000, socketTimeout: 60_000,
    tls: { rejectUnauthorized: true },
  })
  let connectionFailed = false
  let deadlineReached = false
  let connectionErrorCode = 'UNKNOWN'
  client.on('error', error => {
    if (deadlineReached) return
    connectionFailed = true
    if (error && typeof error === 'object' && 'code' in error && typeof error.code === 'string' && /^[A-Z0-9_]{1,80}$/.test(error.code)) connectionErrorCode = error.code
  })
  const deadline = Date.now() + SYNC_DEADLINE_MS
  // Hard connection shutdown bounds hangs; incomplete work keeps its last checkpoint.
  // Remote database transactions may need to finish after the soft work deadline.
  const deadlineTimer = setTimeout(() => { deadlineReached = true; client.close() }, SYNC_DEADLINE_MS + 30_000)
  let imported = 0
  let skipped = 0
  let hasMore = false
  let stage = 'CONNECT'
  try {
    await client.connect()
    stage = 'LIST_FOLDERS'
    const discovered = await client.list()
    const sentPaths = new Set(discovered.filter(folder => folder.specialUse === '\\Sent').map(folder => folder.path))
    const folders = [...new Set(config.folders || ['INBOX', ...sentPaths])]
    if (!config.folders && !sentPaths.size) throw new MailboxError('SENT_FOLDER_NOT_FOUND', 'The Sent folder could not be identified. Configure MAILBOX_IMAP_FOLDERS with the exact inbox and sent folder paths.', 503)
    // Scan incoming history first so QQ-address replies can be scoped by their known references.
    folders.sort((a, b) => Number(sentPaths.has(a)) - Number(sentPaths.has(b)))
    stage = 'LOAD_SYNC_SCOPE'
    const scopeHash = mailboxScopeHash(config.aliases, folders)
    let syncState = await prisma.adminMailboxSyncState.findUniqueOrThrow({ where: { account } })
    if (syncState.scopeHash !== scopeHash) {
      const updated = await prisma.adminMailboxSyncState.updateMany({ where: { account, lockToken }, data: { scopeHash, scanGeneration: { increment: 1 }, generationImported: 0 } })
      if (updated.count !== 1) throw new MailboxError('SYNC_LEASE_LOST', 'The mailbox sync lease expired. Retry to resume safely.', 409)
      syncState = await prisma.adminMailboxSyncState.findUniqueOrThrow({ where: { account } })
    }
    const scanGeneration = syncState.scanGeneration
    const oldestCursor = await prisma.adminMailboxCursor.findFirst({ where: { account, folder: { in: folders } }, orderBy: { since: 'asc' }, select: { since: true } })
    // Header-only sets avoid one remote DB round trip for each unrelated or already imported message.
    const existingHeaders = await prisma.adminMailboxMessage.findMany({ where: { account }, select: { messageId: true, references: true, inReplyTo: true } })
    const existingMessageIds = new Set(existingHeaders.flatMap(row => row.messageId ? [row.messageId] : []))
    const knownReferenceIds = new Set(existingHeaders.flatMap(row => [...(row.messageId ? [row.messageId] : []), ...row.references, ...row.inReplyTo]))
    let inboxBackfillPending = false
    for (const folder of folders) {
      if (Date.now() >= deadline || (sentPaths.has(folder) && inboxBackfillPending)) { hasMore = true; continue }
      stage = 'OPEN_FOLDER'
      const folderLock = await client.getMailboxLock(folder, { readOnly: true })
      try {
        const mailbox = client.mailbox
        if (!mailbox || !mailbox.readOnly) throw new MailboxError('READ_ONLY_REQUIRED', 'The server did not open the mailbox in read-only mode.', 503)
        const uidValidity = String(mailbox.uidValidity)
        const upper = Math.max(0, mailbox.uidNext - 1)
        const key = { account_folder: { account, folder } }
        const checkpointCursor = async (data: Prisma.AdminMailboxCursorUpdateInput) => {
          stage = 'CHECKPOINT'
          await prisma.$transaction(async tx => {
            const owned = await tx.adminMailboxSyncState.updateMany({
              where: { account, lockToken, leaseUntil: { gt: new Date() } },
              data: { leaseUntil: new Date(Date.now() + SYNC_LEASE_MS) },
            })
            if (owned.count !== 1) throw new MailboxError('SYNC_LEASE_LOST', 'The mailbox sync lease expired. Retry to resume safely.', 409)
            await tx.adminMailboxCursor.update({ where: key, data })
          }, { maxWait: 10_000, timeout: 15_000 })
        }
        stage = 'LOAD_CURSOR'
        let cursor = await prisma.adminMailboxCursor.findUnique({ where: key })
        // Preserve the original default history boundary between days. An explicitly earlier date expands history.
        const since = !input.since && !process.env.MAILBOX_SYNC_SINCE ? cursor?.since || oldestCursor?.since || requestedSince : requestedSince
        if (!cursor || cursor.uidValidity !== uidValidity || cursor.since.getTime() !== since.getTime() || cursor.scanGeneration !== scanGeneration) {
          cursor = await prisma.adminMailboxCursor.upsert({ where: key, create: {
            account, folder, since, uidValidity, backfillUpperUid: upper, latestUid: upper, scanGeneration,
          }, update: { since, uidValidity, backfillUid: 0, backfillUpperUid: upper, latestUid: upper, backfillComplete: false, scanGeneration } })
        }
        const metadataByHeaders = new WeakMap<Buffer, Awaited<ReturnType<typeof parseMailboxHeaders>>>()
        const baseDependencies = {
          search: async (start: number, end: number, history: Date) => {
            stage = 'SEARCH'
            const result = await client.search({ uid: `${start}:${end}`, since: history }, { uid: true })
            if (!Array.isArray(result)) throw new MailboxError('IMAP_SEARCH_FAILED', 'Mailbox search did not complete. Sync can be retried.', 503)
            return result
          },
          readHeaders: async (uid: number) => {
            stage = 'FETCH_HEADERS'
            return headerFromFetch(await client.fetchOne(uid, { headers: HEADER_FIELDS, size: true, internalDate: true }, { uid: true }))
          },
          relevant: async (raw: Buffer) => {
            stage = 'CHECK_BUSINESS_SCOPE'
            const metadata = await parseMailboxHeaders(raw)
            metadataByHeaders.set(raw, metadata)
            return isScopedMailboxMessage(metadata, config.aliases, knownReferenceIds)
          },
          consume: async (uid: number, header: Header) => {
            const metadata = metadataByHeaders.get(header.headers)
            if (metadata?.messageId && existingMessageIds.has(metadata.messageId)) return false
            stage = 'DOWNLOAD_MIME'
            const source = await client.fetchOne(uid, { source: { start: 0, maxLength: MAX_RAW_MIME_BYTES + 1 } }, { uid: true })
            if (!source || !source.source) throw new MailboxError('IMAP_SOURCE_MISSING', 'A relevant message could not be downloaded. Sync can be retried.', 503)
            stage = 'PARSE_MIME'
            const parsed = await parseMailboxMime(source.source, header.internalDate)
            stage = 'SAVE_MESSAGE'
            const result = await persistMailboxMessage(account, parsed, config.ownAddresses, { lockToken, scanGeneration })
            if (parsed.messageId) existingMessageIds.add(parsed.messageId)
            for (const reference of [...parsed.references, ...parsed.inReplyTo, ...(parsed.messageId ? [parsed.messageId] : [])]) knownReferenceIds.add(reference)
            return result.imported
          },
          shouldStop: () => Date.now() >= deadline || connectionFailed || deadlineReached,
        }
        const newResult = await scanUidRange({ start: cursor.latestUid + 1, end: upper, since: cursor.since, maxRelevant: cursor.backfillComplete ? MAX_RELEVANT_PER_FOLDER : 25, maxScanned: MAX_HEADERS_PER_PASS }, {
          ...baseDependencies,
          checkpoint: async uid => { await checkpointCursor({ latestUid: uid }) },
        })
        imported += newResult.imported
        skipped += newResult.skipped
        hasMore ||= !newResult.complete
        if (!cursor.backfillComplete) {
          const backfillResult = await scanUidRange({ start: cursor.backfillUid + 1, end: cursor.backfillUpperUid, since: cursor.since, maxRelevant: MAX_RELEVANT_PER_FOLDER - newResult.relevant, maxScanned: MAX_HEADERS_PER_PASS }, {
            ...baseDependencies,
            checkpoint: async (uid, complete) => {
              await checkpointCursor({
                backfillUid: uid,
                // Replay mail that arrived during backfill once its historical references are known.
                // Existing business messages are deduplicated, while direct QQ-address replies can now be scoped.
                ...(complete ? { backfillComplete: true, latestUid: cursor.backfillUpperUid } : {}),
              })
            },
          })
          if (cursor.backfillUpperUid === 0) await checkpointCursor({ backfillComplete: true, latestUid: 0 })
          imported += backfillResult.imported
          skipped += backfillResult.skipped
          hasMore ||= !backfillResult.complete
          hasMore ||= backfillResult.complete && upper > cursor.backfillUpperUid
          if (!sentPaths.has(folder)) inboxBackfillPending ||= !backfillResult.complete
        }
      } finally { folderLock.release() }
    }
    if (connectionFailed) {
      diagnostics?.({ stage, code: connectionErrorCode })
      throw new MailboxError('IMAP_CONNECTION_FAILED', 'Mailbox connection was interrupted. Completed messages were saved; retry to resume.', 503)
    }
    hasMore ||= deadlineReached
    stage = 'RECONCILE_HISTORY'
    const currentState = await prisma.adminMailboxSyncState.findUniqueOrThrow({ where: { account } })
    if (needsHistoryReconciliation(hasMore, currentState.generationImported)) {
      let rescan = currentState.generationImported > 200
      let deferred = Date.now() >= deadline
      const probeHadFullBatch = imported === 0 && skipped === 0
      if (!rescan && !deferred) {
        // Counter and message creation commit atomically. Excluding app replies makes the latest N rows
        // exactly the IMAP imports accumulated over this round, including prior interrupted batches.
        // One SQL snapshot prevents a concurrent app send from entering the latest-N import set.
        const newlyImported = await prisma.$queryRaw<{ messageId: string | null; references: string[]; inReplyTo: string[] }[]>(Prisma.sql`
          SELECT m."messageId", m."references", m."inReplyTo" FROM "admin_mailbox_messages" m
          WHERE m."account" = ${account} AND NOT EXISTS (
            SELECT 1 FROM "admin_mailbox_send_attempts" a
            WHERE a."account" = m."account" AND a."outboundMessageId" = m."id"
          ) ORDER BY m."createdAt" DESC, m."id" DESC LIMIT ${currentState.generationImported}
        `)
        const discovery = planMailboxDiscovery(newlyImported, existingMessageIds)
        rescan = discovery.conservativeRescan || newlyImported.length !== currentState.generationImported
        const discoveryCursors = await prisma.adminMailboxCursor.findMany({ where: { account, folder: { in: folders } }, select: { folder: true, since: true, latestUid: true } })
        let inspectedCandidates = 0
        for (const folder of folders) {
          if (rescan || deferred || !discovery.queries.length) break
          if (Date.now() >= deadline) { deferred = true; break }
          const cursor = discoveryCursors.find(item => item.folder === folder)
          if (!cursor || cursor.latestUid < 1) continue
          stage = 'DISCOVER_REFERENCED_HISTORY'
          const discoveryLock = await client.getMailboxLock(folder, { readOnly: true })
          try {
            if (!client.mailbox || !client.mailbox.readOnly) throw new MailboxError('READ_ONLY_REQUIRED', 'The server did not open the mailbox in read-only mode.', 503)
            const seenCandidates = new Set<number>()
            for (const query of discovery.queries) {
              if (Date.now() >= deadline) { deferred = true; break }
              const found = await client.search({ ...query, since: cursor.since, uid: `1:${cursor.latestUid}` }, { uid: true })
              if (!Array.isArray(found)) throw new MailboxError('IMAP_SEARCH_FAILED', 'Mailbox reference search did not complete. Sync can be retried.', 503)
              const candidates = found.filter(uid => !seenCandidates.has(uid))
              if (inspectedCandidates + candidates.length > 200) { rescan = true; break }
              for (const uid of candidates) {
                if (Date.now() >= deadline) { deferred = true; break }
                seenCandidates.add(uid)
                inspectedCandidates++
                const header = headerFromFetch(await client.fetchOne(uid, { headers: HEADER_FIELDS, size: true, internalDate: true }, { uid: true }))
                if (!header) continue
                const metadata = await parseMailboxHeaders(header.headers)
                if (discoveryCandidateNeedsRescan(metadata, existingMessageIds, knownReferenceIds, config.aliases)) { rescan = true; break }
              }
              if (rescan || deferred) break
            }
          } finally { discoveryLock.release() }
        }
      }
      // If a fresh batch still cannot finish the probe, the persisted history cursor
      // provides forward progress; repeatedly restarting the same probe would not.
      if (deferred && probeHadFullBatch) rescan = true
      if (rescan) {
        // A new scope ID actually matched an unimported historical message (or exceeded the bounded probe).
        await prisma.adminMailboxSyncState.updateMany({ where: { account, lockToken, scanGeneration }, data: { scanGeneration: { increment: 1 }, generationImported: 0 } })
        hasMore = true
      } else if (deferred) {
        // Keep the durable dirty counter and retry a fresh bounded probe on the next batch.
        hasMore = true
      } else {
        // Ordinary new roots and replies to known messages finish without another 90-day header scan.
        await prisma.adminMailboxSyncState.updateMany({ where: { account, lockToken, scanGeneration }, data: { generationImported: 0 } })
      }
    }
    const lastSyncedAt = new Date()
    stage = 'SAVE_COMPLETION'
    await prisma.adminMailboxSyncState.updateMany({ where: { account, lockToken }, data: { lastSyncedAt } })
    return { imported, skipped, hasMore, lastSyncedAt: lastSyncedAt.toISOString() }
  } catch (error) {
    const code = error && typeof error === 'object' && 'code' in error && typeof error.code === 'string' && /^[A-Z0-9_]{1,80}$/.test(error.code) ? error.code : 'UNKNOWN'
    diagnostics?.({ stage, code })
    if (deadlineReached) throw new MailboxError('SYNC_TIME_BUDGET', 'The sync batch reached its time budget. Completed messages were saved; retry to resume.', 503)
    if (error instanceof MailboxError) throw error
    throw new MailboxError('MAILBOX_SYNC_FAILED', 'Mailbox sync failed. Completed messages were saved; check IMAP authorization, folder settings and database access before retrying.', 503)
  } finally {
    clearTimeout(deadlineTimer)
    client.close()
    await prisma.adminMailboxSyncState.updateMany({ where: { account, lockToken }, data: { lockToken: null, leaseUntil: null } })
  }
}
