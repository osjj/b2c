import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { pusherServer } from '@/lib/pusher-server'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { sessionId, content, attachments, visitorId } = body

  if (!sessionId || (!content && (!attachments || attachments.length === 0))) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const session = await auth()
  const userId = session?.user?.id
  const isStaff = session?.user?.role === 'ADMIN'

  // Verify session access
  const chatSession = await prisma.chatSession.findUnique({
    where: { id: sessionId },
  })

  if (!chatSession) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  // Verify permission
  if (!isStaff) {
    const hasAccess =
      (userId && chatSession.userId === userId) ||
      (!userId && chatSession.visitorId === visitorId)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
  }

  // Create message
  const message = await prisma.chatMessage.create({
    data: {
      sessionId,
      senderType: isStaff ? 'STAFF' : 'CUSTOMER',
      senderId: isStaff ? userId : null,
      content: content || '',
      attachments: attachments?.length
        ? {
            create: attachments.map((a: { type: string; url: string; fileName: string; fileSize: number }) => ({
              type: a.type as 'IMAGE' | 'FILE',
              url: a.url,
              fileName: a.fileName,
              fileSize: a.fileSize,
            })),
          }
        : undefined,
    },
    include: {
      attachments: true,
    },
  })

  // Update session timestamp
  await prisma.chatSession.update({
    where: { id: sessionId },
    data: { updatedAt: new Date() },
  })

  // Push to Pusher
  await pusherServer.trigger(`chat-session-${sessionId}`, 'new-message', message)

  // Notify admin channel for new customer messages
  if (!isStaff) {
    await pusherServer.trigger('admin-chat', 'new-message', {
      sessionId,
      message,
    })
  }

  return NextResponse.json(message)
}
