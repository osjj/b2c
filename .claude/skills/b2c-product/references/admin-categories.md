# Admin Category Pages

## src/app/admin/categories/page.tsx

```tsx
import Link from 'next/link'
import { Plus, Pencil, Trash2, Folder } from 'lucide-react'
import { getCategories, deleteCategory } from '@/actions/categories'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { DeleteButton } from '@/components/admin/delete-button'

export default async function AdminCategoriesPage() {
  const categories = await getCategories({ includeInactive: true, parentId: null })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Categories</h1>
        <Button asChild>
          <Link href="/admin/categories/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Category
          </Link>
        </Button>
      </div>

      <div className="bg-white rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Products</TableHead>
              <TableHead>Subcategories</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((category) => (
              <CategoryRow key={category.id} category={category} level={0} />
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

function CategoryRow({
  category,
  level,
}: {
  category: any
  level: number
}) {
  return (
    <>
      <TableRow>
        <TableCell>
          <div className="flex items-center gap-2" style={{ paddingLeft: level * 24 }}>
            <Folder className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{category.name}</span>
          </div>
        </TableCell>
        <TableCell className="text-muted-foreground">{category.slug}</TableCell>
        <TableCell>
          <Badge variant="secondary">{category._count.products}</Badge>
        </TableCell>
        <TableCell>
          <Badge variant="secondary">{category._count.children}</Badge>
        </TableCell>
        <TableCell>
          <Badge variant={category.isActive ? 'default' : 'secondary'}>
            {category.isActive ? 'Active' : 'Inactive'}
          </Badge>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" asChild>
              <Link href={`/admin/categories/${category.id}`}>
                <Pencil className="h-4 w-4" />
              </Link>
            </Button>
            <DeleteButton
              onDelete={async () => {
                'use server'
                await deleteCategory(category.id)
              }}
            />
          </div>
        </TableCell>
      </TableRow>
      {category.children?.map((child: any) => (
        <CategoryRow key={child.id} category={child} level={level + 1} />
      ))}
    </>
  )
}
```

## src/app/admin/categories/new/page.tsx

```tsx
import { getCategories } from '@/actions/categories'
import { CategoryForm } from '@/components/admin/category-form'

export default async function NewCategoryPage() {
  const categories = await getCategories({ includeInactive: true })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">New Category</h1>
      <CategoryForm categories={categories} />
    </div>
  )
}
```

## src/app/admin/categories/[id]/page.tsx

```tsx
import { notFound } from 'next/navigation'
import { getCategory, getCategories } from '@/actions/categories'
import { CategoryForm } from '@/components/admin/category-form'

export default async function EditCategoryPage({
  params,
}: {
  params: { id: string }
}) {
  const [category, categories] = await Promise.all([
    getCategory(params.id),
    getCategories({ includeInactive: true }),
  ])

  if (!category) {
    notFound()
  }

  // Filter out current category and its children from parent options
  const availableParents = categories.filter((c) => c.id !== params.id)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Edit Category</h1>
      <CategoryForm category={category} categories={availableParents} />
    </div>
  )
}
```

## src/components/admin/category-form.tsx

```tsx
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

interface CategoryFormProps {
  category?: Category
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

  const action = category
    ? updateCategory.bind(null, category.id)
    : createCategory

  const [state, formAction, pending] = useActionState<CategoryState, FormData>(
    action,
    {}
  )

  const handleNameChange = (name: string) => {
    if (!category) {
      setSlug(generateSlug(name))
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
          <CardTitle>Category Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              name="name"
              defaultValue={category?.name}
              onChange={(e) => handleNameChange(e.target.value)}
              required
            />
            {state.errors?.name && (
              <p className="text-sm text-red-500">{state.errors.name[0]}</p>
            )}
          </div>

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

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={category?.description || ''}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="parentId">Parent Category</Label>
            <Select name="parentId" defaultValue={category?.parentId || ''}>
              <SelectTrigger>
                <SelectValue placeholder="No parent (top level)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No parent (top level)</SelectItem>
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
```
