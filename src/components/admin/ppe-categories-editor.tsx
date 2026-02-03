'use client'

import type { ComponentType } from 'react'
import { HardHat, Hand, Footprints, Eye, Shield, Wind, Shirt, Tag, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import type { PpeCategoryItem } from '@/types/solution'

const PPE_ICON_MAP: Record<string, ComponentType<{ className?: string }>> = {
  'head-protection': HardHat,
  'hand-protection': Hand,
  'foot-protection': Footprints,
  'eye-protection': Eye,
  'fall-protection': Shield,
  respiratory: Wind,
  'body-protection': Shirt,
}

type CategoryOption = {
  id?: string
  slug: string
  name: string
  isActive?: boolean
  sortOrder?: number | null
}

interface PpeCategoriesEditorProps {
  value: PpeCategoryItem[]
  onChange: (value: PpeCategoryItem[]) => void
  categories: CategoryOption[]
}

const formatSlug = (slug: string) =>
  slug
    .split('-')
    .filter(Boolean)
    .map((segment) => segment[0]?.toUpperCase() + segment.slice(1))
    .join(' ')

export function PpeCategoriesEditor({ value, onChange, categories }: PpeCategoriesEditorProps) {
  const selectedSlugs = value.map((item) => item.categorySlug)
  const categoryLookup = new Map(categories.map((category) => [category.slug, category]))
  const unknownSelections = value.filter((item) => !categoryLookup.has(item.categorySlug))

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

  const getCategoryLabel = (slug: string) => {
    const category = categoryLookup.get(slug)
    return category?.name || formatSlug(slug)
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {categories.map((category) => {
          const isSelected = selectedSlugs.includes(category.slug)
          const Icon = PPE_ICON_MAP[category.slug] || Tag

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
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{category.name}</span>
                  {category.isActive === false && (
                    <span className="text-xs text-muted-foreground">
                      Inactive
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {unknownSelections.length > 0 && (
        <div className="rounded-lg border border-dashed border-amber-300 bg-amber-50/50 p-4 text-sm text-amber-700">
          Some selected categories no longer exist in Admin &gt; Categories. You can remove them below.
        </div>
      )}

      {value.length > 0 && (
        <div className="space-y-4 pt-4 border-t">
          <Label>Category Descriptions</Label>
          {value.map((item) => {
            const label = getCategoryLabel(item.categorySlug)
            const Icon = PPE_ICON_MAP[item.categorySlug] || Tag

            return (
              <div key={item.categorySlug} className="space-y-2">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{label}</span>
                  {!categoryLookup.has(item.categorySlug) && (
                    <span className="text-xs text-amber-600">
                      Missing
                    </span>
                  )}
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
                  placeholder={`Description for ${label}...`}
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
