'use client'

import { useActionState, useState } from 'react'
import { Category } from '@prisma/client'
import { createCategory, updateCategory, type CategoryState } from '@/actions/categories'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TranslationTabs } from './translation-tabs'
import { TranslatableInput } from './translatable-input'
import { TranslatableTextarea } from './translatable-textarea'
import { locales, defaultLocale, type Locale } from '@/i18n/config'

type CategoryWithTranslations = Category & {
  translations?: Array<{
    locale: string
    name: string
    description: string | null
  }>
}

interface CategoryFormProps {
  category?: CategoryWithTranslations
  categories: Category[]
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function CategoryForm({ category, categories }: CategoryFormProps) {
  const [slug, setSlug] = useState(category?.slug || '')

  // Translation state
  const [activeLocale, setActiveLocale] = useState<Locale>(defaultLocale)
  const [translations, setTranslations] = useState<Record<Locale, { name: string; description: string }>>(() => {
    const initial = {} as Record<Locale, { name: string; description: string }>
    locales.forEach((locale) => {
      if (locale === defaultLocale) {
        initial[locale] = {
          name: category?.name || '',
          description: category?.description || '',
        }
      } else {
        const existing = category?.translations?.find((t) => t.locale === locale)
        initial[locale] = {
          name: existing?.name || '',
          description: existing?.description || '',
        }
      }
    })
    return initial
  })

  const updateTranslation = (locale: Locale, field: 'name' | 'description', value: string) => {
    setTranslations((prev) => ({
      ...prev,
      [locale]: { ...prev[locale], [field]: value },
    }))
    // Auto-generate slug from default locale name
    if (locale === defaultLocale && field === 'name' && !category) {
      setSlug(generateSlug(value))
    }
  }

  const completedLocales = locales.filter(
    (locale) => translations[locale]?.name
  )

  const action = category
    ? updateCategory.bind(null, category.id)
    : createCategory

  const [state, formAction, pending] = useActionState<CategoryState, FormData>(
    action,
    {}
  )

  return (
    <form action={formAction} className="space-y-6 max-w-2xl">
      {state.error && (
        <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
          {state.error}
        </div>
      )}

      {/* Hidden inputs for translations */}
      <input type="hidden" name="name" value={translations[defaultLocale]?.name || ''} />
      <input type="hidden" name="description" value={translations[defaultLocale]?.description || ''} />
      <input type="hidden" name="translations" value={JSON.stringify(translations)} />

      <Card>
        <CardHeader>
          <CardTitle>Category Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Translation Tabs */}
          <TranslationTabs
            activeLocale={activeLocale}
            onLocaleChange={setActiveLocale}
            completedLocales={completedLocales}
          />

          {/* Name field - translatable */}
          <TranslatableInput
            name="categoryName"
            label="Category Name"
            values={Object.fromEntries(
              locales.map((l) => [l, translations[l]?.name || ''])
            ) as Record<Locale, string>}
            onChange={(locale, value) => updateTranslation(locale, 'name', value)}
            activeLocale={activeLocale}
            required
          />
          {state.errors?.name && (
            <p className="text-sm text-red-500">{state.errors.name[0]}</p>
          )}

          <div className="space-y-2">
            <Label htmlFor="slug">Slug *</Label>
            <Input
              id="slug"
              name="slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              required
            />
          </div>

          {/* Description field - translatable */}
          <TranslatableTextarea
            name="categoryDescription"
            label="Description"
            values={Object.fromEntries(
              locales.map((l) => [l, translations[l]?.description || ''])
            ) as Record<Locale, string>}
            onChange={(locale, value) => updateTranslation(locale, 'description', value)}
            activeLocale={activeLocale}
            rows={3}
          />

          <div className="space-y-2">
            <Label htmlFor="parentId">Parent Category</Label>
            <Select name="parentId" defaultValue={category?.parentId || 'none'}>
              <SelectTrigger>
                <SelectValue placeholder="No parent (top level)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No parent (top level)</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sortOrder">Sort Order</Label>
            <Input
              id="sortOrder"
              name="sortOrder"
              type="number"
              defaultValue={category?.sortOrder ?? 0}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="isActive">Active</Label>
            <Switch
              id="isActive"
              name="isActive"
              defaultChecked={category?.isActive ?? true}
              value="true"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving...' : category ? 'Update Category' : 'Create Category'}
        </Button>
        <Button type="button" variant="outline" onClick={() => history.back()}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
