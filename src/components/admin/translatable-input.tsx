'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { defaultLocale, type Locale } from '@/i18n/config'

interface TranslatableInputProps {
  name: string
  label: string
  values: Record<Locale, string>
  onChange: (locale: Locale, value: string) => void
  activeLocale: Locale
  required?: boolean
  placeholder?: string
}

export function TranslatableInput({
  name,
  label,
  values,
  onChange,
  activeLocale,
  required = false,
  placeholder,
}: TranslatableInputProps) {
  const defaultValue = values[defaultLocale]
  const currentValue = values[activeLocale]
  const isDefault = activeLocale === defaultLocale
  const isEmpty = !currentValue

  return (
    <div>
      <Label htmlFor={`${name}-${activeLocale}`}>
        {label} {required && isDefault && '*'}
      </Label>
      <Input
        id={`${name}-${activeLocale}`}
        value={currentValue || ''}
        onChange={(e) => onChange(activeLocale, e.target.value)}
        placeholder={
          isDefault
            ? placeholder
            : isEmpty && defaultValue
            ? `(${defaultValue})`
            : placeholder
        }
        className={isEmpty && !isDefault ? 'border-dashed' : ''}
      />
      {isEmpty && !isDefault && defaultValue && (
        <p className="text-xs text-muted-foreground mt-1">
          未翻译 - 将显示默认语言: &quot;{defaultValue}&quot;
        </p>
      )}
    </div>
  )
}
