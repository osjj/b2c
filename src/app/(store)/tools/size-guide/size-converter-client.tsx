'use client'

import { useMemo, useState } from 'react'
import { ArrowLeftRight, Ruler } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SIZE_CHART, SYSTEMS, type System } from './data'

function findRow(system: System, value: string) {
  const normalized = value.trim().replace(',', '.')
  if (!normalized) return null

  if (system === 'mm') {
    const mm = Number(normalized)
    if (!Number.isFinite(mm)) return null
    // Find closest row within 5mm.
    let best = SIZE_CHART[0]
    let bestDiff = Math.abs(SIZE_CHART[0].mm - mm)
    for (const row of SIZE_CHART) {
      const diff = Math.abs(row.mm - mm)
      if (diff < bestDiff) {
        bestDiff = diff
        best = row
      }
    }
    return bestDiff <= 8 ? best : null
  }

  return SIZE_CHART.find((row) => row[system] === normalized) || null
}

export function SizeConverter() {
  const [system, setSystem] = useState<System>('usMen')
  const [value, setValue] = useState('10')

  const match = useMemo(() => findRow(system, value), [system, value])

  return (
    <div className="space-y-8">
      {/* Converter card */}
      <div className="rounded-2xl border bg-background p-6 sm:p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ArrowLeftRight className="h-5 w-5" />
          </div>
          <h2 className="font-serif text-xl sm:text-2xl text-foreground">
            Size converter
          </h2>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="size-system">Your size is in</Label>
            <Select value={system} onValueChange={(v) => setSystem(v as System)}>
              <SelectTrigger id="size-system">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SYSTEMS.map((s) => (
                  <SelectItem key={s.key} value={s.key}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="size-value">
              {system === 'mm' ? 'Foot length (mm)' : 'Size'}
            </Label>
            <Input
              id="size-value"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={system === 'mm' ? 'e.g. 270' : 'e.g. 10'}
              inputMode="decimal"
            />
          </div>
        </div>
      </div>

      {/* Result */}
      {match ? (
        <div className="rounded-2xl border bg-gradient-to-br from-primary/5 to-background p-6 sm:p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-5">
            <Ruler className="h-5 w-5 text-primary" />
            <h3 className="font-serif text-xl text-foreground">
              Matching sizes for foot length {match.mm} mm
            </h3>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-7">
            {SYSTEMS.map((s) => (
              <div
                key={s.key}
                className={`rounded-xl border p-4 text-center ${
                  s.key === system
                    ? 'border-primary/50 bg-primary/5'
                    : 'bg-background'
                }`}
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-1.5">
                  {s.abbr}
                </p>
                <p className="font-serif text-2xl text-foreground">
                  {match[s.key]}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed bg-background p-6 text-center text-sm text-muted-foreground">
          Enter a size to see conversions across US, UK, EU, CN and JP systems.
        </div>
      )}
    </div>
  )
}
