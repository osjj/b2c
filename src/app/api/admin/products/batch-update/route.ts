import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// API Key for batch operations (set in environment variables)
const BATCH_API_KEY = process.env.BATCH_API_KEY

const productUpdateSchema = z.object({
  slug: z.string().min(1), // Required for identifying the product
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  content: z.any().optional().nullable(),
  specifications: z.array(z.object({
    name: z.string(),
    value: z.string(),
  })).optional().nullable(),
  price: z.number().min(0).optional(),
  comparePrice: z.number().optional().nullable(),
  cost: z.number().optional().nullable(),
  sku: z.string().optional().nullable(),
  stock: z.number().int().min(0).optional(),
  categoryId: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  images: z.array(z.string()).optional(),
})

const batchUpdateSchema = z.object({
  products: z.array(productUpdateSchema).min(1).max(100),
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
    const result = batchUpdateSchema.safeParse(body)

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
        const { slug, images, ...updateData } = productData

        // Find existing product by slug
        const existing = await prisma.product.findUnique({
          where: { slug },
          include: { images: true },
        })

        if (!existing) {
          results.push({ success: false, slug, error: 'Product not found' })
          continue
        }

        // Check SKU uniqueness if provided and different from current
        if (updateData.sku && updateData.sku !== existing.sku) {
          const existingSku = await prisma.product.findUnique({
            where: { sku: updateData.sku },
          })
          if (existingSku) {
            results.push({ success: false, slug, error: 'SKU already exists' })
            continue
          }
        }

        // Prepare update data
        const dataToUpdate: any = { ...updateData }

        // Handle images update
        if (images !== undefined) {
          // Delete existing images
          await prisma.productImage.deleteMany({
            where: { productId: existing.id },
          })

          // Create new images
          if (images.length > 0) {
            dataToUpdate.images = {
              create: images.map((url, index) => ({
                url,
                sortOrder: index,
              })),
            }
          }
        }

        const product = await prisma.product.update({
          where: { slug },
          data: dataToUpdate,
        })

        results.push({ success: true, slug, id: product.id })
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
      message: `Batch update complete: ${successCount} updated, ${failCount} failed`,
      results,
    })
  } catch (error) {
    console.error('Batch update error:', error)
    return NextResponse.json(
      { error: 'Batch update failed' },
      { status: 500 }
    )
  }
}
