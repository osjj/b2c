import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

// GET - List sessions (admin only)
export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') as 'ACTIVE' | 'CLOSED' | null

  const sessions = await prisma.chatSession.findMany({
    where: status ? { status } : undefined,
    include: {
      user: { select: { id: true, name: true, email: true, image: true } },
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
      _count: {
        select: {
          messages: { where: { isRead: false, senderType: 'CUSTOMER' } },
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
  })

  return NextResponse.json(sessions)
}

// POST - Create or get session (customer)
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { visitorId } = body

  const session = await auth()
  const userId = session?.user?.id

  // Find existing active session
  let chatSession = await prisma.chatSession.findFirst({
    where: {
      status: 'ACTIVE',
      OR: [
        userId ? { userId } : {},
        !userId && visitorId ? { visitorId } : {},
      ].filter(obj => Object.keys(obj).length > 0),
    },
    include: {
      messages: {
        include: { attachments: true },
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  // Create new session if not found
  if (!chatSession) {
    chatSession = await prisma.chatSession.create({
      data: {
        userId: userId || null,
        visitorId: userId ? null : visitorId,
      },
      include: {
        messages: {
          include: { attachments: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    })
  }

  return NextResponse.json(chatSession)
}
