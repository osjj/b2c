'use client'

import { Attribute, AttributeOption, AttributeType, ProductAttributeValue } from '@prisma/client'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type AttributeWithOptions = Attribute & {
  options: AttributeOption[]
}

type ProductAttributeValueWithRelations = ProductAttributeValue & {
  attribute: Attribute
  option?: AttributeOption | null
}

interface ProductAttributesInputProps {
  attributes: AttributeWithOptions[]
  values: Record<string, any>
  onChange: (values: Record<string, any>) => void
}

export function ProductAttributesInput({
  attributes,
  values,
  onChange,
}: ProductAttributesInputProps) {
  const handleChange = (attributeId: string, value: any) => {
    onChange({
      ...values,
      [attributeId]: value,
    })
  }

  if (attributes.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        No attributes defined. Create attributes in the Attributes section first.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {attributes.map((attribute) => (
        <div key={attribute.id} className="space-y-2">
          <Label htmlFor={`attr-${attribute.id}`}>
            {attribute.name}
            {attribute.isRequired && ' *'}
          </Label>
          {renderAttributeInput(attribute, values[attribute.id], (value) =>
            handleChange(attribute.id, value)
          )}
        </div>
      ))}
    </div>
  )
}

function renderAttributeInput(
  attribute: AttributeWithOptions,
  value: any,
  onChange: (value: any) => void
) {
  switch (attribute.type) {
    case 'TEXT':
      return (
        <Input
          id={`attr-${attribute.id}`}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`Enter ${attribute.name.toLowerCase()}`}
        />
      )

    case 'TEXTAREA':
      return (
        <Textarea
          id={`attr-${attribute.id}`}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`Enter ${attribute.name.toLowerCase()}`}
          rows={3}
        />
      )

    case 'SELECT':
      return (
        <Select value={value || 'none'} onValueChange={(v) => onChange(v === 'none' ? '' : v)}>
          <SelectTrigger>
            <SelectValue placeholder={`Select ${attribute.name.toLowerCase()}`} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            {attribute.options.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {option.value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )

    case 'MULTISELECT':
      const selectedIds = Array.isArray(value) ? value : []
      return (
        <div className="space-y-2">
          {attribute.options.map((option) => (
            <div key={option.id} className="flex items-center space-x-2">
              <Checkbox
                id={`attr-${attribute.id}-${option.id}`}
                checked={selectedIds.includes(option.id)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    onChange([...selectedIds, option.id])
                  } else {
                    onChange(selectedIds.filter((id: string) => id !== option.id))
                  }
                }}
              />
              <label
                htmlFor={`attr-${attribute.id}-${option.id}`}
                className="text-sm leading-none cursor-pointer"
              >
                {option.value}
              </label>
            </div>
          ))}
        </div>
      )

    case 'BOOLEAN':
      return (
        <div className="flex items-center space-x-2">
          <Switch
            id={`attr-${attribute.id}`}
            checked={value === true}
            onCheckedChange={onChange}
          />
          <Label htmlFor={`attr-${attribute.id}`} className="font-normal">
            {value === true ? 'Yes' : 'No'}
          </Label>
        </div>
      )

    default:
      return null
  }
}
