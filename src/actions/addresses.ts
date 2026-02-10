'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { z } from 'zod'

const addressSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().min(1, 'Phone is required'),
  province: z.string().min(1, 'Province is required'),
  city: z.string().min(1, 'City is required'),
  district: z.string().min(1, 'District is required'),
  street: z.string().min(1, 'Street address is required'),
  zipCode: z.string().optional(),
  isDefault: z.boolean().optional(),
})

export type AddressState = {
  error?: string
  errors?: Record<string, string[]>
  success?: boolean
}

// Get user addresses
export async function getUserAddresses() {
  const session = await auth()
  if (!session?.user?.id) return []

  return prisma.address.findMany({
    where: { userId: session.user.id },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
  })
}

// Get single address
export async function getAddress(id: string) {
  const session = await auth()
  if (!session?.user?.id) return null

  return prisma.address.findFirst({
    where: { id, userId: session.user.id },
  })
}

// Get default address
export async function getDefaultAddress() {
  const session = await auth()
  if (!session?.user?.id) return null

  return prisma.address.findFirst({
    where: { userId: session.user.id, isDefault: true },
  })
}

// Create address
export async function createAddress(
  prevState: AddressState,
  formData: FormData
): Promise<AddressState> {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: 'Please login to save address' }
  }

  const rawData = {
    name: formData.get('name'),
    phone: formData.get('phone'),
    province: formData.get('province'),
    city: formData.get('city'),
    district: formData.get('district'),
    street: formData.get('street'),
    zipCode: formData.get('zipCode') || '',
    isDefault: formData.get('isDefault') === 'true',
  }

  const result = addressSchema.safeParse(rawData)
  if (!result.success) {
    return { errors: result.error.flatten().fieldErrors }
  }

  const { isDefault, ...addressData } = result.data

  // If setting as default, unset other defaults
  if (isDefault) {
    await prisma.address.updateMany({
      where: { userId: session.user.id },
      data: { isDefault: false },
    })
  }

  await prisma.address.create({
    data: {
      userId: session.user.id,
      ...addressData,
      isDefault: isDefault || false,
    },
  })

  revalidatePath('/account/addresses')
  revalidatePath('/checkout')

  return { success: true }
}

// Wrapper for direct <form action={...}> usage in server components
export async function createAddressFromForm(formData: FormData): Promise<AddressState> {
  return createAddress({}, formData)
}

export async function createAddressAction(formData: FormData): Promise<void> {
  await createAddress({}, formData)
}

// Update address
export async function updateAddress(
  id: string,
  prevState: AddressState,
  formData: FormData
): Promise<AddressState> {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: 'Unauthorized' }
  }

  // Verify ownership
  const existing = await prisma.address.findFirst({
    where: { id, userId: session.user.id },
  })
  if (!existing) {
    return { error: 'Address not found' }
  }

  const rawData = {
    name: formData.get('name'),
    phone: formData.get('phone'),
    province: formData.get('province'),
    city: formData.get('city'),
    district: formData.get('district'),
    street: formData.get('street'),
    zipCode: formData.get('zipCode') || '',
    isDefault: formData.get('isDefault') === 'true',
  }

  const result = addressSchema.safeParse(rawData)
  if (!result.success) {
    return { errors: result.error.flatten().fieldErrors }
  }

  const { isDefault, ...addressData } = result.data

  // If setting as default, unset other defaults
  if (isDefault) {
    await prisma.address.updateMany({
      where: { userId: session.user.id, NOT: { id } },
      data: { isDefault: false },
    })
  }

  await prisma.address.update({
    where: { id },
    data: { ...addressData, isDefault: isDefault || false },
  })

  revalidatePath('/account/addresses')
  revalidatePath('/checkout')

  return { success: true }
}

// Delete address
export async function deleteAddress(id: string) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: 'Unauthorized' }
  }

  const existing = await prisma.address.findFirst({
    where: { id, userId: session.user.id },
  })
  if (!existing) {
    return { error: 'Address not found' }
  }

  await prisma.address.delete({ where: { id } })

  revalidatePath('/account/addresses')
  revalidatePath('/checkout')

  return { success: true }
}

export async function deleteAddressAction(id: string): Promise<void> {
  await deleteAddress(id)
}

// Set default address
export async function setDefaultAddress(id: string) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: 'Unauthorized' }
  }

  await prisma.$transaction([
    prisma.address.updateMany({
      where: { userId: session.user.id },
      data: { isDefault: false },
    }),
    prisma.address.update({
      where: { id },
      data: { isDefault: true },
    }),
  ])

  revalidatePath('/account/addresses')
  revalidatePath('/checkout')

  return { success: true }
}

export async function setDefaultAddressAction(id: string): Promise<void> {
  await setDefaultAddress(id)
}
