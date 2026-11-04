import { z } from 'zod'

import {
  buildGloveMarkingReport,
  MAX_GLOVE_INPUT_LENGTH,
  type GloveDecodeContext,
} from './glove-marking-decoder'
import { GLOVE_EDITIONS } from './glove-marking-reference'

export const GLOVE_MARKING_INQUIRY_SOURCE = 'tool-glove-marking-decoder'
export const GLOVE_MARKING_INQUIRY_STORAGE_PREFIX = 'laifappe:glove-marking-inquiry:'
const MESSAGE_LIMIT = 6000
const DRAFT_TTL_MS = 2 * 60 * 60 * 1000
const MAX_DRAFT_LENGTH = 20000

const fallbackSchema = z.object({
  standard: z.enum(['EN388', 'EN407']),
  edition: z.string().min(1).max(30),
}).strict().refine(context => GLOVE_EDITIONS[context.standard].some(edition => edition.value === context.edition))

const draftSchema = z.object({
  version: z.literal(1),
  id: z.string().refine(isGloveMarkingDraftId),
  createdAt: z.number().int().min(0),
  input: z.string().min(1).max(MAX_GLOVE_INPUT_LENGTH),
  fallback: fallbackSchema.optional(),
}).strict()

export interface GloveMarkingInquiryDraft {
  id: string
  createdAt: number
  input: string
  fallback?: GloveDecodeContext
  message: string
}

export function isGloveMarkingDraftId(value: unknown): value is string {
  return typeof value === 'string' && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(value)
}

function buildMessage(input: string, fallback?: GloveDecodeContext): string {
  const report = buildGloveMarkingReport(input, fallback)
  if (!report) {
    throw new Error('Review the glove label input and edition context, then decode at least one supported marking before preparing an RFQ.')
  }
  const message = [
    'Please help source gloves using the label interpretation below. Confirm the exact model, applicable edition and supporting documents; this report does not verify certification.',
    '',
    report,
  ].join('\n')
  if (message.length > MESSAGE_LIMIT) {
    throw new Error('This interpretation is too long for the 6000-character RFQ message. Copy the complete report and email it to sales@laifappe.com, or decode a smaller set of labels. Your input has been kept.')
  }
  return message
}

/** Store source text and explicit context only; no stored explanation is trusted. */
export function serializeGloveMarkingInquiry(input: string, draftId: string, fallback?: GloveDecodeContext, now = Date.now()): string {
  const result = draftSchema.safeParse({ version: 1, id: draftId, createdAt: now, input, ...(fallback !== undefined ? { fallback } : {}) })
  if (!result.success) {
    throw new Error('The glove label input or edition context is invalid. Review it before preparing an RFQ.')
  }
  buildMessage(result.data.input, result.data.fallback)
  return JSON.stringify(result.data)
}

/** Restore only the requested unexpired draft and regenerate every report detail. */
export function parseGloveMarkingInquiry(value: string | null, draftId: string, now = Date.now()): GloveMarkingInquiryDraft | null {
  if (!value || value.length > MAX_DRAFT_LENGTH || !isGloveMarkingDraftId(draftId) || !Number.isFinite(now)) return null
  try {
    const result = draftSchema.safeParse(JSON.parse(value))
    if (!result.success || result.data.id !== draftId || now < result.data.createdAt || now - result.data.createdAt >= DRAFT_TTL_MS) return null
    return {
      id: result.data.id, createdAt: result.data.createdAt, input: result.data.input,
      ...(result.data.fallback ? { fallback: result.data.fallback } : {}),
      message: buildMessage(result.data.input, result.data.fallback),
    }
  } catch {
    return null
  }
}

/** Save a uniquely identified draft in this browser tab and return a short URL. */
export function saveGloveMarkingInquiry(input: string, fallback?: GloveDecodeContext): string {
  if (typeof window === 'undefined') throw new Error('Open the glove decoder in your browser to prepare an RFQ.')
  let draftId: string
  try {
    draftId = window.crypto.randomUUID()
  } catch {
    throw new Error('Your browser could not create an RFQ draft. Copy the complete interpretation report and email it to sales@laifappe.com, or try another supported browser.')
  }
  const serialized = serializeGloveMarkingInquiry(input, draftId, fallback)
  try {
    const key = `${GLOVE_MARKING_INQUIRY_STORAGE_PREFIX}${draftId}`
    window.sessionStorage.setItem(key, serialized)
    if (window.sessionStorage.getItem(key) !== serialized) throw new Error('Storage did not retain the draft.')
  } catch {
    throw new Error('Your browser could not save this RFQ draft. Allow session storage and try again, or copy the complete report and email it to sales@laifappe.com. Your input has been kept.')
  }
  return `/quote?tool=glove-marking-decoder&draft=${draftId}`
}
