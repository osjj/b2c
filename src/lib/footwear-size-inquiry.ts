import { z } from 'zod'

import {
  calculateAllocation,
  FOOTWEAR_SYSTEMS,
  MAX_INPUT_ROWS,
  type AllocationInputRow,
  type AllocationPlan,
} from './footwear-size-allocation'

export const FOOTWEAR_INQUIRY_SOURCE = 'tool-footwear-size-allocation'
export const FOOTWEAR_INQUIRY_STORAGE_PREFIX = 'laifappe:footwear-size-inquiry:'
export const FOOTWEAR_INQUIRY_MESSAGE_LIMIT = 6000
const DRAFT_TTL_MS = 2 * 60 * 60 * 1000
const MAX_DRAFT_LENGTH = 100000
const MAX_TOTAL = 1000000
const MAX_INPUT_QUANTITY = 100000

const draftRowSchema = z.object({
  model: z.string().max(64).refine(value => value === value.trim()),
  color: z.string().max(32).refine(value => value === value.trim()),
  system: z.enum(['eu', 'uk', 'usMen', 'usWomen', 'cn', 'jp']),
  size: z.string().regex(/^(?:\d+|\d+\.5)$/).refine(value => {
    const size = Number(value)
    return size >= 0.5 && size <= 70 && String(size) === value
  }),
  quantity: z.number().int().min(1).max(MAX_TOTAL),
  orderQuantity: z.number().int().min(1).max(MAX_TOTAL),
  overridden: z.boolean(),
}).strict().refine(row => row.orderQuantity >= row.quantity)

const draftSchema = z.object({
  version: z.literal(1),
  id: z.string().refine(isFootwearInquiryDraftId),
  createdAt: z.number().int().min(0),
  sparePercent: z.number().min(0).max(100).refine(value => /^\d+(?:\.\d{1,2})?$/.test(String(value))),
  rows: z.array(draftRowSchema).min(1).max(MAX_INPUT_ROWS),
}).strict()

type StoredDraft = z.infer<typeof draftSchema>

export interface FootwearInquiryDraft {
  id: string
  createdAt: number
  plan: AllocationPlan
  message: string
}

export function isFootwearInquiryDraftId(value: unknown): value is string {
  return typeof value === 'string' && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(value)
}

function restorePlan(stored: StoredDraft): AllocationPlan | null {
  const inputs: AllocationInputRow[] = []
  const identities = new Set<string>()
  const overrides: Record<string, string> = {}
  let totalBase = 0
  let totalOrder = 0

  for (const row of stored.rows) {
    const key = JSON.stringify([row.model, row.color, row.system, row.size])
    if (identities.has(key)) return null
    identities.add(key)
    totalBase += row.quantity
    totalOrder += row.orderQuantity
    if (totalBase > MAX_TOTAL || totalOrder > MAX_TOTAL) return null
    if (row.overridden) overrides[key] = String(row.orderQuantity)

    // A grouped base may exceed the input-row limit; rebuild bounded chunks.
    for (let remaining = row.quantity; remaining > 0; remaining -= MAX_INPUT_QUANTITY) {
      if (inputs.length >= MAX_INPUT_ROWS) return null
      inputs.push({
        id: `draft-${inputs.length}`, model: row.model, color: row.color,
        system: row.system, size: row.size,
        quantity: String(Math.min(remaining, MAX_INPUT_QUANTITY)),
      })
    }
  }

  const plan = calculateAllocation(inputs, String(stored.sparePercent), overrides)
  if (!plan.valid || plan.rows.length !== stored.rows.length) return null
  const restoredRows = new Map(plan.rows.map(row => [row.key, row]))
  for (const row of stored.rows) {
    const restored = restoredRows.get(JSON.stringify([row.model, row.color, row.system, row.size]))
    if (!restored || restored.orderQuantity !== row.orderQuantity || restored.overridden !== row.overridden) return null
  }
  return plan
}

