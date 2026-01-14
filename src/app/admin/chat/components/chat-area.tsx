"use client"

import { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { ChatBubble } from "@/components/store/chat/chat-bubble"
import { ChatInput } from "@/components/store/chat/chat-input"
import { getPusherClient } from "@/lib/pusher-client"
import { CheckCircle, RotateCcw } from "lucide-react"
import type { ChatMessage } from "@/components/store/chat/types"

interface ChatAreaProps {
  sessionId: string
  sessionStatus: 'ACTIVE' | 'CLOSED'
  onStatusChange: () => void
}

export function ChatArea({ sessionId, sessionStatus, onStatusChange }: ChatAreaProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)

  const loadMessages = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/chat/sessions/${sessionId}`)
      const data = await res.json()
      setMessages(data.messages || [])

      // Mark as read
      await fetch('/api/chat/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      })
    } catch (err) {
      console.error('Failed to load messages:', err)
    } finally {
      setLoading(false)
    }
  }, [sessionId])

  useEffect(() => {
    loadMessages()
  }, [loadMessages])

  useEffect(() => {
    const pusher = getPusherClient()
    const channel = pusher.subscribe(`chat-session-${sessionId}`)

    channel.bind('new-message', (message: ChatMessage) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) return prev
        return [...prev, message]
      })

      // Mark customer messages as read
      if (message.senderType === 'CUSTOMER') {
        fetch('/api/chat/read', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        })
      }
    })

    return () => {
      channel.unbind_all()
      pusher.unsubscribe(`chat-session-${sessionId}`)
    }
  }, [sessionId])

  const handleSend = async (
    content: string,
    attachments: Array<{ url: string; fileName: string; fileSize: number; type: 'IMAGE' | 'FILE' }>
  ) => {
    await fetch('/api/chat/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, content, attachments }),
    })
  }

  const handleStatusToggle = async () => {
    const newStatus = sessionStatus === 'ACTIVE' ? 'CLOSED' : 'ACTIVE'
    await fetch(`/api/chat/sessions/${sessionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    onStatusChange()
  }

  return (
    <div className="flex-1 flex flex-col bg-background">
      {/* Header */}
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <h3 className="font-medium">对话</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={handleStatusToggle}
        >
          {sessionStatus === 'ACTIVE' ? (
            <>
              <CheckCircle className="h-4 w-4 mr-2" />
              关闭会话
            </>
          ) : (
            <>
              <RotateCcw className="h-4 w-4 mr-2" />
              重新打开
            </>
          )}
        </Button>
      </div>

      {/* Messages */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground text-sm">加载中...</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4">
          {messages.map((message) => (
            <ChatBubble
              key={message.id}
              message={message}
              isOwn={message.senderType === 'STAFF'}
            />
          ))}
        </div>
      )}

      {/* Input */}
      <ChatInput onSend={handleSend} disabled={sessionStatus === 'CLOSED'} />
    </div>
  )
}
