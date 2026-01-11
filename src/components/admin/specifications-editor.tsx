'use client'

import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export interface Specification {
  name: string
  value: string
}

interface SpecificationsEditorProps {
  specifications: Specification[]
  onChange: (specifications: Specification[]) => void
}

export function SpecificationsEditor({ specifications, onChange }: SpecificationsEditorProps) {
  const addSpecification = () => {
    onChange([...specifications, { name: '', value: '' }])
  }

  const removeSpecification = (index: number) => {
    const newSpecs = specifications.filter((_, i) => i !== index)
    onChange(newSpecs)
  }

  const updateSpecification = (index: number, field: 'name' | 'value', value: string) => {
    const newSpecs = specifications.map((spec, i) =>
      i === index ? { ...spec, [field]: value } : spec
    )
    onChange(newSpecs)
  }

  return (
    <div className="space-y-3">
      {specifications.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          No specifications added. Add specifications like Weight, Dimensions, Material, etc.
        </p>
      ) : (
        <div className="space-y-3">
          {specifications.map((spec, index) => (
            <div key={index} className="flex items-start gap-2">
              <div className="flex-1 space-y-1">
                <Input
                  value={spec.name}
                  onChange={(e) => updateSpecification(index, 'name', e.target.value)}
                  placeholder="Name (e.g., Weight)"
                  className="text-sm"
                />
              </div>
              <div className="flex-1 space-y-1">
                <Input
                  value={spec.value}
                  onChange={(e) => updateSpecification(index, 'value', e.target.value)}
                  placeholder="Value (e.g., 500g)"
                  className="text-sm"
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeSpecification(index)}
                className="text-red-500 hover:text-red-600 hover:bg-red-50 mt-0"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addSpecification}
        className="w-full"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Specification
      </Button>
    </div>
  )
}
