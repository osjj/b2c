import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// API Key for batch operations (set in environment variables)
const BATCH_API_KEY = process.env.BATCH_API_KEY

const productSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional().nullable(),
  content: z.any().optional().nullable(),
  specifications: z.array(z.object({
    name: z.string(),
    value: z.string(),
  })).optional().nullable(),
  price: z.number().min(0),
  comparePrice: z.number().optional().nullable(),
  cost: z.number().optional().nullable(),
  sku: z.string().optional().nullable(),
  stock: z.number().int().min(0).default(0),
  categoryId: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  images: z.array(z.string()).optional(),
})

const batchSchema = z.object({
  products: z.array(productSchema).min(1).max(100),
})

export async function POST(request: NextRequest) {
  try {
    // Verify API key
    const apiKey = request.headers.get('x-api-key')
    if (!BATCH_API_KEY || apiKey !== BATCH_API_KEY) {
      return NextResponse.json(
        { error: 'Unauthorized. Invalid API key.' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const result = batchSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: result.error.flatten() },
        { status: 400 }
      )
    }

    const { products } = result.data
    const results: { success: boolean; slug: string; id?: string; error?: string }[] = []

    for (const productData of products) {
      try {
        const { images, ...data } = productData

        // Check slug uniqueness
        const existing = await prisma.product.findUnique({
          where: { slug: data.slug },
        })

        if (existing) {
          results.push({ success: false, slug: data.slug, error: 'Slug already exists' })
          continue
        }

        // Check SKU uniqueness if provided
        if (data.sku) {
          const existingSku = await prisma.product.findUnique({
            where: { sku: data.sku },
          })
          if (existingSku) {
            results.push({ success: false, slug: data.slug, error: 'SKU already exists' })
            continue
          }
        }

        const product = await prisma.product.create({
          data: {
            ...data,
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

        results.push({ success: true, slug: data.slug, id: product.id })
      } catch (error) {
        results.push({
          success: false,
          slug: productData.slug,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    const successCount = results.filter(r => r.success).length
    const failCount = results.filter(r => !r.success).length

    return NextResponse.json({
      message: `Batch complete: ${successCount} created, ${failCount} failed`,
      results,
    })
  } catch (error) {
    console.error('Batch create error:', error)
    return NextResponse.json(
      { error: 'Batch create failed' },
      { status: 500 }
    )
  }
}
