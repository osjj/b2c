'use client'

import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { ProductCategorySelection } from '@/lib/product-category-selection'

interface ProductCategorySelectProps {
  selection: ProductCategorySelection
  onValueChange: (value: string) => void
}

export function ProductCategorySelect({ selection, onValueChange }: ProductCategorySelectProps) {
  const { value, mainCategories, mainCategoryId, subcategories, subcategoryId, currentCategory } = selection

  return (
    <div className="min-w-0 space-y-4">
      <input type="hidden" name="categoryId" value={value} />
      <div className="space-y-2">
        <Label htmlFor="product-category-main">Category</Label>
        <Select value={mainCategoryId} onValueChange={onValueChange}>
          <SelectTrigger
            id="product-category-main"
            className="min-h-11 w-full min-w-0"
            aria-describedby={currentCategory ? 'product-category-current-warning' : undefined}
          >
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No category</SelectItem>
            {currentCategory && (
              <SelectItem value={currentCategory.id} disabled>
                {currentCategory.name} (current only)
              </SelectItem>
            )}
            {mainCategories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {currentCategory && (
        <p id="product-category-current-warning" className="text-sm text-amber-700 dark:text-amber-400">
          This category is no longer available for new assignments. It will be kept unless you choose another category.
        </p>
      )}
      {subcategories.length > 0 && (
        <div className="space-y-2">
          <Label htmlFor="product-category-detail">Subcategory (optional)</Label>
          <Select
            value={subcategoryId}
            onValueChange={(id) => onValueChange(id === 'none' ? mainCategoryId : id)}
          >
            <SelectTrigger id="product-category-detail" className="min-h-11 w-full min-w-0">
              <SelectValue placeholder="Select subcategory" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No subcategory</SelectItem>
              {subcategories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  )
}
