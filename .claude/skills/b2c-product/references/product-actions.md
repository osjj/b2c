# Product Server Actions

## src/actions/products.ts

```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth-utils'

const productSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z.string().min(1, 'Slug is required'),
  description: z.string().optional(),
  price: z.coerce.number().min(0, 'Price must be positive'),
  comparePrice: z.coerce.number().optional().nullable(),
  cost: z.coerce.number().optional().nullable(),
  sku: z.string().optional().nullable(),
  stock: z.coerce.number().int().min(0).default(0),
  categoryId: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  images: z.array(z.string()).optional(),
})

export type ProductState = {
  error?: string
  errors?: Record<string, string[]>
  success?: boolean
}

// Get all products with pagination and filters
export async function getProducts({
  page = 1,
  limit = 10,
  search = '',
  categoryId = '',
  isActive,
}: {
  page?: number
  limit?: number
  search?: string
  categoryId?: string
  isActive?: boolean
} = {}) {
  const where: any = {}

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { sku: { contains: search, mode: 'insensitive' } },
    ]
  }

  if (categoryId) {
    where.categoryId = categoryId
  }

  if (typeof isActive === 'boolean') {
    where.isActive = isActive
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        category: true,
        images: { orderBy: { sortOrder: 'asc' }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.product.count({ where }),
  ])

  return {
    products,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }
}

// Get single product by ID
export async function getProduct(id: string) {
  return prisma.product.findUnique({
    where: { id },
    include: {
      category: true,
      images: { orderBy: { sortOrder: 'asc' } },
      variants: true,
    },
  })
}

// Get product by slug (for store)
export async function getProductBySlug(slug: string) {
  return prisma.product.findUnique({
    where: { slug, isActive: true },
    include: {
      category: true,
      images: { orderBy: { sortOrder: 'asc' } },
      variants: { where: { stock: { gt: 0 } } },
    },
  })
}

// Create product
export async function createProduct(
  prevState: ProductState,
  formData: FormData
): Promise<ProductState> {
  await requireAdmin()

  const rawData = {
    name: formData.get('name'),
    slug: formData.get('slug'),
    description: formData.get('description'),
    price: formData.get('price'),
    comparePrice: formData.get('comparePrice') || null,
    cost: formData.get('cost') || null,
    sku: formData.get('sku') || null,
    stock: formData.get('stock') || 0,
    categoryId: formData.get('categoryId') || null,
    isActive: formData.get('isActive') === 'true',
    isFeatured: formData.get('isFeatured') === 'true',
    images: formData.getAll('images').filter(Boolean) as string[],
  }

  const result = productSchema.safeParse(rawData)
  if (!result.success) {
    return { errors: result.error.flatten().fieldErrors }
  }

  const { images, ...productData } = result.data

  // Check slug uniqueness
  const existing = await prisma.product.findUnique({
    where: { slug: productData.slug },
  })
  if (existing) {
    return { error: 'Slug already exists' }
  }

  await prisma.product.create({
    data: {
      ...productData,
      images: images?.length
        ? {
            create: images.map((url, index) => ({
              url,
              sortOrder: index,
            })),
          }
        : undefined,
    },
  })

  revalidatePath('/admin/products')
  revalidatePath('/products')
  redirect('/admin/products')
}

// Update product
export async function updateProduct(
  id: string,
  prevState: ProductState,
  formData: FormData
): Promise<ProductState> {
  await requireAdmin()

  const rawData = {
    name: formData.get('name'),
    slug: formData.get('slug'),
    description: formData.get('description'),
    price: formData.get('price'),
    comparePrice: formData.get('comparePrice') || null,
    cost: formData.get('cost') || null,
    sku: formData.get('sku') || null,
    stock: formData.get('stock') || 0,
    categoryId: formData.get('categoryId') || null,
    isActive: formData.get('isActive') === 'true',
    isFeatured: formData.get('isFeatured') === 'true',
    images: formData.getAll('images').filter(Boolean) as string[],
  }

  const result = productSchema.safeParse(rawData)
  if (!result.success) {
    return { errors: result.error.flatten().fieldErrors }
  }

  const { images, ...productData } = result.data

  // Check slug uniqueness (exclude current product)
  const existing = await prisma.product.findFirst({
    where: { slug: productData.slug, NOT: { id } },
  })
  if (existing) {
    return { error: 'Slug already exists' }
  }

  await prisma.$transaction(async (tx) => {
    // Delete existing images
    await tx.productImage.deleteMany({ where: { productId: id } })

    // Update product with new images
    await tx.product.update({
      where: { id },
      data: {
        ...productData,
        images: images?.length
          ? {
              create: images.map((url, index) => ({
                url,
                sortOrder: index,
              })),
            }
          : undefined,
      },
    })
  })

  revalidatePath('/admin/products')
  revalidatePath('/products')
  revalidatePath(`/products/${productData.slug}`)
  redirect('/admin/products')
}

// Delete product
export async function deleteProduct(id: string) {
  await requireAdmin()

  await prisma.product.delete({ where: { id } })

  revalidatePath('/admin/products')
  revalidatePath('/products')
}

// Get featured products
export async function getFeaturedProducts(limit = 8) {
  return prisma.product.findMany({
    where: { isActive: true, isFeatured: true },
    include: {
      images: { orderBy: { sortOrder: 'asc' }, take: 1 },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
}

// Generate slug from name
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-|-$/g, '')
}
```
