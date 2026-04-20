'use client'

import { useMemo, useState } from 'react'
import { Calculator, Download, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  EXPOSURES,
  PPE_ITEMS,
  ROLES,
  SHIFTS,
  type Exposure,
  type RoleKey,
  type Shift,
} from './data'

interface Row {
  key: string
  name: string
  unit: string
  monthlyQty: number
  annualQty: number
  monthlyCost: number
  annualCost: number
  description?: string
}

export function PpeCalculator() {
  const [role, setRole] = useState<RoleKey>('construction')
  const [shift, setShift] = useState<Shift>('single')
  const [exposure, setExposure] = useState<Exposure>('medium')
  const [headcount, setHeadcount] = useState<number>(50)

  const { rows, totals } = useMemo(() => {
    const roleMeta = ROLES.find((r) => r.key === role)!
    const shiftMeta = SHIFTS.find((s) => s.key === shift)!
    const exposureMeta = EXPOSURES.find((e) => e.key === exposure)!
    const combined = roleMeta.multiplier * shiftMeta.multiplier * exposureMeta.multiplier
    const workers = Math.max(0, Math.floor(headcount) || 0)

    const items = PPE_ITEMS.filter(
      (item) => !item.appliesTo || item.appliesTo.includes(role),
    )

    const rows: Row[] = items.map((item) => {
      const perWorkerMonthly = item.rate * combined
      const monthlyQty = perWorkerMonthly * workers
      const annualQty = monthlyQty * 12
      const monthlyCost = monthlyQty * item.unitPriceUsd
      return {
        key: item.key,
        name: item.name,
        unit: item.unit,
        monthlyQty,
        annualQty,
        monthlyCost,
        annualCost: monthlyCost * 12,
        description: item.description,
      }
    })

    const totals = rows.reduce(
      (acc, row) => {
        acc.monthly += row.monthlyCost
        acc.annual += row.annualCost
        return acc
      },
      { monthly: 0, annual: 0 },
    )

    return { rows, totals }
  }, [role, shift, exposure, headcount])

  const formatQty = (qty: number, unit: string) => {
    if (qty === 0) return `0 ${unit}`
    if (qty >= 100) return `${Math.round(qty).toLocaleString()} ${unit}`
    if (qty >= 10) return `${qty.toFixed(0)} ${unit}`
    return `${qty.toFixed(1)} ${unit}`
  }

  const formatCurrency = (v: number) =>
    `$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`

  const handleReset = () => {
    setRole('construction')
    setShift('single')
    setExposure('medium')
    setHeadcount(50)
  }

  const handleExportCsv = () => {
    const header = ['Item', 'Unit', 'Monthly quantity', 'Annual quantity', 'Est. monthly cost (USD)', 'Est. annual cost (USD)']
    const body = rows.map((r) => [
      `"${r.name.replace(/"/g, '""')}"`,
      r.unit,
      Math.round(r.monthlyQty),
      Math.round(r.annualQty),
      r.monthlyCost.toFixed(2),
      r.annualCost.toFixed(2),
    ])
    const totalRow = ['Total', '', '', '', totals.monthly.toFixed(2), totals.annual.toFixed(2)]
    const csv = [header, ...body, totalRow].map((r) => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ppe-plan-${role}-${headcount}-workers.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-8">
      {/* Input panel */}
      <div className="rounded-2xl border bg-background p-6 sm:p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Calculator className="h-5 w-5" />
          </div>
          <h2 className="font-serif text-xl sm:text-2xl text-foreground">
            Your workforce
          </h2>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="headcount">Number of workers</Label>
            <Input
              id="headcount"
              type="number"
              min={1}
              value={headcount}
              onChange={(e) => setHeadcount(Number(e.target.value))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Industry / role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as RoleKey)}>
              <SelectTrigger id="role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r.key} value={r.key}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="shift">Shift pattern</Label>
            <Select value={shift} onValueChange={(v) => setShift(v as Shift)}>
              <SelectTrigger id="shift">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SHIFTS.map((s) => (
                  <SelectItem key={s.key} value={s.key}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="exposure">Exposure level</Label>
            <Select value={exposure} onValueChange={(v) => setExposure(v as Exposure)}>
              <SelectTrigger id="exposure">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXPOSURES.map((e) => (
                  <SelectItem key={e.key} value={e.key}>
                    {e.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-4 text-xs text-muted-foreground">
          {ROLES.find((r) => r.key === role)?.description} ·{' '}
          {SHIFTS.find((s) => s.key === shift)?.description} ·{' '}
          {EXPOSURES.find((e) => e.key === exposure)?.description}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button onClick={handleExportCsv} variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button onClick={handleReset} variant="ghost" size="sm">
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset
          </Button>
        </div>
      </div>

      {/* Result summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border bg-gradient-to-br from-primary/5 to-background p-6 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-2">
            Monthly budget estimate
          </p>
          <p className="font-serif text-3xl sm:text-4xl text-primary">
            {formatCurrency(totals.monthly)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            for {headcount} worker{headcount === 1 ? '' : 's'}
          </p>
        </div>
        <div className="rounded-2xl border bg-background p-6 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-2">
            Annual budget estimate
          </p>
          <p className="font-serif text-3xl sm:text-4xl text-foreground">
            {formatCurrency(totals.annual)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {rows.length} PPE line item{rows.length === 1 ? '' : 's'}
          </p>
        </div>
        <div className="rounded-2xl border bg-background p-6 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-2">
            Cost per worker / year
          </p>
          <p className="font-serif text-3xl sm:text-4xl text-foreground">
            {formatCurrency(headcount > 0 ? totals.annual / headcount : 0)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Equipment only — excludes training & admin.
          </p>
        </div>
      </div>

      {/* Result table */}
      <div className="rounded-2xl border bg-background shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>PPE item</TableHead>
                <TableHead className="text-right">Monthly qty</TableHead>
                <TableHead className="text-right">Annual qty</TableHead>
                <TableHead className="text-right">Monthly cost</TableHead>
                <TableHead className="text-right">Annual cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.key}>
                  <TableCell>
                    <div className="font-medium">{row.name}</div>
                    {row.description ? (
                      <div className="text-xs text-muted-foreground mt-0.5 max-w-md">
                        {row.description}
                      </div>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatQty(row.monthlyQty, row.unit)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatQty(row.annualQty, row.unit)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(row.monthlyCost)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(row.annualCost)}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted/40 font-semibold">
                <TableCell>Total</TableCell>
                <TableCell />
                <TableCell />
                <TableCell className="text-right tabular-nums text-primary">
                  {formatCurrency(totals.monthly)}
                </TableCell>
                <TableCell className="text-right tabular-nums text-primary">
                  {formatCurrency(totals.annual)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Estimates use industry-average consumption rates and indicative unit prices in USD.
        Actual figures vary by supplier, contract pricing and site conditions. Use this
        calculator as a planning starting point, then confirm with a tailored quote.
      </p>
    </div>
  )
}
