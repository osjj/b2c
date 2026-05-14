import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

const CHAT_GREETING =
  'Hello, we are a professional and cost-effective PPE supplier. How can we help you?'

const chatSessionInclude = {
  messages: {
    include: { attachments: true },
    orderBy: { createdAt: 'asc' as const },
  },
}

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
  const sessionOwnerWhere = userId ? { userId } : visitorId ? { visitorId } : null

  if (!sessionOwnerWhere) {
    return NextResponse.json({ error: 'Missing visitorId' }, { status: 400 })
  }

  const lockKey = userId ? `chat:user:${userId}` : `chat:visitor:${visitorId}`

  const chatSession = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey})::bigint)`

    let activeSession = await tx.chatSession.findFirst({
      where: {
        status: 'ACTIVE',
        ...sessionOwnerWhere,
      },
      include: chatSessionInclude,
      orderBy: { updatedAt: 'desc' },
    })

    if (!activeSession) {
      return tx.chatSession.create({
        data: {
          userId: userId || null,
          visitorId: userId ? null : visitorId,
          messages: {
            create: {
              senderType: 'STAFF',
              content: CHAT_GREETING,
              isRead: true,
            },
          },
        },
        include: chatSessionInclude,
      })
    }

    if (activeSession.messages.length === 0) {
      activeSession = await tx.chatSession.update({
        where: { id: activeSession.id },
        data: {
          updatedAt: new Date(),
          messages: {
            create: {
              senderType: 'STAFF',
              content: CHAT_GREETING,
              isRead: true,
            },
          },
        },
        include: chatSessionInclude,
      })
    }

    return activeSession
  })

  return NextResponse.json(chatSession)
}
