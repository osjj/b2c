import { prisma } from './prisma'

export async function mergeGuestSessions(visitorId: string, userId: string) {
  // Find all guest sessions with this visitor ID
  const guestSessions = await prisma.chatSession.findMany({
    where: {
      visitorId,
      userId: null,
    },
  })

  // Update them to be owned by the user
  for (const session of guestSessions) {
    await prisma.chatSession.update({
      where: { id: session.id },
      data: {
        userId,
        visitorId: null,
      },
    })
  }

  return guestSessions.length
}
