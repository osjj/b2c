'use client'

import theme from '../tools-theme.module.css'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Calculator, Download, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { EXPOSURES, ROLES, SHIFTS, type Exposure, type RoleKey, type Shift } from './data'
import { ASSUMPTIONS_DATE, REUSABLE_KEYS, calculatePlan, defaultAssumptions, exportPlanCsv, type ItemAssumption } from './calculation'

const CSV_DOWNLOAD_SOURCE = 'tool-ppe-calculator-csv-export'
const money = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(value)
const qty = (value: number, unit: string) => `${value.toLocaleString('en-US', { maximumFractionDigits: 3 })} ${unit}`

export function PpeCalculator() {
  const [role, setRole] = useState<RoleKey>('construction')
  const [shift, setShift] = useState<Shift>('single')
  const [exposure, setExposure] = useState<Exposure>('medium')
  const [headcount, setHeadcount] = useState('50')
  const [assumptions, setAssumptions] = useState(defaultAssumptions)
  const [priceDate, setPriceDate] = useState(ASSUMPTIONS_DATE)
  const [assumptionsOpen, setAssumptionsOpen] = useState(false)
  const plan = useMemo(() => calculatePlan(headcount, role, shift, exposure, assumptions), [headcount, role, shift, exposure, assumptions])
  const dateValid = /^\d{4}-\d{2}-\d{2}$/.test(priceDate)
  const valid = plan.valid && dateValid
  const update = (key: string, change: Partial<ItemAssumption>) => setAssumptions(previous => ({ ...previous, [key]: { ...previous[key], ...change } }))
  const reset = () => {
    setRole('construction'); setShift('single'); setExposure('medium'); setHeadcount('50')
    setAssumptions(defaultAssumptions()); setPriceDate(ASSUMPTIONS_DATE); setAssumptionsOpen(false)
  }
  const exportCsv = () => {
    const csv = exportPlanCsv(headcount, role, shift, exposure, assumptions, priceDate)
    if (!csv) return
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
    const anchor = document.createElement('a')
    anchor.href = url; anchor.download = `ppe-plan-${role}-${headcount}-workers.csv`
    anchor.dataset.downloadSource = CSV_DOWNLOAD_SOURCE; anchor.dataset.downloadAsset = 'ppe-plan-csv'
    anchor.click(); URL.revokeObjectURL(url)
  }
  const error = (id: string) => plan.errors[id] ? <p id={`${id}-error`} className="mt-1 text-xs text-red-700" role="alert">{plan.errors[id]}</p> : null

  return <div className="space-y-6">
    <div data-tool-panel className={[theme.panel, "rounded-2xl border bg-background p-6 shadow-sm sm:p-8"].join(" ")}>
      <h2 className="mb-5 flex items-center gap-3 font-serif text-2xl"><Calculator className="h-6 w-6 text-primary" />Your workforce</h2>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-2"><Label htmlFor="headcount">Number of workers</Label><Input id="headcount" type="number" min={1} step={1} value={headcount} onChange={e => setHeadcount(e.target.value)} aria-invalid={!!plan.errors.headcount} aria-describedby={plan.errors.headcount ? 'headcount-error' : undefined} />{error('headcount')}</div>
        <div className="space-y-2"><Label htmlFor="role">Industry / role</Label><Select value={role} onValueChange={v => setRole(v as RoleKey)}><SelectTrigger id="role"><SelectValue /></SelectTrigger><SelectContent>{ROLES.map(r => <SelectItem key={r.key} value={r.key}>{r.label}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-2"><Label htmlFor="shift">Shift pattern</Label><Select value={shift} onValueChange={v => setShift(v as Shift)}><SelectTrigger id="shift"><SelectValue /></SelectTrigger><SelectContent>{SHIFTS.map(s => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-2"><Label htmlFor="exposure">Exposure level</Label><Select value={exposure} onValueChange={v => setExposure(v as Exposure)}><SelectTrigger id="exposure"><SelectValue /></SelectTrigger><SelectContent>{EXPOSURES.map(e => <SelectItem key={e.key} value={e.key}>{e.label}</SelectItem>)}</SelectContent></Select></div>
      </div>
      <p className="mt-4 text-sm text-muted-foreground">Illustrative factors: role {plan.roleMeta.multiplier} x shift {plan.shiftMeta.multiplier} x exposure {plan.exposureMeta.multiplier} = {plan.combined.toFixed(3)}. These are planning assumptions, not measured industry benchmarks. For a 24/7 workforce, avoid counting the same workers twice.</p>
      <details className="mt-6 rounded-xl border p-4" open={assumptionsOpen || !dateValid || Object.keys(plan.errors).some(key => key !== 'headcount')} onToggle={e => setAssumptionsOpen(e.currentTarget.open)}>
        <summary className="min-h-11 cursor-pointer font-semibold">Review prices, usage and pack sizes</summary>
        <p className="mb-4 text-sm text-muted-foreground">Select the items needed for your assessed tasks. Defaults may include alternative PPE at the same time. Prices are illustrative USD inputs, not supplier prices. Reusable items use a base replacement cycle; the factors above shorten or extend its effective cycle. Inspect PPE and follow manufacturer instructions rather than this budget cycle. Pack sizes default to 1 and are not supplier MOQ.</p>
        <div className="mb-4 max-w-xs space-y-2"><Label htmlFor="price-date">Your price reference date (USD)</Label><Input id="price-date" type="date" value={priceDate} onChange={e => setPriceDate(e.target.value)} aria-invalid={!dateValid} aria-describedby={!dateValid ? 'price-date-error' : undefined} />{!dateValid && <p id="price-date-error" role="alert" className="text-xs text-red-700">Enter the date for your price assumptions.</p>}</div>
        <div className="space-y-3">{plan.applicableItems.map(item => {
          const a = assumptions[item.key]
          const reusable = REUSABLE_KEYS.has(item.key)
          return <div key={item.key} className="rounded-lg bg-muted/30 p-4">
            <label className="flex min-h-11 items-center gap-3 font-medium"><input className="h-5 w-5" type="checkbox" checked={a.enabled} onChange={e => update(item.key, { enabled: e.target.checked })} />{item.name}</label>
            <p className="mb-3 text-xs text-muted-foreground">{item.description}</p>
            <div className="grid gap-3 sm:grid-cols-3">{(['price', 'usage', 'pack'] as const).map(field => {
              const id = `${item.key}-${field}`
              return <div key={field} className="space-y-1"><Label htmlFor={id}>{field === 'price' ? `USD per ${item.unit === 'pairs' ? 'pair' : 'piece'}` : field === 'pack' ? `Pack size (${item.unit})` : reusable ? 'Base replacement cycle (months)' : `Base ${item.unit} / worker / month`}</Label><Input id={id} type="number" min={field === 'pack' ? 1 : 0} step={field === 'pack' ? 1 : 'any'} disabled={!a.enabled} value={a[field]} onChange={e => update(item.key, { [field]: e.target.value })} aria-invalid={!!plan.errors[id]} aria-describedby={plan.errors[id] ? `${id}-error` : undefined} />{error(id)}</div>
            })}</div>
          </div>
        })}</div>
      </details>
      <div className="mt-5 flex flex-wrap gap-3"><Button disabled={!valid} data-download-asset="ppe-plan-csv" data-download-source={CSV_DOWNLOAD_SOURCE} onClick={exportCsv} variant="outline"><Download className="mr-2 h-4 w-4" />Export CSV</Button><Button onClick={reset} variant="ghost"><RotateCcw className="mr-2 h-4 w-4" />Reset</Button></div>
    </div>
    {!valid ? <div role="status" className="rounded-xl border border-red-300 bg-red-50 p-5 text-sm text-red-800">Correct the highlighted inputs to view or export a plan.{error('items')}</div> : <>
      <div className={[theme.summary, "grid gap-4 sm:grid-cols-3"].join(" ")} data-tool-results data-testid="plan-summary">
        {[['Monthly consumption budget', plan.totals.monthly, `for ${headcount} workers`], ['Annual consumption budget', plan.totals.annual, `${plan.rows.length} selected PPE items`], ['Consumption cost / worker / year', plan.totals.annual / Number(headcount), 'Equipment only; excludes training and administration']].map(([title, value, note]) => <div key={title} className="rounded-2xl border bg-background p-5 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</p><p className="my-2 font-serif text-3xl text-primary">{money(Number(value))}</p><p className="text-xs text-muted-foreground">{note}</p></div>)}
      </div>
      <div className="rounded-2xl border bg-background p-5 text-sm">
        <h2 className="font-semibold">Consumption and whole-unit purchase plan</h2>
        <p className="mt-2 text-muted-foreground">Estimated consumption can be fractional. Purchase quantities round each item up to your pack size for each horizon separately. An annual order is not 12 rounded monthly orders. Subtract usable stock and add initial issue, lead-time reserves and site-specific spare stock before ordering.</p>
        <p className="mt-3">Whole-unit purchase budget: {money(plan.totals.monthlyPurchase)} for one month; {money(plan.totals.annualPurchase)} for one annual order.</p>
        <p className="mt-3 text-xs text-muted-foreground">Monthly estimate = workers x base monthly rate x {plan.combined.toFixed(3)}. For reusable items, base monthly rate = 1 / replacement cycle in months. Annual = monthly x 12. Cost = quantity x unit price. Currency: USD. Your price date: {priceDate}. Illustrative defaults reviewed: {ASSUMPTIONS_DATE}. Excludes initial issue, current stock, tax, freight, training and administration.</p>
      </div>
      <div className="overflow-hidden rounded-2xl border bg-background shadow-sm"><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>PPE item</TableHead><TableHead>Monthly estimate</TableHead><TableHead>Monthly purchase</TableHead><TableHead>Annual estimate</TableHead><TableHead>Annual purchase</TableHead><TableHead>Annual consumption cost (USD)</TableHead></TableRow></TableHeader><TableBody>{plan.rows.map(row => <TableRow key={row.key}><TableCell className="min-w-48 font-medium">{row.name}</TableCell><TableCell>{qty(row.monthlyQty, row.unit)}</TableCell><TableCell className="font-semibold">{qty(row.monthlyPurchase, row.unit)}</TableCell><TableCell>{qty(row.annualQty, row.unit)}</TableCell><TableCell className="font-semibold">{qty(row.annualPurchase, row.unit)}</TableCell><TableCell>{money(row.annualCost)}</TableCell></TableRow>)}</TableBody></Table></div></div>
      <div className="rounded-xl border bg-primary/5 p-5 text-sm"><p>Review the inputs above or export them with your plan. Compare suitable products and confirm sizes, pack quantities and current pricing with the sourcing team.</p><div className="mt-4 flex flex-wrap gap-3"><Link href="/products" className="inline-flex min-h-11 items-center rounded-full border bg-background px-5 font-semibold">Browse PPE products</Link><Link href="/quote" data-source="tool-ppe-calculator" className="inline-flex min-h-11 items-center rounded-full bg-primary px-5 font-semibold text-primary-foreground">Request a supplier quote</Link></div></div>
    </>}
  </div>
}
