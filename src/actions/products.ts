'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { after } from 'next/server'
import { prisma } from '@/lib/prisma'
import { buildProductEmbeddingText, generateEmbedding } from '@/lib/embeddings'
import { generateUniqueProductSlug, saveLegacyProductSlug } from '@/lib/product-slug.server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth-utils'

const productSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z.string().optional().nullable(),
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
  images: z.array(z.object({
    url: z.string(),
    alt: z.string(),
  })).optional(),
  priceTiers: z.array(z.object({
    minQuantity: z.coerce.number().int().min(1),
    maxQuantity: z.coerce.number().int().min(1).nullable(),
    price: z.coerce.number().min(0),
  })).optional().nullable(),
  // SEO Fields
  metaTitle: z.string().max(60).optional().nullable(),
  metaDescription: z.string().max(160).optional().nullable(),
  metaKeywords: z.string().optional().nullable(),
  // Open Graph titles may reasonably be longer than the SEO meta title.
  // Keep a safety limit without rejecting existing curated social titles.
  ogTitle: z.string().max(100, 'Social title must be 100 characters or fewer').optional().nullable(),
  ogDescription: z.string().max(200).optional().nullable(),
  ogImage: z.string().optional().nullable(),
  // Usage Scenes for Solution association
  usageScenes: z.array(z.string()).default([]),
})

export type ProductState = {
  error?: string
  errors?: Record<string, string[]>
  success?: boolean
}

const productDetailInclude = {
  category: { include: { parent: true } },
  images: { orderBy: { sortOrder: 'asc' as const } },
  variants: true,
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
  priceTiers: { orderBy: { sortOrder: 'asc' as const } },
} satisfies Parameters<typeof prisma.product.findUnique>[0]['include']

