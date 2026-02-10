'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const accountSettingsSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters'),
  phone: z.string().trim().max(30, 'Phone must be at most 30 characters').optional(),
})

export type AccountSettingsState = {
  error?: string
  errors?: Record<string, string[]>
  success?: boolean
}

export async function updateAccountSettings(
  prevState: AccountSettingsState,
  formData: FormData
): Promise<AccountSettingsState> {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: 'Please login first' }
  }

  const rawData = {
    name: formData.get('name'),
    phone: formData.get('phone') || '',
  }

  const result = accountSettingsSchema.safeParse(rawData)
  if (!result.success) {
    return { errors: result.error.flatten().fieldErrors }
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name: result.data.name,
      phone: result.data.phone || null,
    },
  })

  revalidatePath('/account')
  revalidatePath('/account/settings')

  return { success: true }
}
