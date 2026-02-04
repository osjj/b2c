'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth-utils'

const solutionSchema = z.object({
  slug: z.string().min(1, 'Slug is required'),
  title: z.string().min(1, 'Title is required'),
  subtitle: z.string().optional().nullable(),
  usageScenes: z.array(z.string()).min(1, 'Usage scenes are required'),
  coverImage: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
  sortOrder: z.coerce.number().int().default(0),
  hazardsContent: z.any().optional().nullable(),
  standardsContent: z.any().optional().nullable(),
  faqContent: z.any().optional().nullable(),
  ppeCategories: z.any().optional().nullable(),
  materials: z.any().optional().nullable(),
  metaTitle: z.string().max(60).optional().nullable(),
  metaDescription: z.string().max(160).optional().nullable(),
  metaKeywords: z.string().optional().nullable(),
})

export type SolutionState = {
  error?: string
  errors?: Record<string, string[]>
  success?: boolean
}

// Get all solutions with pagination and filters
export async function getSolutions({
  page = 1,
  limit = 10,
  search = '',
  usageScene,
  isActive,
  activeOnly = false,
}: {
  page?: number
  limit?: number
  search?: string
  usageScene?: string
  isActive?: boolean
  activeOnly?: boolean
} = {}) {
  const where: any = {}

  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { slug: { contains: search, mode: 'insensitive' } },
    ]
  }

  if (usageScene) {
    where.usageScenes = { has: usageScene }
  }

  if (typeof isActive === 'boolean') {
    where.isActive = isActive
  } else if (activeOnly) {
    where.isActive = true
  }

  const [solutions, total] = await Promise.all([
    prisma.solution.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.solution.count({ where }),
  ])

  return {
    solutions,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }
}

// Get single solution by ID
export async function getSolution(id: string) {
  const solution = await prisma.solution.findUnique({
    where: { id },
  })

  return solution
}

// Get solution by slug (for store)
export async function getSolutionBySlug(slug: string) {
  const solution = await prisma.solution.findFirst({
    where: { slug, isActive: true },
  })

  return solution
}

