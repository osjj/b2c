import { EXPOSURES, PPE_ITEMS, ROLES, SHIFTS, type Exposure, type RoleKey, type Shift } from './data'

export const ASSUMPTIONS_DATE = '2026-10-03'
export const REUSABLE_KEYS = new Set(['cut-gloves', 'welding-gloves', 'safety-glasses', 'welding-helmet-lens', 'hard-hat', 'hi-vis', 'safety-boots', 'earmuffs', 'fall-arrest-harness'])
export interface ItemAssumption { enabled: boolean; price: string; usage: string; pack: string }
export type Assumptions = Record<string, ItemAssumption>
export function defaultAssumptions(): Assumptions {
  return Object.fromEntries(PPE_ITEMS.map(item => [item.key, {
    enabled: true, price: String(item.unitPriceUsd),
    usage: String(REUSABLE_KEYS.has(item.key) ? 1 / item.rate : item.rate), pack: '1',
  }]))
}
export function validHeadcount(value: string): boolean {
  const n = Number(value)
  return value.trim() !== '' && Number.isSafeInteger(n) && n > 0
}
export function numericValue(value: string, minimum = 0): number | undefined {
  const n = Number(value)
  return value.trim() && Number.isFinite(n) && n >= minimum ? n : undefined
}
export function roundPurchase(quantity: number, pack: number): number {
  if (!Number.isFinite(quantity) || quantity < 0 || !Number.isSafeInteger(pack) || pack < 1) throw new Error('Invalid purchase quantity or pack size')
  // Stabilise the floating-point product before rounding a mathematical integer.
  const packs = quantity / pack
  const nearest = Math.round(packs)
  const stable = Math.abs(packs - nearest) <= Number.EPSILON * Math.max(1, packs) * 4 ? nearest : packs
  const purchase = Math.ceil(stable) * pack
  if (!Number.isSafeInteger(purchase)) throw new Error('Purchase quantity is too large')
  return purchase
}
export function calculatePlan(headcount: string, role: RoleKey, shift: Shift, exposure: Exposure, assumptions: Assumptions) {
  const errors: Record<string, string> = {}
  if (!validHeadcount(headcount)) errors.headcount = 'Enter a positive whole number of workers (1 or more).'
  const roleMeta = ROLES.find(r => r.key === role)!
  const shiftMeta = SHIFTS.find(s => s.key === shift)!
  const exposureMeta = EXPOSURES.find(e => e.key === exposure)!
  const combined = roleMeta.multiplier * shiftMeta.multiplier * exposureMeta.multiplier
  const applicableItems = PPE_ITEMS.filter(item => !item.appliesTo || item.appliesTo.includes(role))
  const rows = []
  for (const item of applicableItems) {
    const a = assumptions[item.key]
    if (!a.enabled) continue
    const reusable = REUSABLE_KEYS.has(item.key)
    const price = numericValue(a.price)
    const usage = numericValue(a.usage)
    const pack = Number(a.pack)
    if (price === undefined) errors[`${item.key}-price`] = 'Enter a finite price of 0 or more in USD.'
    if (usage === undefined || (reusable && usage === 0)) errors[`${item.key}-usage`] = reusable ? 'Enter a replacement cycle greater than 0 months.' : 'Enter a finite monthly rate of 0 or more.'
    if (!validHeadcount(a.pack)) errors[`${item.key}-pack`] = 'Enter a positive whole-number pack size.'
    if (Object.keys(errors).length) continue
    const rate = reusable ? 1 / usage! : usage!
    const monthlyQty = Number(headcount) * rate * combined
    const annualQty = monthlyQty * 12
    try {
      const monthlyPurchase = roundPurchase(monthlyQty, pack)
      const annualPurchase = roundPurchase(annualQty, pack)
      const monthlyCost = monthlyQty * price!
      const annualCost = annualQty * price!
      const monthlyPurchaseCost = monthlyPurchase * price!
      const annualPurchaseCost = annualPurchase * price!
      if (![monthlyCost, annualCost, monthlyPurchaseCost, annualPurchaseCost].every(Number.isFinite)) throw new Error('Amount too large')
      rows.push({ ...item, price: price!, rate, usage: usage!, reusable, pack, monthlyQty, annualQty, monthlyPurchase, annualPurchase, monthlyCost, annualCost, monthlyPurchaseCost, annualPurchaseCost })
    } catch { errors[`${item.key}-usage`] = 'This quantity or cost is too large. Reduce the inputs.' }
  }
  if (!applicableItems.some(item => assumptions[item.key].enabled)) errors.items = 'Select at least one PPE item for a plan.'
  const valid = Object.keys(errors).length === 0
  const totals = rows.reduce((t, r) => ({ monthly: t.monthly + r.monthlyCost, annual: t.annual + r.annualCost, monthlyPurchase: t.monthlyPurchase + r.monthlyPurchaseCost, annualPurchase: t.annualPurchase + r.annualPurchaseCost }), { monthly: 0, annual: 0, monthlyPurchase: 0, annualPurchase: 0 })
  if (!Object.values(totals).every(Number.isFinite)) errors.items = 'The combined cost is too large. Reduce the inputs.'
  return { valid: valid && !errors.items, errors, rows: valid ? rows : [], totals, applicableItems, combined, roleMeta, shiftMeta, exposureMeta }
}
export function exportPlanCsv(headcount: string, role: RoleKey, shift: Shift, exposure: Exposure, assumptions: Assumptions, priceDate: string): string | null {
  const plan = calculatePlan(headcount, role, shift, exposure, assumptions)
  if (!plan.valid || !/^\d{4}-\d{2}-\d{2}$/.test(priceDate)) return null
  const cells: (string | number)[][] = [
    ['PPE planning assumptions', 'Illustrative; not a supplier quotation'],
    ['Currency', 'USD'], ['Price reference date (user supplied)', priceDate], ['Illustrative defaults reviewed', ASSUMPTIONS_DATE],
    ['Workers', headcount], ['Industry', plan.roleMeta.label], ['Shift', plan.shiftMeta.label], ['Exposure', plan.exposureMeta.label],
    ['Role multiplier', plan.roleMeta.multiplier], ['Shift multiplier', plan.shiftMeta.multiplier], ['Exposure multiplier', plan.exposureMeta.multiplier],
    ['Formula', 'Workers x monthly rate x role x shift x exposure; annual = monthly x 12'],
    ['Purchase rounding', 'Each horizon separately: ceil(estimated units / pack size) x pack size; pack size is user supplied, not MOQ'],
    ['Excludes', 'Initial issue; current stock; tax; freight; training; administration'],
    [],
    ['Item', 'Unit', 'Unit price USD', 'Base rate per worker/month', 'Replacement cycle months (base)', 'User pack size', 'Monthly consumption estimate', 'Annual consumption estimate', 'Monthly whole-unit purchase', 'Annual whole-unit purchase', 'Monthly consumption cost USD', 'Annual consumption cost USD', 'Monthly purchase cost USD', 'Annual purchase cost USD'],
    ...plan.rows.map(r => [r.name, r.unit, r.price, r.rate, r.reusable ? r.usage : '', r.pack, r.monthlyQty.toFixed(4), r.annualQty.toFixed(4), r.monthlyPurchase, r.annualPurchase, r.monthlyCost.toFixed(2), r.annualCost.toFixed(2), r.monthlyPurchaseCost.toFixed(2), r.annualPurchaseCost.toFixed(2)]),
    ['Total', '', '', '', '', '', '', '', '', '', plan.totals.monthly.toFixed(2), plan.totals.annual.toFixed(2), plan.totals.monthlyPurchase.toFixed(2), plan.totals.annualPurchase.toFixed(2)],
  ]
  return cells.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\r\n')
}
