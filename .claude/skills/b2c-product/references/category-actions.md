# Category Server Actions

## src/actions/categories.ts

```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth-utils'

const categorySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z.string().min(1, 'Slug is required'),
  description: z.string().optional().nullable(),
  image: z.string().optional().nullable(),
  parentId: z.string().optional().nullable(),
  sortOrder: z.coerce.number().int().default(0),
  isActive: z.boolean().default(true),
})

export type CategoryState = {
  error?: string
  errors?: Record<string, string[]>
  success?: boolean
}

// Get all categories
export async function getCategories({
  includeInactive = false,
  parentId,
}: {
  includeInactive?: boolean
  parentId?: string | null
} = {}) {
  const where: any = {}

  if (!includeInactive) {
    where.isActive = true
  }

  if (parentId !== undefined) {
    where.parentId = parentId
  }

  return prisma.category.findMany({
    where,
    include: {
      _count: { select: { products: true, children: true } },
      children: {
        where: includeInactive ? {} : { isActive: true },
        orderBy: { sortOrder: 'asc' },
      },
    },
    orderBy: { sortOrder: 'asc' },
  })
}

// Get category tree (hierarchical)
export async function getCategoryTree() {
  const categories = await prisma.category.findMany({
    where: { isActive: true, parentId: null },
    include: {
      children: {
        where: { isActive: true },
        include: {
          children: {
            where: { isActive: true },
            orderBy: { sortOrder: 'asc' },
          },
        },
        orderBy: { sortOrder: 'asc' },
      },
    },
    orderBy: { sortOrder: 'asc' },
  })

  return categories
}

// Get single category
export async function getCategory(id: string) {
  return prisma.category.findUnique({
    where: { id },
    include: {
      parent: true,
      children: true,
      _count: { select: { products: true } },
    },
  })
}

// Get category by slug
export async function getCategoryBySlug(slug: string) {
  return prisma.category.findUnique({
    where: { slug, isActive: true },
    include: {
      children: {
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
      },
    },
  })
}

// Create category
export async function createCategory(
  prevState: CategoryState,
  formData: FormData
): Promise<CategoryState> {
  await requireAdmin()

  const rawData = {
    name: formData.get('name'),
    slug: formData.get('slug'),
    description: formData.get('description') || null,
    image: formData.get('image') || null,
    parentId: formData.get('parentId') || null,
    sortOrder: formData.get('sortOrder') || 0,
    isActive: formData.get('isActive') === 'true',
  }

  const result = categorySchema.safeParse(rawData)
  if (!result.success) {
    return { errors: result.error.flatten().fieldErrors }
  }

  // Check slug uniqueness
  const existing = await prisma.category.findUnique({
    where: { slug: result.data.slug },
  })
  if (existing) {
    return { error: 'Slug already exists' }
  }

  await prisma.category.create({ data: result.data })

  revalidatePath('/admin/categories')
  revalidatePath('/categories')
  redirect('/admin/categories')
}

// Update category
export async function updateCategory(
  id: string,
  prevState: CategoryState,
  formData: FormData
): Promise<CategoryState> {
  await requireAdmin()

  const rawData = {
    name: formData.get('name'),
    slug: formData.get('slug'),
    description: formData.get('description') || null,
    image: formData.get('image') || null,
    parentId: formData.get('parentId') || null,
    sortOrder: formData.get('sortOrder') || 0,
    isActive: formData.get('isActive') === 'true',
  }

  const result = categorySchema.safeParse(rawData)
  if (!result.success) {
    return { errors: result.error.flatten().fieldErrors }
  }

  // Check slug uniqueness (exclude current)
  const existing = await prisma.category.findFirst({
    where: { slug: result.data.slug, NOT: { id } },
  })
  if (existing) {
    return { error: 'Slug already exists' }
  }

  // Prevent setting self as parent
  if (result.data.parentId === id) {
    return { error: 'Category cannot be its own parent' }
  }

  await prisma.category.update({
    where: { id },
    data: result.data,
  })

  revalidatePath('/admin/categories')
  revalidatePath('/categories')
  redirect('/admin/categories')
}

// Delete category
export async function deleteCategory(id: string) {
  await requireAdmin()

  // Check for products
  const productCount = await prisma.product.count({
    where: { categoryId: id },
  })
  if (productCount > 0) {
    throw new Error('Cannot delete category with products')
  }

  // Check for children
  const childCount = await prisma.category.count({
    where: { parentId: id },
  })
  if (childCount > 0) {
    throw new Error('Cannot delete category with subcategories')
  }

  await prisma.category.delete({ where: { id } })

  revalidatePath('/admin/categories')
  revalidatePath('/categories')
}

// Get categories for select dropdown
export async function getCategoriesForSelect() {
  return prisma.category.findMany({
    select: { id: true, name: true, parentId: true },
    orderBy: { name: 'asc' },
  })
}
```