// Get products by solution usage scenes
export async function getProductsBySolution(
  usageScenes: string[],
  {
    page = 1,
    limit = 12,
    categorySlug,
  }: {
    page?: number
    limit?: number
    categorySlug?: string
  } = {}
) {
  // Return empty if no usage scenes provided
  if (!usageScenes || usageScenes.length === 0) {
    return {
      products: [],
      pagination: { page, limit, total: 0, totalPages: 0 },
    }
  }

  const where: any = {
    isActive: true,
    usageScenes: { hasSome: usageScenes },
  }

  if (categorySlug) {
    where.category = { slug: categorySlug }
  }

  const [productsRaw, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        category: true,
        images: { orderBy: { sortOrder: 'asc' }, take: 1 },
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
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

// Create solution
export async function createSolution(
  prevState: SolutionState,
  formData: FormData
): Promise<SolutionState> {
  await requireAdmin()

  // Parse JSON fields
  const parseJsonField = (fieldName: string) => {
    const value = formData.get(fieldName)
    if (!value || typeof value !== 'string' || value === 'null') return null
    try {
      const parsed = JSON.parse(value)
      // For Editor.js content, check if it has blocks
      if (parsed?.blocks !== undefined) {
        return parsed.blocks.length > 0 ? parsed : null
      }
      // For arrays, check if not empty
      if (Array.isArray(parsed)) {
        return parsed.length > 0 ? parsed : null
      }
      return parsed
    } catch {
      return null
    }
  }

  const rawData = {
    slug: formData.get('slug'),
    title: formData.get('title'),
    subtitle: formData.get('subtitle') || null,
    usageScenes: (() => {
      const values = formData.getAll('usageScenes').filter((value) => typeof value === 'string') as string[]
      if (values.length === 1) {
        const value = values[0]?.trim()
        if (value?.startsWith('[')) {
          try {
            return JSON.parse(value)
          } catch {
            return values
          }
        }
      }
      return values
    })(),
    coverImage: formData.get('coverImage') || null,
    isActive: formData.get('isActive') === 'true',
    sortOrder: formData.get('sortOrder') || 0,
    hazardsContent: parseJsonField('hazardsContent'),
    standardsContent: parseJsonField('standardsContent'),
    faqContent: parseJsonField('faqContent'),
    ppeCategories: parseJsonField('ppeCategories'),
    materials: parseJsonField('materials'),
    metaTitle: formData.get('metaTitle') || null,
    metaDescription: formData.get('metaDescription') || null,
    metaKeywords: formData.get('metaKeywords') || null,
  }

  const result = solutionSchema.safeParse(rawData)
  if (!result.success) {
    return { errors: result.error.flatten().fieldErrors }
  }

  const data = result.data

  // Check slug uniqueness
  const existing = await prisma.solution.findUnique({
    where: { slug: data.slug },
  })
  if (existing) {
    return { error: 'Slug already exists' }
  }

  await prisma.solution.create({
    data: {
      slug: data.slug,
      title: data.title,
      subtitle: data.subtitle,
      usageScenes: data.usageScenes,
      coverImage: data.coverImage,
      isActive: data.isActive,
      sortOrder: data.sortOrder,
      hazardsContent: data.hazardsContent ?? undefined,
      standardsContent: data.standardsContent ?? undefined,
      faqContent: data.faqContent ?? undefined,
      ppeCategories: data.ppeCategories ?? undefined,
      materials: data.materials ?? undefined,
      metaTitle: data.metaTitle,
      metaDescription: data.metaDescription,
      metaKeywords: data.metaKeywords,
    },
  })

  revalidatePath('/admin/solutions')
  revalidatePath('/solutions')
  redirect('/admin/solutions')
}

// Update solution
export async function updateSolution(
  id: string,
  prevState: SolutionState,
  formData: FormData
): Promise<SolutionState> {
  await requireAdmin()

  // Parse JSON fields
  const parseJsonField = (fieldName: string) => {
    const value = formData.get(fieldName)
    if (!value || typeof value !== 'string' || value === 'null') return null
    try {
      const parsed = JSON.parse(value)
      // For Editor.js content, check if it has blocks
      if (parsed?.blocks !== undefined) {
        return parsed.blocks.length > 0 ? parsed : null
      }
      // For arrays, check if not empty
      if (Array.isArray(parsed)) {
        return parsed.length > 0 ? parsed : null
      }
      return parsed
    } catch {
      return null
    }
  }

  const rawData = {
    slug: formData.get('slug'),
    title: formData.get('title'),
    subtitle: formData.get('subtitle') || null,
    usageScenes: (() => {
      const values = formData.getAll('usageScenes').filter((value) => typeof value === 'string') as string[]
      if (values.length === 1) {
        const value = values[0]?.trim()
        if (value?.startsWith('[')) {
          try {
            return JSON.parse(value)
          } catch {
            return values
          }
        }
      }
      return values
    })(),
    coverImage: formData.get('coverImage') || null,
    isActive: formData.get('isActive') === 'true',
    sortOrder: formData.get('sortOrder') || 0,
    hazardsContent: parseJsonField('hazardsContent'),
    standardsContent: parseJsonField('standardsContent'),
    faqContent: parseJsonField('faqContent'),
    ppeCategories: parseJsonField('ppeCategories'),
    materials: parseJsonField('materials'),
    metaTitle: formData.get('metaTitle') || null,
    metaDescription: formData.get('metaDescription') || null,
    metaKeywords: formData.get('metaKeywords') || null,
  }

  const result = solutionSchema.safeParse(rawData)
  if (!result.success) {
    return { errors: result.error.flatten().fieldErrors }
  }

  const data = result.data

  // Check slug uniqueness (exclude current solution)
  const existing = await prisma.solution.findFirst({
    where: { slug: data.slug, NOT: { id } },
  })
  if (existing) {
    return { error: 'Slug already exists' }
  }

  await prisma.solution.update({
    where: { id },
    data: {
      slug: data.slug,
      title: data.title,
      subtitle: data.subtitle,
      usageScenes: data.usageScenes,
      coverImage: data.coverImage,
      isActive: data.isActive,
      sortOrder: data.sortOrder,
      hazardsContent: data.hazardsContent,
      standardsContent: data.standardsContent,
      faqContent: data.faqContent,
      ppeCategories: data.ppeCategories,
      materials: data.materials,
      metaTitle: data.metaTitle,
      metaDescription: data.metaDescription,
      metaKeywords: data.metaKeywords,
    },
  })

  revalidatePath('/admin/solutions')
  revalidatePath('/solutions')
  revalidatePath(`/solutions/${data.slug}`)
  redirect('/admin/solutions')
}

// Delete solution
export async function deleteSolution(id: string) {
  await requireAdmin()

  const solution = await prisma.solution.findUnique({
    where: { id },
  })

  if (!solution) {
    throw new Error('Solution not found')
  }

  await prisma.solution.delete({ where: { id } })

  revalidatePath('/admin/solutions')
  revalidatePath('/solutions')
}

// Toggle solution active status
export async function toggleSolutionActive(id: string) {
  await requireAdmin()

  const solution = await prisma.solution.findUnique({
    where: { id },
  })

  if (!solution) {
    throw new Error('Solution not found')
  }

  await prisma.solution.update({
    where: { id },
    data: { isActive: !solution.isActive },
  })

  revalidatePath('/admin/solutions')
  revalidatePath('/solutions')
}

// Update solutions sort order
export async function updateSolutionsOrder(solutionIds: string[]) {
  await requireAdmin()

  await prisma.$transaction(
    solutionIds.map((id, index) =>
      prisma.solution.update({
        where: { id },
        data: { sortOrder: index },
      })
    )
  )

  revalidatePath('/admin/solutions')
  revalidatePath('/solutions')
}