// Get all products with pagination and filters
export async function getProducts({
  page = 1,
  limit = 10,
  search = '',
  categoryId = '',
  categoryIds = [],
  isActive,
  activeOnly = false,
  orderBy = 'sortOrder',
}: {
  page?: number
  limit?: number
  search?: string
  categoryId?: string
  categoryIds?: string[]
  isActive?: boolean
  activeOnly?: boolean
  orderBy?: 'sortOrder' | 'createdAt' | 'name' | 'price'
} = {}) {
  const where: any = {}

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { sku: { contains: search, mode: 'insensitive' } },
    ]
  }

  // Support both single categoryId and multiple categoryIds
  if (categoryIds.length > 0) {
    where.categoryId = { in: categoryIds }
  } else if (categoryId) {
    where.categoryId = categoryId
  }

  if (typeof isActive === 'boolean') {
    where.isActive = isActive
  } else if (activeOnly) {
    where.isActive = true
  }

  // Build orderBy clause
  const orderByClause: any = orderBy === 'sortOrder'
    ? [{ sortOrder: 'asc' }, { createdAt: 'desc' }]
    : orderBy === 'name'
    ? { name: 'asc' }
    : orderBy === 'price'
    ? { price: 'asc' }
    : { createdAt: 'desc' }

  const [productsRaw, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        category: true,
        images: { orderBy: { sortOrder: 'asc' }, take: 1 },
        priceTiers: { orderBy: { sortOrder: 'asc' } },
      },
      orderBy: orderByClause,
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
  let product = await prisma.product.findUnique({
    where: { slug, isActive: true },
    include: productDetailInclude,
  })

  if (!product) {
    const redirect = await prisma.productSlugRedirect.findUnique({
      where: { slug },
      select: { productId: true },
    })

    if (redirect) {
      product = await prisma.product.findUnique({
        where: { id: redirect.productId, isActive: true },
        include: productDetailInclude,
      })
    }
  }

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

  const usageScenesJson = formData.get('usageScenes')
  let usageScenes: string[] = []
  if (usageScenesJson && typeof usageScenesJson === 'string') {
    try {
      usageScenes = JSON.parse(usageScenesJson)
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
    images: (() => {
      const imagesRaw = formData.get('images') as string
      if (!imagesRaw) return []
      try {
        return JSON.parse(imagesRaw)
      } catch {
        return []
      }
    })(),
    // SEO Fields
    metaTitle: formData.get('metaTitle') || null,
    metaDescription: formData.get('metaDescription') || null,
    metaKeywords: formData.get('metaKeywords') || null,
    ogTitle: formData.get('ogTitle') || null,
    ogDescription: formData.get('ogDescription') || null,
    ogImage: formData.get('ogImage') || null,
    // Usage Scenes
    usageScenes,
  }

  const result = productSchema.safeParse(rawData)
  if (!result.success) {
    return { errors: result.error.flatten().fieldErrors }
  }

  const { images, specifications: validatedSpecs, content: validatedContent, categoryId, priceTiers: _priceTiers, metaTitle, metaDescription, metaKeywords, ogTitle, ogDescription, ogImage, usageScenes: validatedUsageScenes, ...productData } = result.data
  const normalizedSlug = await generateUniqueProductSlug(prisma, {
    name: productData.name,
    preferredSlug: productData.slug,
  })

  let createdProductId = ''

  await prisma.$transaction(async (tx) => {
    const product = await tx.product.create({
      data: {
        ...productData,
        slug: normalizedSlug,
        category: categoryId ? { connect: { id: categoryId } } : undefined,
        content: validatedContent ?? undefined,
        specifications: validatedSpecs ?? undefined,
        usageScenes: validatedUsageScenes ?? [],
        // SEO Fields
        metaTitle: metaTitle ?? undefined,
        metaDescription: metaDescription ?? undefined,
        metaKeywords: metaKeywords ?? undefined,
        ogTitle: ogTitle ?? undefined,
        ogDescription: ogDescription ?? undefined,
        ogImage: ogImage ?? undefined,
    images: images?.length
          ? {
              create: images.map((img, index) => ({
                url: img.url,
                alt: img.alt || '',
                sortOrder: index,
              })),
            }
          : undefined,
      },
    })

    createdProductId = product.id

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
  },
  {
    timeout: 30000, // 30 seconds timeout for complex product creation
  }
  )

  if (createdProductId) {
    after(() => updateProductEmbedding(createdProductId))
  }

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

  const usageScenesJson = formData.get('usageScenes')
  let usageScenes: string[] = []
  if (usageScenesJson && typeof usageScenesJson === 'string') {
    try {
      usageScenes = JSON.parse(usageScenesJson)
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
    images: (() => {
      const imagesRaw = formData.get('images') as string
      if (!imagesRaw) return []
      try {
        return JSON.parse(imagesRaw)
      } catch {
        return []
      }
    })(),
    // SEO Fields
    metaTitle: formData.get('metaTitle') || null,
    metaDescription: formData.get('metaDescription') || null,
    metaKeywords: formData.get('metaKeywords') || null,
    ogTitle: formData.get('ogTitle') || null,
    ogDescription: formData.get('ogDescription') || null,
    ogImage: formData.get('ogImage') || null,
    // Usage Scenes
    usageScenes,
  }

  const result = productSchema.safeParse(rawData)
  if (!result.success) {
    return { errors: result.error.flatten().fieldErrors }
  }

  const { images, specifications: validatedSpecs, content: validatedContent, categoryId, priceTiers: _priceTiers, metaTitle, metaDescription, metaKeywords, ogTitle, ogDescription, ogImage, usageScenes: validatedUsageScenes, ...productData } = result.data
  const currentProduct = await prisma.product.findUnique({
    where: { id },
    select: { slug: true },
  })

  if (!currentProduct) {
    return { error: 'Product not found' }
  }

  const normalizedSlug = await generateUniqueProductSlug(prisma, {
    name: productData.name,
    preferredSlug: productData.slug,
    excludeProductId: id,
  })

  await prisma.$transaction(
    async (tx) => {
      // Delete existing images
      await tx.productImage.deleteMany({ where: { productId: id } })

      // Delete existing product collections
      await tx.productCollection.deleteMany({ where: { productId: id } })

    // Delete existing attribute values
    await tx.productAttributeValue.deleteMany({ where: { productId: id } })

    // Delete existing price tiers
    await tx.priceTier.deleteMany({ where: { productId: id } })

    // Update product with new images
    await tx.product.update({
      where: { id },
      data: {
        ...productData,
        slug: normalizedSlug,
        category: categoryId ? { connect: { id: categoryId } } : { disconnect: true },
        content: validatedContent ?? undefined,
        specifications: validatedSpecs ?? undefined,
        usageScenes: validatedUsageScenes ?? [],
        // SEO Fields
        metaTitle: metaTitle ?? null,
        metaDescription: metaDescription ?? null,
        metaKeywords: metaKeywords ?? null,
        ogTitle: ogTitle ?? null,
        ogDescription: ogDescription ?? null,
        ogImage: ogImage ?? null,
    images: images?.length
          ? {
              create: images.map((img, index) => ({
                url: img.url,
                alt: img.alt || '',
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

    if (currentProduct.slug !== normalizedSlug) {
      await saveLegacyProductSlug(tx, {
        productId: id,
        previousSlug: currentProduct.slug,
      })
    }
  },
  {
    timeout: 30000, // 30 seconds timeout for complex product updates
  }
  )

  after(() => updateProductEmbedding(id))

  revalidatePath('/admin/products')
  revalidatePath('/products')
  revalidatePath(`/products/${currentProduct.slug}`)
  revalidatePath(`/products/${normalizedSlug}`)
  redirect('/admin/products')
}

// Archive product (soft delete - marks as inactive)
export async function archiveProduct(id: string) {
  await requireAdmin()

  await prisma.product.update({
    where: { id },
    data: { isActive: false },
  })

  revalidatePath('/admin/products')
  revalidatePath('/products')
}

// Permanently delete product (hard delete)
// Only works for products without order history
export async function deleteProduct(id: string) {
  await requireAdmin()

  // Check if product has any order items
  const orderItemCount = await prisma.orderItem.count({
    where: { productId: id },
  })

  if (orderItemCount > 0) {
    throw new Error(
      `Cannot delete product: it has ${orderItemCount} order(s) associated. Use archive instead.`
    )
  }

  // Delete related records first (in order of dependencies)
  await prisma.$transaction(async (tx) => {
    // Delete price tiers
    await tx.priceTier.deleteMany({ where: { productId: id } })
    // Delete cart items
    await tx.cartItem.deleteMany({ where: { productId: id } })
    // Delete images
    await tx.productImage.deleteMany({ where: { productId: id } })
    // Delete attribute values
    await tx.productAttributeValue.deleteMany({ where: { productId: id } })
    // Delete collection associations
    await tx.productCollection.deleteMany({ where: { productId: id } })
    // Finally delete the product
    await tx.product.delete({ where: { id } })
  })

  revalidatePath('/admin/products')
  revalidatePath('/products')
}

// Update product sort order (for drag-and-drop reordering)
export async function updateProductsOrder(productIds: string[]) {
  await requireAdmin()

  // Update sort order for each product based on array position
  await prisma.$transaction(
    productIds.map((id, index) =>
      prisma.product.update({
        where: { id },
        data: { sortOrder: index },
      })
    )
  )

  revalidatePath('/admin/products')
  revalidatePath('/products')
}

// Update single product sort order
export async function updateProductSortOrder(productId: string, sortOrder: number) {
  await requireAdmin()

  await prisma.product.update({
    where: { id: productId },
    data: { sortOrder },
  })

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

async function updateProductEmbedding(productId: string) {
  try {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { category: true },
    })

    if (!product) return

    const embedding = await generateEmbedding(
      buildProductEmbeddingText({
        name: product.name,
        description: product.description,
        categoryName: product.category?.name,
        usageScenes: product.usageScenes,
        specifications: product.specifications,
      })
    )

    if (!embedding) return

    await prisma.$executeRawUnsafe(
      'UPDATE products SET embedding = $1::vector WHERE id = $2',
      `[${embedding.join(',')}]`,
      productId
    )
  } catch (error) {
    console.error('Failed to update product embedding:', error)
  }
}
