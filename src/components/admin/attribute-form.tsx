'use client'

import { useActionState, useState, useEffect } from 'react'
import { Attribute, AttributeOption, AttributeType } from '@prisma/client'
import { createAttribute, updateAttribute, type AttributeState } from '@/actions/attributes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AttributeOptionsEditor } from './attribute-options-editor'

type AttributeWithOptions = Attribute & {
  options: AttributeOption[]
}

interface AttributeFormProps {
  attribute?: AttributeWithOptions
}

function generateCode(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
}

const attributeTypes: { value: AttributeType; label: string }[] = [
  { value: 'TEXT', label: 'Text' },
  { value: 'TEXTAREA', label: 'Textarea' },
  { value: 'SELECT', label: 'Select (Dropdown)' },
  { value: 'MULTISELECT', label: 'Multi-select' },
  { value: 'BOOLEAN', label: 'Boolean (Yes/No)' },
]

export function AttributeForm({ attribute }: AttributeFormProps) {
  const [code, setCode] = useState(attribute?.code || '')
  const [type, setType] = useState<AttributeType>(attribute?.type || 'TEXT')
  const [options, setOptions] = useState<{ id?: string; value: string; sortOrder: number }[]>(
    attribute?.options.map((o) => ({ id: o.id, value: o.value, sortOrder: o.sortOrder })) || []
  )

  const showOptionsEditor = type === 'SELECT' || type === 'MULTISELECT'

  const action = attribute
    ? updateAttribute.bind(null, attribute.id)
    : createAttribute

  const [state, formAction, pending] = useActionState<AttributeState, FormData>(
    action,
    {}
  )

  const handleNameChange = (name: string) => {
    if (!attribute) {
      setCode(generateCode(name))
    }
  }

  return (
    <form action={formAction} className="space-y-6 max-w-2xl">
      {state.error && (
        <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
          {state.error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Attribute Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              name="name"
              defaultValue={attribute?.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g., Color, Size, Material"
              required
            />
            {state.errors?.name && (
              <p className="text-sm text-red-500">{state.errors.name[0]}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="code">Code *</Label>
            <Input
              id="code"
              name="code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g., color, size, material"
              required
            />
            <p className="text-xs text-muted-foreground">
              Unique identifier. Only lowercase letters, numbers, and underscores.
            </p>
            {state.errors?.code && (
              <p className="text-sm text-red-500">{state.errors.code[0]}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Type *</Label>
            <Select
              name="type"
              value={type}
              onValueChange={(val) => setType(val as AttributeType)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {attributeTypes.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {state.errors?.type && (
              <p className="text-sm text-red-500">{state.errors.type[0]}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="sortOrder">Sort Order</Label>
            <Input
              id="sortOrder"
              name="sortOrder"
              type="number"
              defaultValue={attribute?.sortOrder ?? 0}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="isRequired">Required</Label>
              <p className="text-xs text-muted-foreground">
                Must be filled when editing products
              </p>
            </div>
            <Switch
              id="isRequired"
              name="isRequired"
              defaultChecked={attribute?.isRequired ?? false}
              value="true"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="isFilterable">Filterable</Label>
              <p className="text-xs text-muted-foreground">
                Can be used to filter products in store
              </p>
            </div>
            <Switch
              id="isFilterable"
              name="isFilterable"
              defaultChecked={attribute?.isFilterable ?? false}
              value="true"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="isActive">Active</Label>
            <Switch
              id="isActive"
              name="isActive"
              defaultChecked={attribute?.isActive ?? true}
              value="true"
            />
          </div>
        </CardContent>
      </Card>

      {showOptionsEditor && (
        <Card>
          <CardHeader>
            <CardTitle>Options</CardTitle>
          </CardHeader>
          <CardContent>
            <AttributeOptionsEditor
              options={options}
              onChange={setOptions}
            />
            <input type="hidden" name="options" value={JSON.stringify(options)} />
          </CardContent>
        </Card>
      )}

      {!showOptionsEditor && (
        <input type="hidden" name="options" value="[]" />
      )}

      <div className="flex gap-4">
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving...' : attribute ? 'Update Attribute' : 'Create Attribute'}
        </Button>
        <Button type="button" variant="outline" onClick={() => history.back()}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
