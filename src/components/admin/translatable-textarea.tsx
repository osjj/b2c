'use client'

import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { defaultLocale, type Locale } from '@/i18n/config'

interface TranslatableTextareaProps {
  name: string
  label: string
  values: Record<Locale, string>
  onChange: (locale: Locale, value: string) => void
  activeLocale: Locale
  rows?: number
  placeholder?: string
}

export function TranslatableTextarea({
  name,
  label,
  values,
  onChange,
  activeLocale,
  rows = 4,
  placeholder,
}: TranslatableTextareaProps) {
  const defaultValue = values[defaultLocale]
  const currentValue = values[activeLocale]
  const isDefault = activeLocale === defaultLocale
  const isEmpty = !currentValue

  return (
    <div>
      <Label htmlFor={`${name}-${activeLocale}`}>{label}</Label>
      <Textarea
        id={`${name}-${activeLocale}`}
        value={currentValue || ''}
        onChange={(e) => onChange(activeLocale, e.target.value)}
        rows={rows}
        placeholder={
          isDefault
            ? placeholder
            : isEmpty && defaultValue
            ? `(${defaultValue?.substring(0, 100)}...)`
            : placeholder
        }
        className={isEmpty && !isDefault ? 'border-dashed' : ''}
      />
      {isEmpty && !isDefault && defaultValue && (
        <p className="text-xs text-muted-foreground mt-1">
          未翻译 - 将回退到默认语言内容
        </p>
      )}
    </div>
  )
}
