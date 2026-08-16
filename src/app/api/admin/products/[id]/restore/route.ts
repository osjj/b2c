import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import {
  collectProductIndexNowUrls,
  scheduleIndexNowUrls,
} from '@/lib/indexnow-auto'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()

  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  try {
    const product = await prisma.product.findUnique({
      where: { id },
      select: { slug: true, isActive: true },
    })

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    if (!product.isActive) {
      await prisma.product.update({
        where: { id },
        data: { isActive: true },
      })

      scheduleIndexNowUrls(
        collectProductIndexNowUrls(
          { slug: product.slug, isPublic: false },
          { slug: product.slug, isPublic: true }
        )
      )
    }

    revalidatePath('/admin/products')
    revalidatePath('/products')

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to restore product' }, { status: 500 })
  }
}
