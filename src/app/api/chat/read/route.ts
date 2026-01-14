import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { sessionId } = body

  const session = await auth()
  const isStaff = session?.user?.role === 'ADMIN'

  // Mark messages as read based on who is reading
  await prisma.chatMessage.updateMany({
    where: {
      sessionId,
      isRead: false,
      senderType: isStaff ? 'CUSTOMER' : 'STAFF',
    },
    data: { isRead: true },
  })

  return NextResponse.json({ success: true })
}
