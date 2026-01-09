'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth-utils'

const collectionSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z.string().min(1, 'Slug is required'),
  description: z.string().optional(),
  image: z.string().optional().nullable(),
  sortOrder: z.coerce.number().int().default(0),
  isActive: z.boolean().default(true),
})

export type CollectionState = {
  error?: string
  errors?: Record<string, string[]>
  success?: boolean
}

// Get all collections
export async function getCollections({
  includeInactive = false,
}: {
  includeInactive?: boolean
} = {}) {
  const where = includeInactive ? {} : { isActive: true }

  const collections = await prisma.collection.findMany({
    where,
    include: {
      _count: {
        select: { products: true },
      },
    },
    orderBy: { sortOrder: 'asc' },
  })

  return collections
}

// Get single collection by ID
export async function getCollection(id: string) {
  return prisma.collection.findUnique({
    where: { id },
    include: {
      products: {
        include: {
          product: {
            include: {
              images: { orderBy: { sortOrder: 'asc' }, take: 1 },
            },
          },
        },
        orderBy: { sortOrder: 'asc' },
      },
    },
  })
}

// Get collection by slug (for store)
export async function getCollectionBySlug(slug: string) {
  const collection = await prisma.collection.findUnique({
    where: { slug, isActive: true },
    include: {
      products: {
        include: {
          product: {
            include: {
              images: { orderBy: { sortOrder: 'asc' }, take: 1 },
            },
          },
        },
        orderBy: { sortOrder: 'asc' },
      },
    },
  })

  if (!collection) return null

  // Serialize Decimal values
  return {
    ...collection,
    products: collection.products.map((pc) => ({
      ...pc,
      product: {
        ...pc.product,
        price: Number(pc.product.price),
        comparePrice: pc.product.comparePrice ? Number(pc.product.comparePrice) : null,
        cost: pc.product.cost ? Number(pc.product.cost) : null,
        weight: pc.product.weight ? Number(pc.product.weight) : null,
      },
    })),
  }
}

// Create collection
export async function createCollection(
  prevState: CollectionState,
  formData: FormData
): Promise<CollectionState> {
  await requireAdmin()

  const rawData = {
    name: formData.get('name'),
    slug: formData.get('slug'),
    description: formData.get('description') || '',
    image: formData.get('image') || null,
    sortOrder: formData.get('sortOrder') || 0,
    isActive: formData.get('isActive') === 'true',
  }

  const result = collectionSchema.safeParse(rawData)
  if (!result.success) {
    return { errors: result.error.flatten().fieldErrors }
  }

  // Check slug uniqueness
  const existing = await prisma.collection.findUnique({
    where: { slug: result.data.slug },
  })
  if (existing) {
    return { error: 'Slug already exists' }
  }

  await prisma.collection.create({
    data: result.data,
  })

  revalidatePath('/admin/collections')
  revalidatePath('/collections')
  redirect('/admin/collections')
}

// Update collection
export async function updateCollection(
  id: string,
  prevState: CollectionState,
  formData: FormData
): Promise<CollectionState> {
  await requireAdmin()

  const rawData = {
    name: formData.get('name'),
    slug: formData.get('slug'),
    description: formData.get('description') || '',
    image: formData.get('image') || null,
    sortOrder: formData.get('sortOrder') || 0,
    isActive: formData.get('isActive') === 'true',
  }

  const result = collectionSchema.safeParse(rawData)
  if (!result.success) {
    return { errors: result.error.flatten().fieldErrors }
  }

  // Check slug uniqueness (exclude current collection)
  const existing = await prisma.collection.findFirst({
    where: { slug: result.data.slug, NOT: { id } },
  })
  if (existing) {
    return { error: 'Slug already exists' }
  }

  await prisma.collection.update({
    where: { id },
    data: result.data,
  })

  revalidatePath('/admin/collections')
  revalidatePath('/collections')
  revalidatePath(`/collections/${result.data.slug}`)
  redirect('/admin/collections')
}

// Delete collection
export async function deleteCollection(id: string) {
  await requireAdmin()

  await prisma.collection.delete({ where: { id } })

  revalidatePath('/admin/collections')
  revalidatePath('/collections')
}

// Add product to collection
export async function addProductToCollection(
  collectionId: string,
  productId: string
) {
  await requireAdmin()

  await prisma.productCollection.create({
    data: {
      collectionId,
      productId,
    },
  })

  revalidatePath('/admin/collections')
  revalidatePath('/collections')
}

// Remove product from collection
export async function removeProductFromCollection(
  collectionId: string,
  productId: string
) {
  await requireAdmin()

  await prisma.productCollection.deleteMany({
    where: {
      collectionId,
      productId,
    },
  })

  revalidatePath('/admin/collections')
  revalidatePath('/collections')
}

// Update product collections (for product form)
export async function updateProductCollections(
  productId: string,
  collectionIds: string[]
) {
  await requireAdmin()

  // Delete existing associations
  await prisma.productCollection.deleteMany({
    where: { productId },
  })

  // Create new associations
  if (collectionIds.length > 0) {
    await prisma.productCollection.createMany({
      data: collectionIds.map((collectionId, index) => ({
        productId,
        collectionId,
        sortOrder: index,
      })),
    })
  }

  revalidatePath('/admin/products')
  revalidatePath('/admin/collections')
  revalidatePath('/collections')
}

// Get product's collections
export async function getProductCollections(productId: string) {
  const productCollections = await prisma.productCollection.findMany({
    where: { productId },
    include: { collection: true },
    orderBy: { sortOrder: 'asc' },
  })

  return productCollections.map((pc) => pc.collection)
}
