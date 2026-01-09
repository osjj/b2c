# Auth Server Actions

## src/actions/auth.ts

```typescript
'use server'

import { signIn, signOut } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hash } from 'bcryptjs'
import { redirect } from 'next/navigation'
import { z } from 'zod'

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

export type LoginState = {
  error?: string
  success?: boolean
}

export type RegisterState = {
  error?: string
  errors?: Record<string, string[]>
  success?: boolean
}

export async function login(
  prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const callbackUrl = formData.get('callbackUrl') as string || '/'

  const result = loginSchema.safeParse({ email, password })
  if (!result.success) {
    return { error: 'Invalid email or password' }
  }

  try {
    await signIn('credentials', {
      email,
      password,
      redirect: false,
    })
  } catch (error) {
    return { error: 'Invalid email or password' }
  }

  redirect(callbackUrl)
}

export async function register(
  prevState: RegisterState,
  formData: FormData
): Promise<RegisterState> {
  const name = formData.get('name') as string
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirmPassword') as string

  const result = registerSchema.safeParse({
    name,
    email,
    password,
    confirmPassword,
  })

  if (!result.success) {
    return {
      errors: result.error.flatten().fieldErrors,
    }
  }

  // Check if user exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  })

  if (existingUser) {
    return { error: 'Email already registered' }
  }

  // Create user
  const hashedPassword = await hash(password, 12)
  await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      role: 'CUSTOMER',
    },
  })

  // Auto login
  try {
    await signIn('credentials', {
      email,
      password,
      redirect: false,
    })
  } catch {
    // If auto-login fails, just redirect to login page
    redirect('/login?registered=true')
  }

  redirect('/')
}

export async function logout() {
  await signOut({ redirectTo: '/' })
}
```
