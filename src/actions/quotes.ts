'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const quoteSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  contact: z.string().min(1, 'WhatsApp/WeChat is required'),
  companyName: z.string().optional(),
  remark: z.string().optional(),
  expectedPrice: z.number().min(0).optional(),
  fileUrl: z.string().optional(),
  fileName: z.string().optional(),
  items: z.array(z.object({
    productId: z.string(),
    name: z.string(),
    sku: z.string().optional(),
    price: z.number(),
    image: z.string().optional(),
    quantity: z.number().min(1),
  })).min(1, 'At least one item is required'),
})

export type QuoteFormState = {
  error?: string
  errors?: Record<string, string[]>
  success?: boolean
  quoteNumber?: string
}

// Generate unique quote number
function generateQuoteNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `QT-${timestamp}-${random}`
}

// Create quote (no auth required)
export async function createQuote(data: z.infer<typeof quoteSchema>): Promise<QuoteFormState> {
  const result = quoteSchema.safeParse(data)
  if (!result.success) {
    const flatErrors: Record<string, string[]> = {}
    const formatted = result.error.format()

    if (formatted.name?._errors) flatErrors.name = formatted.name._errors
    if (formatted.email?._errors) flatErrors.email = formatted.email._errors
    if (formatted.contact?._errors) flatErrors.contact = formatted.contact._errors
    if (formatted.items?._errors) flatErrors.items = formatted.items._errors

    return { errors: flatErrors }
  }

  const { name, email, contact, companyName, remark, expectedPrice, fileUrl, fileName, items } = result.data

  try {
    const quote = await prisma.quote.create({
      data: {
        quoteNumber: generateQuoteNumber(),
        name,
        email,
        contact,
        companyName: companyName || null,
        remark: remark || null,
        expectedPrice: expectedPrice || null,
        fileUrl: fileUrl || null,
        fileName: fileName || null,
        items: {
          create: items.map((item) => ({
            productId: item.productId,
            name: item.name,
            sku: item.sku || null,
            price: item.price,
            image: item.image || null,
            quantity: item.quantity,
          })),
        },
      },
    })

    return { success: true, quoteNumber: quote.quoteNumber }
  } catch (error) {
    console.error('Create quote error:', error)
    return { error: 'Failed to submit quote request' }
  }
}

// Get quote by ID (admin only)
export async function getQuote(quoteId: string) {
  return prisma.quote.findUnique({
    where: { id: quoteId },
    include: {
      items: {
        include: {
          product: {
            include: { images: { take: 1 } },
          },
        },
      },
    },
  })
}

// Get quote by quote number
export async function getQuoteByNumber(quoteNumber: string) {
  return prisma.quote.findUnique({
    where: { quoteNumber },
    include: {
      items: {
        include: {
          product: { include: { images: { take: 1 } } },
        },
      },
    },
  })
}
