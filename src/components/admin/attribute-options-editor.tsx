'use client'

import { Plus, Trash2, GripVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Option {
  id?: string
  value: string
  sortOrder: number
}

interface AttributeOptionsEditorProps {
  options: Option[]
  onChange: (options: Option[]) => void
}

export function AttributeOptionsEditor({ options, onChange }: AttributeOptionsEditorProps) {
  const addOption = () => {
    const newSortOrder = options.length > 0
      ? Math.max(...options.map(o => o.sortOrder)) + 1
      : 0
    onChange([...options, { value: '', sortOrder: newSortOrder }])
  }

  const removeOption = (index: number) => {
    const newOptions = options.filter((_, i) => i !== index)
    onChange(newOptions)
  }

  const updateOption = (index: number, value: string) => {
    const newOptions = options.map((opt, i) =>
      i === index ? { ...opt, value } : opt
    )
    onChange(newOptions)
  }

  const moveOption = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === options.length - 1)
    ) {
      return
    }

    const newOptions = [...options]
    const swapIndex = direction === 'up' ? index - 1 : index + 1

    // Swap sortOrder values
    const tempSortOrder = newOptions[index].sortOrder
    newOptions[index].sortOrder = newOptions[swapIndex].sortOrder
    newOptions[swapIndex].sortOrder = tempSortOrder

    // Swap positions in array
    ;[newOptions[index], newOptions[swapIndex]] = [newOptions[swapIndex], newOptions[index]]

    onChange(newOptions)
  }

  return (
    <div className="space-y-3">
      {options.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          No options defined. Add options for users to select from.
        </p>
      ) : (
        <div className="space-y-2">
          {options.map((option, index) => (
            <div key={option.id || index} className="flex items-center gap-2">
              <div className="flex flex-col gap-0.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-4 w-6"
                  onClick={() => moveOption(index, 'up')}
                  disabled={index === 0}
                >
                  <span className="text-xs">▲</span>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-4 w-6"
                  onClick={() => moveOption(index, 'down')}
                  disabled={index === options.length - 1}
                >
                  <span className="text-xs">▼</span>
                </Button>
              </div>
              <Input
                value={option.value}
                onChange={(e) => updateOption(index, e.target.value)}
                placeholder={`Option ${index + 1}`}
                className="flex-1"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeOption(index)}
                className="text-red-500 hover:text-red-600 hover:bg-red-50"
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
        onClick={addOption}
        className="w-full"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Option
      </Button>
    </div>
  )
}
