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
  content: z.any().optional().nullable(),
  specifications: z.array(z.object({
    name: z.string(),
    value: z.string(),
  })).optional().nullable(),
  price: z.coerce.number().min(0, 'Price must be positive'),
  comparePrice: z.coerce.number().optional().nullable(),
  cost: z.coerce.number().optional().nullable(),
  sku: z.string().optional().nullable(),
  stock: z.coerce.number().int().min(0).default(0),
  categoryId: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  images: z.array(z.string()).optional(),
  priceTiers: z.array(z.object({
    minQuantity: z.coerce.number().int().min(1),
    maxQuantity: z.coerce.number().int().min(1).nullable(),
    price: z.coerce.number().min(0),
  })).optional().nullable(),
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
  activeOnly = false,
}: {
  page?: number
  limit?: number
  search?: string
  categoryId?: string
  isActive?: boolean
  activeOnly?: boolean
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
  } else if (activeOnly) {
    where.isActive = true
  }

  const [productsRaw, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        category: true,
        images: { orderBy: { sortOrder: 'asc' }, take: 1 },
        priceTiers: { orderBy: { sortOrder: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.product.count({ where }),
  ])

  // Convert Decimal to number for client component serialization
  const products = productsRaw.map((p) => ({
    ...p,
    price: Number(p.price),
    comparePrice: p.comparePrice ? Number(p.comparePrice) : null,
    cost: p.cost ? Number(p.cost) : null,
    weight: p.weight ? Number(p.weight) : null,
    priceTiers: p.priceTiers.map((t) => ({
      ...t,
      price: Number(t.price),
    })),
  }))

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
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      category: true,
      images: { orderBy: { sortOrder: 'asc' } },
      variants: true,
      attributeValues: {
        include: {
          attribute: true,
          option: true,
        },
      },
      priceTiers: { orderBy: { sortOrder: 'asc' } },
      translations: true,
    },
  })

  if (!product) return null

  // Convert Decimal to number for client component serialization
  return {
    ...product,
    price: Number(product.price),
    comparePrice: product.comparePrice ? Number(product.comparePrice) : null,
    cost: product.cost ? Number(product.cost) : null,
    weight: product.weight ? Number(product.weight) : null,
    variants: product.variants.map((v) => ({
      ...v,
      price: Number(v.price),
    })),
    priceTiers: product.priceTiers.map((t) => ({
      ...t,
      price: Number(t.price),
    })),
  }
}

// Get product by slug (for store)
export async function getProductBySlug(slug: string) {
  const product = await prisma.product.findUnique({
    where: { slug, isActive: true },
    include: {
      category: true,
      images: { orderBy: { sortOrder: 'asc' } },
      variants: { where: { stock: { gt: 0 } } },
      attributeValues: {
        include: {
          attribute: {
            include: {
              options: true,
            },
          },
          option: true,
        },
      },
      priceTiers: { orderBy: { sortOrder: 'asc' } },
    },
  })

  if (!product) return null

  // Convert Decimal to number for client component serialization
  return {
    ...product,
    price: Number(product.price),
    comparePrice: product.comparePrice ? Number(product.comparePrice) : null,
    cost: product.cost ? Number(product.cost) : null,
    weight: product.weight ? Number(product.weight) : null,
    variants: product.variants.map((v) => ({
      ...v,
      price: Number(v.price),
    })),
    priceTiers: product.priceTiers.map((t) => ({
      ...t,
      price: Number(t.price),
    })),
  }
}

