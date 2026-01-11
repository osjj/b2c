'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth-utils'
import { AttributeType } from '@prisma/client'

const attributeOptionSchema = z.object({
  id: z.string().optional(),
  value: z.string().min(1, 'Option value is required'),
  sortOrder: z.coerce.number().int().default(0),
})

const attributeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  code: z.string().min(1, 'Code is required').regex(/^[a-z0-9_]+$/, 'Code must be lowercase letters, numbers, and underscores only'),
  type: z.nativeEnum(AttributeType),
  isRequired: z.boolean().default(false),
  isFilterable: z.boolean().default(false),
  sortOrder: z.coerce.number().int().default(0),
  isActive: z.boolean().default(true),
  options: z.array(attributeOptionSchema).optional(),
})

export type AttributeState = {
  error?: string
  errors?: Record<string, string[]>
  success?: boolean
}

// Get all attributes
export async function getAttributes({
  includeInactive = false,
}: {
  includeInactive?: boolean
} = {}) {
  const where: any = {}

  if (!includeInactive) {
    where.isActive = true
  }

  return prisma.attribute.findMany({
    where,
    include: {
      options: {
        orderBy: { sortOrder: 'asc' },
      },
      _count: { select: { productValues: true } },
    },
    orderBy: { sortOrder: 'asc' },
  })
}

// Get single attribute with options
export async function getAttribute(id: string) {
  return prisma.attribute.findUnique({
    where: { id },
    include: {
      options: {
        orderBy: { sortOrder: 'asc' },
      },
      _count: { select: { productValues: true } },
    },
  })
}

// Get attributes for product form
export async function getAttributesForProduct() {
  return prisma.attribute.findMany({
    where: { isActive: true },
    include: {
      options: {
        orderBy: { sortOrder: 'asc' },
      },
    },
    orderBy: { sortOrder: 'asc' },
  })
}

// Create attribute
export async function createAttribute(
  prevState: AttributeState,
  formData: FormData
): Promise<AttributeState> {
  await requireAdmin()

  const optionsJson = formData.get('options')
  let options: any[] = []
  if (optionsJson && typeof optionsJson === 'string') {
    try {
      options = JSON.parse(optionsJson)
    } catch {
      return { error: 'Invalid options format' }
    }
  }

  const rawData = {
    name: formData.get('name'),
    code: formData.get('code'),
    type: formData.get('type') as AttributeType,
    isRequired: formData.get('isRequired') === 'true',
    isFilterable: formData.get('isFilterable') === 'true',
    sortOrder: formData.get('sortOrder') || 0,
    isActive: formData.get('isActive') === 'true',
    options,
  }

  const result = attributeSchema.safeParse(rawData)
  if (!result.success) {
    return { errors: result.error.flatten().fieldErrors }
  }

  // Check code uniqueness
  const existing = await prisma.attribute.findUnique({
    where: { code: result.data.code },
  })
  if (existing) {
    return { error: 'Attribute code already exists' }
  }

  const { options: optionsData, ...attributeData } = result.data

  await prisma.attribute.create({
    data: {
      ...attributeData,
      options: optionsData && optionsData.length > 0
        ? {
            create: optionsData.map((opt, index) => ({
              value: opt.value,
              sortOrder: opt.sortOrder ?? index,
            })),
          }
        : undefined,
    },
  })

  revalidatePath('/admin/attributes')
  redirect('/admin/attributes')
}

// Update attribute
export async function updateAttribute(
  id: string,
  prevState: AttributeState,
  formData: FormData
): Promise<AttributeState> {
  await requireAdmin()

  const optionsJson = formData.get('options')
  let options: any[] = []
  if (optionsJson && typeof optionsJson === 'string') {
    try {
      options = JSON.parse(optionsJson)
    } catch {
      return { error: 'Invalid options format' }
    }
  }

  const rawData = {
    name: formData.get('name'),
    code: formData.get('code'),
    type: formData.get('type') as AttributeType,
    isRequired: formData.get('isRequired') === 'true',
    isFilterable: formData.get('isFilterable') === 'true',
    sortOrder: formData.get('sortOrder') || 0,
    isActive: formData.get('isActive') === 'true',
    options,
  }

  const result = attributeSchema.safeParse(rawData)
  if (!result.success) {
    return { errors: result.error.flatten().fieldErrors }
  }

  // Check code uniqueness (exclude current)
  const existing = await prisma.attribute.findFirst({
    where: { code: result.data.code, NOT: { id } },
  })
  if (existing) {
    return { error: 'Attribute code already exists' }
  }

  const { options: optionsData, ...attributeData } = result.data

  // Get existing options
  const existingOptions = await prisma.attributeOption.findMany({
    where: { attributeId: id },
  })
  const existingOptionIds = existingOptions.map(o => o.id)
  const newOptionIds = optionsData?.filter(o => o.id).map(o => o.id!) || []
  const optionsToDelete = existingOptionIds.filter(id => !newOptionIds.includes(id))

  await prisma.$transaction(async (tx) => {
    // Update attribute
    await tx.attribute.update({
      where: { id },
      data: attributeData,
    })

    // Delete removed options
    if (optionsToDelete.length > 0) {
      await tx.attributeOption.deleteMany({
        where: { id: { in: optionsToDelete } },
      })
    }

    // Upsert options
    if (optionsData && optionsData.length > 0) {
      for (const opt of optionsData) {
        if (opt.id) {
          await tx.attributeOption.update({
            where: { id: opt.id },
            data: { value: opt.value, sortOrder: opt.sortOrder },
          })
        } else {
          await tx.attributeOption.create({
            data: {
              attributeId: id,
              value: opt.value,
              sortOrder: opt.sortOrder,
            },
          })
        }
      }
    }
  })

  revalidatePath('/admin/attributes')
  redirect('/admin/attributes')
}

// Delete attribute
export async function deleteAttribute(id: string) {
  await requireAdmin()

  // Check for product usage
  const usageCount = await prisma.productAttributeValue.count({
    where: { attributeId: id },
  })
  if (usageCount > 0) {
    throw new Error(`Cannot delete attribute that is used by ${usageCount} products`)
  }

  await prisma.attribute.delete({ where: { id } })

  revalidatePath('/admin/attributes')
}

// Get attributes for select dropdown
export async function getAttributesForSelect() {
  return prisma.attribute.findMany({
    where: { isActive: true },
    select: { id: true, name: true, code: true, type: true },
    orderBy: { name: 'asc' },
  })
}
