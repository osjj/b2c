'use client'

import { useId, useRef, useState } from 'react'
import { Input } from '@/components/ui/input'
import { parseLinePosition } from '@/lib/quotation/line-order'

export function LinePosition({ position, total, disabled, onCommit }: {
  position: number
  total: number
  disabled: boolean
  onCommit: (position: number) => void
}) {
  const id = useId()
  const [draft, setDraft] = useState<string | null>(null)
  const [error, setError] = useState('')
  const cancelled = useRef(false)

  function commit() {
    if (cancelled.current || disabled) {
      cancelled.current = false
      setDraft(null)
      setError('')
      return
    }
    const next = parseLinePosition(draft ?? String(position), total)
    setDraft(null)
    if (next === null) {
      setError(`请输入 1–${total} 之间的整数序号。`)
      return
    }
    setError('')
    if (next !== position) onCommit(next)
  }

  return <div className="min-w-0 space-y-1">
    <label htmlFor={id} className="flex items-center gap-2 text-xs font-medium text-slate-600">序号
      <Input id={id} type="text" inputMode="numeric" autoComplete="off" aria-label={`产品序号 ${position}`} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} className="h-11 w-20 bg-white text-center font-mono text-sm font-semibold text-teal-800" value={draft ?? String(position)} maxLength={8} disabled={disabled} onChange={(event) => { cancelled.current = false; setDraft(event.target.value); setError('') }} onBlur={commit} onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault()
          // Blur owns the commit so Enter never moves the row twice.
          event.currentTarget.blur()
        } else if (event.key === 'Escape') {
          event.preventDefault()
          cancelled.current = true
          setDraft(null)
          setError('')
          event.currentTarget.blur()
        }
      }} />
      <span className="text-slate-400">/ {total}</span>
    </label>
    {error && <p id={`${id}-error`} role="alert" className="text-xs text-red-700">{error}</p>}
  </div>
}