function buildMessage(plan: AllocationPlan): string {
  const labels = new Map(FOOTWEAR_SYSTEMS.map(system => [system.value, system.label]))
  const rows = plan.rows.map((row, index) => {
    const model = row.model ? JSON.stringify(row.model) : 'unspecified'
    const color = row.color ? JSON.stringify(row.color) : 'unspecified'
    return `${index + 1}. Model ${model}; color ${color}; ${labels.get(row.system)} ${row.size}: base ${row.quantity}, spares ${row.orderQuantity - row.quantity}, order ${row.orderQuantity} pairs${row.overridden ? ' (manual adjustment)' : ''}.`
  })
  const message = [
    'Please quote safety footwear for this confirmed size allocation.',
    `All quantities are pairs. Suggested spare rate: ${plan.sparePercent}%; final quantities below include any manual adjustments.`,
    ...rows,
    `Totals: base ${plan.totals.workers}; final spares ${plan.totals.spares}; final order ${plan.totals.order} pairs.`,
    "Please confirm the exact model's size chart, width, sample fit, available colors, MOQ and delivery terms. Sizes remain in their entered system; no regional conversion has been applied.",
  ].join('\n')
  if (message.length > FOOTWEAR_INQUIRY_MESSAGE_LIMIT) {
    throw new Error('This plan is too long for the 6000-character RFQ message. Export Excel and email it to sales@laifappe.com, or create a smaller plan. Your allocation has been kept.')
  }
  return message
}

/** Save only validated aggregate quantities; regenerate the message when reading. */
export function serializeFootwearInquiry(plan: AllocationPlan, draftId: string, now = Date.now()): string {
  if (!plan.valid || plan.errors.length > 0) {
    throw new Error('Correct the allocation errors before sending a valid plan to the RFQ.')
  }
  const result = draftSchema.safeParse({
    version: 1, id: draftId, createdAt: now, sparePercent: plan.sparePercent,
    rows: plan.rows.map(row => ({
      model: row.model, color: row.color, system: row.system, size: row.size,
      quantity: row.quantity, orderQuantity: row.orderQuantity, overridden: row.overridden,
    })),
  })
  if (!result.success) throw new Error('The allocation is invalid. Review the quantities before sending it to the RFQ.')
  const restored = restorePlan(result.data)
  const suppliedRows = new Map(plan.rows.map(row => [row.key, row]))
  if (!restored || restored.rows.some(row => {
    const supplied = suppliedRows.get(row.key)
    return !supplied || supplied.model !== row.model || supplied.color !== row.color
      || supplied.system !== row.system || supplied.size !== row.size || supplied.quantity !== row.quantity
      || supplied.spares !== row.spares || supplied.suggestedQuantity !== row.suggestedQuantity
      || supplied.orderQuantity !== row.orderQuantity || supplied.overridden !== row.overridden
  }) || restored.totals.workers !== plan.totals.workers || restored.totals.spares !== plan.totals.spares
    || restored.totals.order !== plan.totals.order) {
    throw new Error('The allocation quantities are not consistent. Recalculate the plan before sending it to the RFQ.')
  }
  buildMessage(restored)
  return JSON.stringify(result.data)
}

/** Reject a missing, corrupt, mismatched or expired draft without trusting stored text. */
export function parseFootwearInquiry(value: string | null, draftId: string, now = Date.now()): FootwearInquiryDraft | null {
  if (!value || value.length > MAX_DRAFT_LENGTH || !isFootwearInquiryDraftId(draftId) || !Number.isFinite(now)) return null
  try {
    const result = draftSchema.safeParse(JSON.parse(value))
    if (!result.success || result.data.id !== draftId || now < result.data.createdAt || now - result.data.createdAt >= DRAFT_TTL_MS) return null
    const plan = restorePlan(result.data)
    if (!plan) return null
    return { id: result.data.id, createdAt: result.data.createdAt, plan, message: buildMessage(plan) }
  } catch {
    return null
  }
}

/** Store a unique draft in this tab's session and return its opaque handoff URL. */
export function saveFootwearInquiry(plan: AllocationPlan): string {
  if (typeof window === 'undefined') throw new Error('Open the size allocator in your browser to prepare an RFQ.')
  let draftId: string
  try {
    draftId = window.crypto.randomUUID()
  } catch {
    throw new Error('Your browser could not create an RFQ draft. Export Excel and email it to sales@laifappe.com, or try again in a supported browser.')
  }
  const serialized = serializeFootwearInquiry(plan, draftId)
  try {
    const key = `${FOOTWEAR_INQUIRY_STORAGE_PREFIX}${draftId}`
    window.sessionStorage.setItem(key, serialized)
    if (window.sessionStorage.getItem(key) !== serialized) throw new Error('Storage did not retain the draft.')
  } catch {
    throw new Error('Your browser could not save this RFQ draft. Allow session storage and try again, or export Excel and email it to sales@laifappe.com. Your allocation has been kept.')
  }
  return `/quote?tool=footwear-size-allocation&draft=${draftId}`
}
