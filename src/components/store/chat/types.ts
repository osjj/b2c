export interface ChatAttachment {
  id: string
  type: 'IMAGE' | 'FILE'
  url: string
  fileName: string
  fileSize: number
}

export interface ChatMessage {
  id: string
  sessionId: string
  senderType: 'CUSTOMER' | 'STAFF'
  senderId: string | null
  content: string
  attachments: ChatAttachment[]
  isRead: boolean
  createdAt: string
}

export interface ChatSession {
  id: string
  visitorId: string | null
  userId: string | null
  status: 'ACTIVE' | 'CLOSED'
  messages: ChatMessage[]
  createdAt: string
  updatedAt: string
}
