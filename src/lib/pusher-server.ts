import Pusher from 'pusher'

let pusherServer: Pusher | null = null

export function getPusherServer(): Pusher {
  if (!pusherServer) {
    if (!process.env.PUSHER_APP_ID) throw new Error('PUSHER_APP_ID is required')
    if (!process.env.PUSHER_KEY) throw new Error('PUSHER_KEY is required')
    if (!process.env.PUSHER_SECRET) throw new Error('PUSHER_SECRET is required')
    if (!process.env.PUSHER_CLUSTER) throw new Error('PUSHER_CLUSTER is required')

    pusherServer = new Pusher({
      appId: process.env.PUSHER_APP_ID,
      key: process.env.PUSHER_KEY,
      secret: process.env.PUSHER_SECRET,
      cluster: process.env.PUSHER_CLUSTER,
      useTLS: true,
    })
  }
  return pusherServer
}
