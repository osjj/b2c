'use client'

import theme from '../tools-theme.module.css'

import { useMemo, useState } from 'react'
import { Search, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { STANDARD_LABEL } from './data'
import { decodeLabel } from './parser'

const EXAMPLES = [
  'EN ISO 20345:2011 S3 SRC HRO',
  'EN ISO 20345:2022 S1PL SR FO',
  'ASTM F2413-18 M I/75 C/75 EH PR',
  'EN ISO 20345:2022 S7 WR M SC LG',
]

export function ComplianceDecoder() {
  const [input, setInput] = useState('EN ISO 20345:2022 S3 SR HRO CI M')

  const { matches, warnings, unknown } = useMemo(() => decodeLabel(input), [input])

  return (
    <div className="space-y-8">
      {/* Input card */}
      <div data-tool-panel className={[theme.panel, "rounded-2xl border bg-background p-6 sm:p-8 shadow-sm"].join(" ")}>
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
            placeholder="e.g. EN ISO 20345:2022 S3 SR HRO CI"
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
              className="h-auto min-h-11 whitespace-normal text-left text-xs font-mono"
            >
              {ex}
            </Button>
          ))}
        </div>
      </div>

      {/* Result */}
      <p className="text-sm text-muted-foreground">This explains label text only. Verify the model, edition, declaration of conformity and test reports before purchasing; this tool does not validate certification.</p>
      {warnings.length > 0 && <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950" role="status"><h3 className="font-semibold">Check the standard and edition</h3><ul className="mt-2 space-y-2">{warnings.map(w => <li key={w}>{w}</li>)}</ul></div>}
      {unknown.length > 0 && <div className="rounded-xl border p-4 text-sm" role="status"><h3 className="font-semibold">Unrecognised or unresolved markings</h3><ul className="mt-2 space-y-1 font-mono break-words">{unknown.map(t => <li key={t}>{t}</li>)}</ul><p className="mt-2 text-muted-foreground">These tokens were not interpreted. Confirm them against the original label and manufacturer documentation.</p></div>}
      {matches.length > 0 ? (
        <div data-testid="decoded-codes" data-tool-results className={[theme.results, "rounded-2xl border bg-gradient-to-br from-primary/5 to-background p-6 sm:p-8 shadow-sm"].join(" ")}>
          <div className="flex items-center gap-3 mb-5">
            <Sparkles className="h-5 w-5 text-primary" />
            <h3 className="font-serif text-xl text-foreground">
              Decoded {matches.length} code{matches.length === 1 ? '' : 's'}
            </h3>
          </div>

          <ul className="space-y-3">
            {matches.map(({ code, context }) => (
              <li
                key={`${context}-${code.code}`}
                className="rounded-xl border bg-background p-4 sm:p-5"
              >
                <div className="flex flex-wrap items-start gap-x-4 gap-y-2">
                  <span className="inline-flex items-center rounded-lg bg-primary/10 px-3 py-1.5 font-mono text-sm font-semibold text-primary">
                    {code.code}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground">{code.name}</p>
                    <p className="mt-0.5 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                      {context} · {STANDARD_LABEL[code.standard]}
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
          interpret supported markings.
        </div>
      )}
    </div>
  )
}
