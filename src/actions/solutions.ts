'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth-utils'
import type { SolutionSectionInput, SolutionSectionType } from '@/types/solution'

const SECTION_TYPES = [
  'hero',
  'paragraphs',
  'list',
  'table',
  'group',
  'callout',
  'cta',
  'faq',
] as const satisfies SolutionSectionType[]

const sectionSchema = z.object({
  key: z.string().min(1, 'Section key is required'),
  type: z.enum(SECTION_TYPES),
  title: z.string().optional().nullable(),
  enabled: z.boolean().default(true),
  sort: z.coerce.number().int().optional(),
  data: z.any().default({}),
})

const solutionSchema = z.object({
  slug: z.string().min(1, 'Slug is required'),
  title: z.string().min(1, 'Title is required'),
  excerpt: z.string().optional().nullable(),
  usageScenes: z.array(z.string()).min(1, 'Usage scenes are required'),
  coverImage: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
  sortOrder: z.coerce.number().int().default(0),
  seoTitle: z.string().max(60).optional().nullable(),
  seoDescription: z.string().max(160).optional().nullable(),
  seoKeywords: z.string().optional().nullable(),
  sections: z.array(sectionSchema).default([]),
})

export type SolutionState = {
  error?: string
  errors?: Record<string, string[]>
  success?: boolean
}

const createId = () => {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID()
  }
  return `id_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

const parseUsageScenes = (formData: FormData) => {
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
}

const parseSectionsField = (formData: FormData): SolutionSectionInput[] => {
  const value = formData.get('sections')
  if (!value || typeof value !== 'string' || value === 'null') return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const normalizeSections = (sections: SolutionSectionInput[]) =>
  sections.map((section, index) => ({
    key: section.key?.trim() || `section-${index + 1}`,
    type: section.type,
    title: section.title ?? null,
    enabled: section.enabled ?? true,
    sort: typeof section.sort === 'number' ? section.sort : index,
    data: section.data ?? {},
  }))

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
    include: { sections: { orderBy: { sort: 'asc' } } },
  })

  return solution
}

// Get solution by slug (for store)
export async function getSolutionBySlug(slug: string) {
  const solution = await prisma.solution.findFirst({
    where: { slug, isActive: true },
    include: { sections: { orderBy: { sort: 'asc' } } },
  })

  return solution
}

// Create solution
export async function createSolution(
  prevState: SolutionState,
  formData: FormData
): Promise<SolutionState> {
  await requireAdmin()

  const rawData = {
    slug: formData.get('slug'),
    title: formData.get('title'),
    excerpt: formData.get('excerpt') || null,
    usageScenes: parseUsageScenes(formData),
    coverImage: formData.get('coverImage') || null,
    isActive: formData.get('isActive') === 'true',
    sortOrder: formData.get('sortOrder') || 0,
    seoTitle: formData.get('seoTitle') || null,
    seoDescription: formData.get('seoDescription') || null,
    seoKeywords: formData.get('seoKeywords') || null,
    sections: parseSectionsField(formData),
  }

  const result = solutionSchema.safeParse(rawData)
  if (!result.success) {
    return { errors: result.error.flatten().fieldErrors }
  }

  const data = result.data

  const existing = await prisma.solution.findUnique({
    where: { slug: data.slug },
  })
  if (existing) {
    return { error: 'Slug already exists' }
  }

  const normalizedSections = normalizeSections(data.sections)

  await prisma.solution.create({
    data: {
      id: createId(),
      slug: data.slug,
      title: data.title,
      excerpt: data.excerpt,
      usageScenes: data.usageScenes,
      coverImage: data.coverImage,
      isActive: data.isActive,
      sortOrder: data.sortOrder,
      seoTitle: data.seoTitle,
      seoDescription: data.seoDescription,
      seoKeywords: data.seoKeywords,
      sections: normalizedSections.length
        ? {
            create: normalizedSections.map((section) => ({
              id: createId(),
              sort: section.sort,
              type: section.type,
              key: section.key,
              title: section.title,
              enabled: section.enabled,
              data: section.data,
            })),
          }
        : undefined,
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

  const rawData = {
    slug: formData.get('slug'),
    title: formData.get('title'),
    excerpt: formData.get('excerpt') || null,
    usageScenes: parseUsageScenes(formData),
    coverImage: formData.get('coverImage') || null,
    isActive: formData.get('isActive') === 'true',
    sortOrder: formData.get('sortOrder') || 0,
    seoTitle: formData.get('seoTitle') || null,
    seoDescription: formData.get('seoDescription') || null,
    seoKeywords: formData.get('seoKeywords') || null,
    sections: parseSectionsField(formData),
  }

  const result = solutionSchema.safeParse(rawData)
  if (!result.success) {
    return { errors: result.error.flatten().fieldErrors }
  }

  const data = result.data

  const existing = await prisma.solution.findFirst({
    where: { slug: data.slug, NOT: { id } },
  })
  if (existing) {
    return { error: 'Slug already exists' }
  }

  const normalizedSections = normalizeSections(data.sections)

  await prisma.$transaction(async (tx) => {
    await tx.solution.update({
      where: { id },
      data: {
        slug: data.slug,
        title: data.title,
        excerpt: data.excerpt,
        usageScenes: data.usageScenes,
        coverImage: data.coverImage,
        isActive: data.isActive,
        sortOrder: data.sortOrder,
        seoTitle: data.seoTitle,
        seoDescription: data.seoDescription,
        seoKeywords: data.seoKeywords,
      },
    })

    await tx.solutionSection.deleteMany({ where: { solutionId: id } })

    if (normalizedSections.length) {
      await tx.solutionSection.createMany({
        data: normalizedSections.map((section) => ({
          id: createId(),
          solutionId: id,
          sort: section.sort,
          type: section.type,
          key: section.key,
          title: section.title,
          enabled: section.enabled,
          data: section.data,
        })),
      })
    }
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
