'use client'

import { useMemo, useState } from 'react'
import { Search, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  ALL_CODES,
  DECODER_TOKENS,
  STANDARD_LABEL,
  type ComplianceCode,
} from './data'

interface DecodedMatch {
  code: ComplianceCode
  count: number
}

function decodeLabel(text: string): DecodedMatch[] {
  if (!text.trim()) return []
  const byCode = new Map<string, number>()
  const upper = text.toUpperCase()

  for (const { pattern, code } of DECODER_TOKENS) {
    const matches = upper.match(pattern)
    if (matches && matches.length > 0 && !byCode.has(code)) {
      byCode.set(code, matches.length)
    }
  }

  const standardOrder: ComplianceCode['standard'][] = [
    'EN-CLASS',
    'EN-ADDON',
    'SLIP',
    'ASTM',
  ]

  return Array.from(byCode.entries())
    .map(([code, count]) => {
      const meta = ALL_CODES.find((c) => c.code === code)!
      return { code: meta, count }
    })
    .sort(
      (a, b) =>
        standardOrder.indexOf(a.code.standard) -
        standardOrder.indexOf(b.code.standard),
    )
}

const EXAMPLES = [
  'S3 SRC HRO',
  'S1P SRA ESD',
  'ASTM F2413-18 M I/75 C/75 EH PR',
  'S7 WR M SC LG',
]

export function ComplianceDecoder() {
  const [input, setInput] = useState('S3 SRC HRO CI M')

  const matches = useMemo(() => decodeLabel(input), [input])

  return (
    <div className="space-y-8">
      {/* Input card */}
      <div className="rounded-2xl border bg-background p-6 sm:p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Search className="h-5 w-5" />
          </div>
          <h2 className="font-serif text-xl sm:text-2xl text-foreground">
            Paste the label
          </h2>
        </div>

        <div className="space-y-2">
          <Label htmlFor="label">
            Type or paste the marking from the tongue, sidewall or box
          </Label>
          <Input
            id="label"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g. EN ISO 20345:2022 S3 SRC HRO CI"
            className="font-mono"
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <span className="text-xs text-muted-foreground mr-1 self-center">Try:</span>
          {EXAMPLES.map((ex) => (
            <Button
              key={ex}
              size="sm"
              variant="outline"
              onClick={() => setInput(ex)}
              className="h-7 text-xs font-mono"
            >
              {ex}
            </Button>
          ))}
        </div>
      </div>

      {/* Result */}
      {matches.length > 0 ? (
        <div className="rounded-2xl border bg-gradient-to-br from-primary/5 to-background p-6 sm:p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-5">
            <Sparkles className="h-5 w-5 text-primary" />
            <h3 className="font-serif text-xl text-foreground">
              Decoded {matches.length} code{matches.length === 1 ? '' : 's'}
            </h3>
          </div>

          <ul className="space-y-3">
            {matches.map(({ code }) => (
              <li
                key={code.code}
                className="rounded-xl border bg-background p-4 sm:p-5"
              >
                <div className="flex flex-wrap items-start gap-x-4 gap-y-2">
                  <span className="inline-flex items-center rounded-lg bg-primary/10 px-3 py-1.5 font-mono text-sm font-semibold text-primary">
                    {code.code}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground">{code.name}</p>
                    <p className="mt-0.5 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                      {STANDARD_LABEL[code.standard]}
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                  {code.description}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed bg-background p-6 text-center text-sm text-muted-foreground">
          Paste a marking like <code className="font-mono">S3 SRC HRO</code> or{' '}
          <code className="font-mono">ASTM F2413-18 M I/75 C/75 EH PR</code> to
          decode every safety code.
        </div>
      )}
    </div>
  )
}