// Create product
export async function createProduct(
  prevState: ProductState,
  formData: FormData
): Promise<ProductState> {
  await requireAdmin()

  const categoryIdRaw = formData.get('categoryId')
  const collectionIds = formData.getAll('collectionIds').filter(Boolean) as string[]
  const attributeValuesJson = formData.get('attributeValues')
  let attributeValues: Record<string, any> = {}
  if (attributeValuesJson && typeof attributeValuesJson === 'string') {
    try {
      attributeValues = JSON.parse(attributeValuesJson)
    } catch {
      // ignore parse errors
    }
  }

  const specificationsJson = formData.get('specifications')
  let specifications: any[] | null = null
  if (specificationsJson && typeof specificationsJson === 'string') {
    try {
      const parsed = JSON.parse(specificationsJson)
      const filtered = parsed.filter((s: any) => s.name && s.value)
      specifications = filtered.length > 0 ? filtered : null
    } catch {
      // ignore parse errors
    }
  }

  const contentJson = formData.get('content')
  let content: any = null
  if (contentJson && typeof contentJson === 'string' && contentJson !== 'null') {
    try {
      const parsed = JSON.parse(contentJson)
      content = parsed?.blocks?.length > 0 ? parsed : null
    } catch {
      // ignore parse errors
    }
  }

  const priceTiersJson = formData.get('priceTiers')
  let priceTiers: any[] | null = null
  if (priceTiersJson && typeof priceTiersJson === 'string') {
    try {
      const parsed = JSON.parse(priceTiersJson)
      priceTiers = parsed.length > 0 ? parsed : null
    } catch {
      // ignore parse errors
    }
  }

  const rawData = {
    name: formData.get('name'),
    slug: formData.get('slug'),
    description: formData.get('description'),
    content,
    specifications,
    price: formData.get('price'),
    comparePrice: formData.get('comparePrice') || null,
    cost: formData.get('cost') || null,
    sku: formData.get('sku') || null,
    stock: formData.get('stock') || 0,
    categoryId: categoryIdRaw && categoryIdRaw !== 'none' ? categoryIdRaw : null,
    isActive: formData.get('isActive') === 'true',
    isFeatured: formData.get('isFeatured') === 'true',
    images: formData.getAll('images').filter(Boolean) as string[],
  }

  const result = productSchema.safeParse(rawData)
  if (!result.success) {
    return { errors: result.error.flatten().fieldErrors }
  }

  const { images, specifications: validatedSpecs, content: validatedContent, categoryId, priceTiers: _priceTiers, ...productData } = result.data

  // Check slug uniqueness
  const existing = await prisma.product.findUnique({
    where: { slug: productData.slug },
  })
  if (existing) {
    return { error: 'Slug already exists' }
  }

  await prisma.$transaction(async (tx) => {
    const product = await tx.product.create({
      data: {
        ...productData,
        category: categoryId ? { connect: { id: categoryId } } : undefined,
        content: validatedContent ?? undefined,
        specifications: validatedSpecs ?? undefined,
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

    // Parse and create translations
    const translationsJson = formData.get('translations')
    let translations: Record<string, { name: string; description: string }> = {}
    if (translationsJson && typeof translationsJson === 'string') {
      try {
        translations = JSON.parse(translationsJson)
      } catch {
        // ignore parse errors
      }
    }

    // Create translations for non-default locales
    const translationEntries = Object.entries(translations).filter(
      ([locale, data]) => locale !== 'en' && data.name
    )

    if (translationEntries.length > 0) {
      await tx.productTranslation.createMany({
        data: translationEntries.map(([locale, data]) => ({
          productId: product.id,
          locale,
          name: data.name,
          description: data.description || null,
        })),
      })
    }

    // Create price tiers
    if (priceTiers && priceTiers.length > 0) {
      await tx.priceTier.createMany({
        data: priceTiers.map((tier, index) => ({
          productId: product.id,
          minQuantity: tier.minQuantity,
          maxQuantity: tier.maxQuantity,
          price: tier.price,
          sortOrder: index,
        })),
      })
    }

    // Create product collections
    if (collectionIds.length) {
      await tx.productCollection.createMany({
        data: collectionIds.map((collectionId, index) => ({
          productId: product.id,
          collectionId,
          sortOrder: index,
        })),
      })
    }

    // Create product attribute values
    if (Object.keys(attributeValues).length > 0) {
      const attributes = await tx.attribute.findMany({
        where: { id: { in: Object.keys(attributeValues) } },
      })

      for (const attr of attributes) {
        const value = attributeValues[attr.id]
        if (value === undefined || value === null || value === '') continue

        const data: any = {
          productId: product.id,
          attributeId: attr.id,
        }

        switch (attr.type) {
          case 'TEXT':
          case 'TEXTAREA':
            data.textValue = String(value)
            break
          case 'SELECT':
            data.optionId = value
            break
          case 'MULTISELECT':
            data.optionIds = Array.isArray(value) ? value : []
            break
          case 'BOOLEAN':
            data.boolValue = Boolean(value)
            break
        }

        await tx.productAttributeValue.create({ data })
      }
    }
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

  const categoryIdRaw = formData.get('categoryId')
  const collectionIds = formData.getAll('collectionIds').filter(Boolean) as string[]
  const attributeValuesJson = formData.get('attributeValues')
  let attributeValues: Record<string, any> = {}
  if (attributeValuesJson && typeof attributeValuesJson === 'string') {
    try {
      attributeValues = JSON.parse(attributeValuesJson)
    } catch {
      // ignore parse errors
    }
  }

  const specificationsJson = formData.get('specifications')
  let specifications: any[] | null = null
  if (specificationsJson && typeof specificationsJson === 'string') {
    try {
      const parsed = JSON.parse(specificationsJson)
      const filtered = parsed.filter((s: any) => s.name && s.value)
      specifications = filtered.length > 0 ? filtered : null
    } catch {
      // ignore parse errors
    }
  }

  const contentJson = formData.get('content')
  let content: any = null
  if (contentJson && typeof contentJson === 'string' && contentJson !== 'null') {
    try {
      const parsed = JSON.parse(contentJson)
      content = parsed?.blocks?.length > 0 ? parsed : null
    } catch {
      // ignore parse errors
    }
  }

  const priceTiersJson = formData.get('priceTiers')
  let priceTiers: any[] | null = null
  if (priceTiersJson && typeof priceTiersJson === 'string') {
    try {
      const parsed = JSON.parse(priceTiersJson)
      priceTiers = parsed.length > 0 ? parsed : null
    } catch {
      // ignore parse errors
    }
  }

  const rawData = {
    name: formData.get('name'),
    slug: formData.get('slug'),
    description: formData.get('description'),
    content,
    specifications,
    price: formData.get('price'),
    comparePrice: formData.get('comparePrice') || null,
    cost: formData.get('cost') || null,
    sku: formData.get('sku') || null,
    stock: formData.get('stock') || 0,
    categoryId: categoryIdRaw && categoryIdRaw !== 'none' ? categoryIdRaw : null,
    isActive: formData.get('isActive') === 'true',
    isFeatured: formData.get('isFeatured') === 'true',
    images: formData.getAll('images').filter(Boolean) as string[],
  }

  const result = productSchema.safeParse(rawData)
  if (!result.success) {
    return { errors: result.error.flatten().fieldErrors }
  }

  const { images, specifications: validatedSpecs, content: validatedContent, categoryId, priceTiers: _priceTiers, ...productData } = result.data

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

    // Delete existing product collections
    await tx.productCollection.deleteMany({ where: { productId: id } })

    // Delete existing attribute values
    await tx.productAttributeValue.deleteMany({ where: { productId: id } })

    // Delete existing price tiers
    await tx.priceTier.deleteMany({ where: { productId: id } })

    // Delete existing translations
    await tx.productTranslation.deleteMany({ where: { productId: id } })

    // Update product with new images
    await tx.product.update({
      where: { id },
      data: {
        ...productData,
        category: categoryId ? { connect: { id: categoryId } } : { disconnect: true },
        content: validatedContent ?? undefined,
        specifications: validatedSpecs ?? undefined,
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

    // Create new price tiers
    if (priceTiers && priceTiers.length > 0) {
      await tx.priceTier.createMany({
        data: priceTiers.map((tier, index) => ({
          productId: id,
          minQuantity: tier.minQuantity,
          maxQuantity: tier.maxQuantity,
          price: tier.price,
          sortOrder: index,
        })),
      })
    }

    // Create new product collections
    if (collectionIds.length) {
      await tx.productCollection.createMany({
        data: collectionIds.map((collectionId, index) => ({
          productId: id,
          collectionId,
          sortOrder: index,
        })),
      })
    }

    // Create new product attribute values
    if (Object.keys(attributeValues).length > 0) {
      const attributes = await tx.attribute.findMany({
        where: { id: { in: Object.keys(attributeValues) } },
      })

      for (const attr of attributes) {
        const value = attributeValues[attr.id]
        if (value === undefined || value === null || value === '') continue

        const data: any = {
          productId: id,
          attributeId: attr.id,
        }

        switch (attr.type) {
          case 'TEXT':
          case 'TEXTAREA':
            data.textValue = String(value)
            break
          case 'SELECT':
            data.optionId = value
            break
          case 'MULTISELECT':
            data.optionIds = Array.isArray(value) ? value : []
            break
          case 'BOOLEAN':
            data.boolValue = Boolean(value)
            break
        }

        await tx.productAttributeValue.create({ data })
      }
    }

    // Parse and create translations
    const translationsJson = formData.get('translations')
    let translations: Record<string, { name: string; description: string }> = {}
    if (translationsJson && typeof translationsJson === 'string') {
      try {
        translations = JSON.parse(translationsJson)
      } catch {
        // ignore parse errors
      }
    }

    // Create translations for non-default locales
    const translationEntries = Object.entries(translations).filter(
      ([locale, data]) => locale !== 'en' && data.name
    )

    if (translationEntries.length > 0) {
      await tx.productTranslation.createMany({
        data: translationEntries.map(([locale, data]) => ({
          productId: id,
          locale,
          name: data.name,
          description: data.description || null,
        })),
      })
    }
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
  const productsRaw = await prisma.product.findMany({
    where: { isActive: true, isFeatured: true },
    include: {
      images: { orderBy: { sortOrder: 'asc' }, take: 1 },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })

  // Convert Decimal to number for client component serialization
  return productsRaw.map((p) => ({
    ...p,
    price: Number(p.price),
    comparePrice: p.comparePrice ? Number(p.comparePrice) : null,
    cost: p.cost ? Number(p.cost) : null,
    weight: p.weight ? Number(p.weight) : null,
  }))
}
