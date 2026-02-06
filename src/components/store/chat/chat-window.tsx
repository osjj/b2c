"use client"

import { useEffect, useState, useCallback } from "react"
import { X, Minus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ChatMessages } from "./chat-messages"
import { ChatInput } from "./chat-input"
import { getPusherClient } from "@/lib/pusher-client"
import type { ChatMessage, ChatSession } from "./types"

interface ChatWindowProps {
  onClose: () => void
  onMinimize: () => void
}

function getVisitorId(): string {
  const key = 'chat_visitor_id'
  let id = localStorage.getItem(key)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(key, id)
  }
  return id
}

export function ChatWindow({ onClose, onMinimize }: ChatWindowProps) {
  const [session, setSession] = useState<ChatSession | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)

  const initSession = useCallback(async () => {
    try {
      const visitorId = getVisitorId()
      const res = await fetch('/api/chat/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitorId }),
      })
      const data: ChatSession = await res.json()
      setSession(data)
      setMessages(data.messages)
    } catch (err) {
      console.error('Failed to init chat session:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    initSession()
  }, [initSession])

  useEffect(() => {
    if (!session) return

    const pusher = getPusherClient()
    const channel = pusher.subscribe(`chat-session-${session.id}`)

    channel.bind('new-message', (message: ChatMessage) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) return prev
        return [...prev, message]
      })

      // Mark as read if from staff
      if (message.senderType === 'STAFF') {
        fetch('/api/chat/read', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: session.id }),
        })
      }
    })

    return () => {
      channel.unbind_all()
      pusher.unsubscribe(`chat-session-${session.id}`)
    }
  }, [session])

  const handleSend = async (
    content: string,
    attachments: Array<{ url: string; fileName: string; fileSize: number; type: 'IMAGE' | 'FILE' }>
  ) => {
    if (!session) return

    const visitorId = getVisitorId()
    await fetch('/api/chat/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: session.id,
        content,
        attachments,
        visitorId,
      }),
    })
  }

  return (
    <div className="w-80 sm:w-96 h-[500px] bg-background border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-primary text-primary-foreground px-4 py-3 flex items-center justify-between">
        <h3 className="font-medium">Live Support</h3>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20" onClick={onMinimize}>
            <Minus className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground text-sm">Loading...</p>
        </div>
      ) : (
        <ChatMessages messages={messages} />
      )}

      {/* Input */}
      <ChatInput onSend={handleSend} disabled={loading || !session} />
    </div>
  )
}
