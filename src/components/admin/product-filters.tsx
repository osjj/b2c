'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Check, ChevronsUpDown, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'

interface Category {
  id: string
  name: string
}

interface ProductFiltersProps {
  categories: Category[]
}

export function ProductFilters({ categories }: ProductFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [open, setOpen] = useState(false)

  // Get selected categories from URL
  const selectedIds = searchParams.getAll('category')

  const handleToggle = (categoryId: string) => {
    const params = new URLSearchParams(searchParams.toString())

    // Remove all existing category params
    params.delete('category')

    // Build new selection
    let newSelection: string[]
    if (selectedIds.includes(categoryId)) {
      newSelection = selectedIds.filter((id) => id !== categoryId)
    } else {
      newSelection = [...selectedIds, categoryId]
    }

    // Add all selected categories
    newSelection.forEach((id) => params.append('category', id))

    // Reset to page 1 when filter changes
    params.delete('page')

    router.push(`?${params.toString()}`)
  }

  const handleSelectAll = () => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('category')
    params.delete('page')
    // Select all = no filter (show all)
    router.push(`?${params.toString()}`)
  }

  const handleClearAll = () => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('category')
    params.delete('page')
    router.push(`?${params.toString()}`)
  }

  const allSelected = selectedIds.length === 0
  const someSelected = selectedIds.length > 0

  return (
    <div className="flex items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="justify-between min-w-[200px]"
          >
            {someSelected
              ? `${selectedIds.length} categor${selectedIds.length > 1 ? 'ies' : 'y'} selected`
              : 'All Categories'}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[250px] p-0" align="start">
          <div className="p-2 border-b">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSelectAll}
                className="h-8 text-xs"
              >
                Select All
              </Button>
              {someSelected && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearAll}
                  className="h-8 text-xs text-muted-foreground"
                >
                  Clear
                </Button>
              )}
            </div>
          </div>
          <div className="max-h-[300px] overflow-y-auto p-2">
            {categories.map((category) => {
              const isSelected = selectedIds.includes(category.id)
              return (
                <div
                  key={category.id}
                  className="flex items-center gap-2 py-2 px-2 hover:bg-muted rounded-md cursor-pointer"
                  onClick={() => handleToggle(category.id)}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => handleToggle(category.id)}
                  />
                  <span className="text-sm flex-1">{category.name}</span>
                  {isSelected && <Check className="h-4 w-4 text-primary" />}
                </div>
              )
            })}
            {categories.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No categories found
              </p>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Selected badges */}
      {someSelected && (
        <div className="flex items-center gap-1 flex-wrap">
          {selectedIds.map((id) => {
            const category = categories.find((c) => c.id === id)
            if (!category) return null
            return (
              <Badge
                key={id}
                variant="secondary"
                className="gap-1 cursor-pointer"
                onClick={() => handleToggle(id)}
              >
                {category.name}
                <X className="h-3 w-3" />
              </Badge>
            )
          })}
        </div>
      )}
    </div>
  )
}
