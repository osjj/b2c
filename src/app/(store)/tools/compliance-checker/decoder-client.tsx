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
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <section data-tool-panel aria-labelledby="label-input-heading" className={`${theme.panel} min-w-0 p-5 sm:p-6`}>
        <div className="mb-5 flex items-center gap-3">
          <div className="grid size-10 shrink-0 place-items-center border border-primary/30 bg-primary/10 text-primary">
            <Search className="size-5" aria-hidden="true" />
          </div>
          <h2 id="label-input-heading" className="text-xl font-extrabold text-foreground sm:text-2xl">
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
            className="min-h-12 rounded-none font-mono"
          />
        </div>

        <div className="mt-5 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground">Try a sample marking</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {EXAMPLES.map((ex) => (
              <Button
                key={ex}
                size="sm"
                variant="outline"
                onClick={() => setInput(ex)}
                className="h-auto min-h-11 justify-start rounded-none whitespace-normal text-left font-mono text-xs"
              >
                {ex}
              </Button>
            ))}
          </div>
        </div>
        <p className="mt-5 border-t pt-4 text-sm leading-relaxed text-muted-foreground">This explains label text only. Verify the model, edition, declaration of conformity and test reports before purchasing; this tool does not validate certification.</p>
      </section>

      <div className="min-w-0 space-y-4">
        {warnings.length > 0 && <div className="border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950" role="status"><h3 className="font-semibold">Check the standard and edition</h3><ul className="mt-2 space-y-2">{warnings.map(w => <li key={w}>{w}</li>)}</ul></div>}
        {unknown.length > 0 && <div className="border bg-background p-4 text-sm" role="status"><h3 className="font-semibold">Unrecognised or unresolved markings</h3><ul className="mt-2 space-y-1 break-words font-mono">{unknown.map(t => <li key={t}>{t}</li>)}</ul><p className="mt-2 text-muted-foreground">These tokens were not interpreted. Confirm them against the original label and manufacturer documentation.</p></div>}
        {matches.length > 0 ? (
          <section data-testid="decoded-codes" data-tool-results aria-labelledby="label-results-heading" className={`${theme.results} border p-5 sm:p-6`}>
            <div className="mb-4 flex items-center gap-3">
              <Sparkles className="size-5 shrink-0 text-primary" aria-hidden="true" />
              <h2 id="label-results-heading" className="text-xl font-extrabold text-foreground">
                Decoded {matches.length} code{matches.length === 1 ? '' : 's'}
              </h2>
            </div>
            <ul className="divide-y border-y">
              {matches.map(({ code, context }) => (
                <li key={`${context}-${code.code}`} className="py-4">
                  <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
                    <span className="inline-flex items-center border border-primary/30 bg-primary/10 px-2.5 py-1 font-mono text-sm font-semibold text-primary">
                      {code.code}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-foreground">{code.name}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {context} · {STANDARD_LABEL[code.standard]}
                      </p>
                    </div>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{code.description}</p>
                </li>
              ))}
            </ul>
          </section>
        ) : (
          <div className="border border-dashed bg-background p-6 text-sm text-muted-foreground">
            Paste a marking like <code className="font-mono">S3 SRC HRO</code> or{' '}
            <code className="font-mono">ASTM F2413-18 M I/75 C/75 EH PR</code> to
            interpret supported markings.
          </div>
        )}
      </div>
    </div>
  )
}
