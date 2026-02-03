'use client'

import { useState } from 'react'
import { Plus, X, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import type { MaterialItem } from '@/types/solution'

// Materials preset list
const MATERIALS = [
  { key: 'abs-plastic', label: 'ABS Plastic' },
  { key: 'cowhide-leather', label: 'Cowhide Leather' },
  { key: 'rubber', label: 'Rubber' },
  { key: 'nylon', label: 'Nylon' },
  { key: 'polyester', label: 'Polyester' },
  { key: 'steel', label: 'Steel' },
  { key: 'kevlar', label: 'Kevlar' },
  { key: 'nitrile', label: 'Nitrile' },
] as const

interface MaterialsEditorProps {
  value: MaterialItem[]
  onChange: (value: MaterialItem[]) => void
}

export function MaterialsEditor({ value, onChange }: MaterialsEditorProps) {
  const selectedMaterials = value.map((item) => item.material)

  const handleToggle = (materialKey: string) => {
    if (selectedMaterials.includes(materialKey)) {
      // Remove
      onChange(value.filter((item) => item.material !== materialKey))
    } else {
      // Add
      onChange([...value, { material: materialKey, description: '' }])
    }
  }

  const handleDescriptionChange = (materialKey: string, description: string) => {
    onChange(
      value.map((item) =>
        item.material === materialKey ? { ...item, description } : item
      )
    )
  }

  const getMaterialInfo = (key: string) => {
    return MATERIALS.find((mat) => mat.key === key)
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {MATERIALS.map((material) => {
          const isSelected = selectedMaterials.includes(material.key)

          return (
            <Card
              key={material.key}
              className={`cursor-pointer transition-all ${
                isSelected
                  ? 'border-primary bg-primary/5 ring-1 ring-primary'
                  : 'hover:border-muted-foreground/50'
              }`}
              onClick={() => handleToggle(material.key)}
            >
              <CardContent className="p-4 flex items-center gap-3">
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => handleToggle(material.key)}
                  onClick={(e) => e.stopPropagation()}
                />
                <Package className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{material.label}</span>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {value.length > 0 && (
        <div className="space-y-4 pt-4 border-t">
          <Label>Material Descriptions</Label>
          {value.map((item) => {
            const materialInfo = getMaterialInfo(item.material)
            if (!materialInfo) return null

            return (
              <div key={item.material} className="space-y-2">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{materialInfo.label}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 ml-auto"
                    onClick={() => handleToggle(item.material)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <Textarea
                  value={item.description}
                  onChange={(e) =>
                    handleDescriptionChange(item.material, e.target.value)
                  }
                  placeholder={`Description for ${materialInfo.label}...`}
                  rows={2}
                />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
