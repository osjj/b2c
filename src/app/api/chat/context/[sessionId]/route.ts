import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { sessionId } = await params

  const chatSession = await prisma.chatSession.findUnique({
    where: { id: sessionId },
    select: { userId: true, visitorId: true },
  })

  if (!chatSession) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  interface CustomerContext {
    type: 'user' | 'guest'
    user?: {
      id: string
      name: string | null
      email: string
      phone: string | null
      createdAt: Date
    }
    visitorId?: string
    orders: Array<{
      id: string
      orderNumber: string
      total: unknown
      status: string
      createdAt: Date
    }>
    cart: Array<{
      name: string
      quantity: number
      price: unknown
    }>
  }

  let context: CustomerContext

  if (chatSession.userId) {
    const user = await prisma.user.findUnique({
      where: { id: chatSession.userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        createdAt: true,
        orders: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: {
            id: true,
            orderNumber: true,
            total: true,
            status: true,
            createdAt: true,
          },
        },
        cart: {
          include: {
            items: {
              include: {
                product: { select: { name: true, price: true } },
              },
            },
          },
        },
      },
    })

    context = {
      type: 'user',
      user: user
        ? {
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            createdAt: user.createdAt,
          }
        : undefined,
      orders: user?.orders || [],
      cart:
        user?.cart?.items.map((item) => ({
          name: item.product.name,
          quantity: item.quantity,
          price: item.product.price,
        })) || [],
    }
  } else {
    context = {
      type: 'guest',
      visitorId: chatSession.visitorId || undefined,
      orders: [],
      cart: [],
    }
  }

  return NextResponse.json(context)
}
