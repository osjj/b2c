export type FootwearSizeSystem = 'eu' | 'uk' | 'usMen' | 'usWomen' | 'cn' | 'jp'

export type AllocationInputRow = { id: string; model: string; color: string; system: FootwearSizeSystem; size: string; quantity: string }
export type AllocationIssue = { rowId?: string; message: string }
export type AllocationRow = { key: string; model: string; color: string; system: FootwearSizeSystem; size: string; quantity: number; spares: number; suggestedQuantity: number; orderQuantity: number; overridden: boolean }
export type AllocationPlan = { valid: boolean; rows: AllocationRow[]; errors: AllocationIssue[]; totals: { workers: number; spares: number; order: number }; sparePercent: number }

export const FOOTWEAR_SYSTEMS: { value: FootwearSizeSystem; label: string }[] = [
  { value: 'eu', label: 'EU' },
  { value: 'uk', label: 'UK' },
  { value: 'usMen', label: 'US Men' },
  { value: 'usWomen', label: 'US Women' },
  { value: 'cn', label: 'CN' },
  { value: 'jp', label: 'JP' },
]
export const MAX_INPUT_ROWS = 500
export const MAX_FILE_BYTES = 2 * 1024 * 1024

const MAX_TOTAL_PAIRS = 1000000
const MAX_INPUT_QUANTITY = 100000
const naturalOrder = new Intl.Collator('en', { numeric: true })

function wholeNumber(value: string, maximum: number): number | null {
  if (!/^\d+$/.test(value.trim())) return null
  const parsed = Number(value.trim())
  return Number.isSafeInteger(parsed) && parsed >= 1 && parsed <= maximum ? parsed : null
}

export function calculateAllocation(rows: AllocationInputRow[], sparePercent: string, overrides: Record<string, string> = {}): AllocationPlan {
  const errors: AllocationIssue[] = []
  const percentText = sparePercent.trim()
  const percent = Number(percentText)
  const percentIsValid = /^\d+(?:\.\d{1,2})?$/.test(percentText) && percent >= 0 && percent <= 100
  const plan: AllocationPlan = {
    valid: false,
    rows: [],
    errors,
    totals: { workers: 0, spares: 0, order: 0 },
    sparePercent: percentIsValid ? percent : 0,
  }
  if (!percentIsValid) errors.push({ message: 'Spare percentage must be from 0 to 100, with no more than two decimal places.' })
  if (rows.length > MAX_INPUT_ROWS) {
    errors.push({ message: `Use no more than ${MAX_INPUT_ROWS} input rows.` })
    return plan
  }

  const groups = new Map<string, AllocationRow>()
  for (const row of rows) {
    const model = row.model.trim()
    const color = row.color.trim()
    const sizeText = row.size.trim().replace(',', '.')
    const quantityText = row.quantity.trim()
    if (!model && !color && !sizeText && !quantityText) continue

    const initialErrorCount = errors.length
    const quantity = wholeNumber(quantityText, MAX_INPUT_QUANTITY)
    const sizeNumber = Number(sizeText)
    const sizeIsValid = /^\d+(?:\.\d+)?$/.test(sizeText) && sizeNumber >= 0.5 && sizeNumber <= 70 && Number.isInteger(sizeNumber * 2)
    if (model.length > 64) errors.push({ rowId: row.id, message: 'Model/reference must be 64 characters or fewer.' })
    if (color.length > 32) errors.push({ rowId: row.id, message: 'Color must be 32 characters or fewer.' })
    if (!FOOTWEAR_SYSTEMS.some(({ value }) => value === row.system)) errors.push({ rowId: row.id, message: 'Choose EU, UK, US Men, US Women, CN or JP as the size system.' })
    if (!sizeIsValid) errors.push({ rowId: row.id, message: 'Size must be a number from 0.5 to 70 in half-size steps; do not include a system label.' })
    if (quantity === null) errors.push({ rowId: row.id, message: 'Quantity must be a whole number from 1 to 100000 pairs; decimals, signs and exponents are not accepted.' })
    if (errors.length !== initialErrorCount || quantity === null) continue

    const size = String(sizeNumber)
    const key = JSON.stringify([model, color, row.system, size])
    const existing = groups.get(key)
    if (existing) {
      existing.quantity += quantity
    } else {
      groups.set(key, { key, model, color, system: row.system, size, quantity, spares: 0, suggestedQuantity: quantity, orderQuantity: quantity, overridden: false })
    }
  }

  if (groups.size === 0 && errors.length === 0) errors.push({ message: 'Add at least one size and quantity row.' })
  if (errors.length > 0) return plan

  const groupedRows = [...groups.values()].sort((a, b) =>
    naturalOrder.compare(a.model, b.model) || naturalOrder.compare(a.color, b.color) || naturalOrder.compare(a.system, b.system) || Number(a.size) - Number(b.size),
  )
  const workers = groupedRows.reduce((total, row) => total + row.quantity, 0)
  if (workers > MAX_TOTAL_PAIRS) {
    errors.push({ message: 'Total base demand must not exceed 1000000 pairs. Split this order into smaller plans.' })
    return plan
  }

  const percentHundredths = Math.round(percent * 100)
  for (const row of groupedRows) {
    row.spares = Math.ceil(row.quantity * percentHundredths / 10000)
    row.suggestedQuantity = row.quantity + row.spares
    row.orderQuantity = row.suggestedQuantity
    const overrideText = Object.hasOwn(overrides, row.key) ? overrides[row.key]?.trim() : ''
    if (overrideText) {
      const finalQuantity = wholeNumber(overrideText, MAX_TOTAL_PAIRS)
      if (finalQuantity === null || finalQuantity < row.quantity) {
        errors.push({ rowId: row.key, message: `Final order must be a whole number from ${row.quantity} to 1000000 pairs, and cannot be below base demand.` })
      } else {
        row.orderQuantity = finalQuantity
        row.overridden = true
      }
    }
  }
  for (const key of Object.keys(overrides)) {
    if (!groups.has(key) && overrides[key]?.trim()) errors.push({ rowId: key, message: 'This adjustment no longer matches a size group. Clear the adjustment and calculate again.' })
  }

  const order = groupedRows.reduce((total, row) => total + row.orderQuantity, 0)
  if (order > MAX_TOTAL_PAIRS) errors.push({ message: 'Total final order must not exceed 1000000 pairs. Reduce spares or split this order into smaller plans.' })
  plan.rows = groupedRows
  plan.totals = { workers, spares: order - workers, order }
  plan.valid = errors.length === 0
  return plan
}
