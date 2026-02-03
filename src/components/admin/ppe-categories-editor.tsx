'use client'

import { useState } from 'react'
import { HardHat, Hand, Footprints, Eye, Shield, Wind, Shirt, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import type { PpeCategoryItem } from '@/types/solution'

// PPE Categories preset list with icons
const PPE_CATEGORIES = [
  { slug: 'head-protection', label: 'Head Protection', Icon: HardHat },
  { slug: 'hand-protection', label: 'Hand Protection', Icon: Hand },
  { slug: 'foot-protection', label: 'Foot Protection', Icon: Footprints },
  { slug: 'eye-protection', label: 'Eye Protection', Icon: Eye },
  { slug: 'fall-protection', label: 'Fall Protection', Icon: Shield },
  { slug: 'respiratory', label: 'Respiratory Protection', Icon: Wind },
  { slug: 'body-protection', label: 'Body Protection', Icon: Shirt },
] as const

interface PpeCategoriesEditorProps {
  value: PpeCategoryItem[]
  onChange: (value: PpeCategoryItem[]) => void
}

export function PpeCategoriesEditor({ value, onChange }: PpeCategoriesEditorProps) {
  const selectedSlugs = value.map((item) => item.categorySlug)

  const handleToggle = (slug: string) => {
    if (selectedSlugs.includes(slug)) {
      // Remove
      onChange(value.filter((item) => item.categorySlug !== slug))
    } else {
      // Add
      onChange([...value, { categorySlug: slug, description: '' }])
    }
  }

  const handleDescriptionChange = (slug: string, description: string) => {
    onChange(
      value.map((item) =>
        item.categorySlug === slug ? { ...item, description } : item
      )
    )
  }

  const getCategoryInfo = (slug: string) => {
    return PPE_CATEGORIES.find((cat) => cat.slug === slug)
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {PPE_CATEGORIES.map((category) => {
          const isSelected = selectedSlugs.includes(category.slug)
          const Icon = category.Icon

          return (
            <Card
              key={category.slug}
              className={`cursor-pointer transition-all ${
                isSelected
                  ? 'border-primary bg-primary/5 ring-1 ring-primary'
                  : 'hover:border-muted-foreground/50'
              }`}
              onClick={() => handleToggle(category.slug)}
            >
              <CardContent className="p-4 flex items-center gap-3">
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => handleToggle(category.slug)}
                  onClick={(e) => e.stopPropagation()}
                />
                <Icon className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium">{category.label}</span>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {value.length > 0 && (
        <div className="space-y-4 pt-4 border-t">
          <Label>Category Descriptions</Label>
          {value.map((item) => {
            const categoryInfo = getCategoryInfo(item.categorySlug)
            if (!categoryInfo) return null
            const Icon = categoryInfo.Icon

            return (
              <div key={item.categorySlug} className="space-y-2">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{categoryInfo.label}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 ml-auto"
                    onClick={() => handleToggle(item.categorySlug)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <Textarea
                  value={item.description}
                  onChange={(e) =>
                    handleDescriptionChange(item.categorySlug, e.target.value)
                  }
                  placeholder={`Description for ${categoryInfo.label}...`}
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
