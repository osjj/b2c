"use client"

import { useState, useEffect } from "react"
import { MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ChatWindow } from "./chat-window"
import { getPusherClient } from "@/lib/pusher-client"
import { cn } from "@/lib/utils"

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (isOpen && !isMinimized) {
      setUnreadCount(0)
    }
  }, [isOpen, isMinimized])

  useEffect(() => {
    const visitorId = localStorage.getItem('chat_visitor_id')
    if (!visitorId) return

    // Check for existing session and unread messages
    fetch('/api/chat/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visitorId }),
    })
      .then((res) => res.json())
      .then((session) => {
        if (session?.id) {
          const unread = session.messages.filter(
            (m: { senderType: string; isRead: boolean }) => m.senderType === 'STAFF' && !m.isRead
          ).length
          setUnreadCount(unread)

          // Subscribe to new messages
          const pusher = getPusherClient()
          const channel = pusher.subscribe(`chat-session-${session.id}`)
          channel.bind('new-message', (message: { senderType: string }) => {
            if (message.senderType === 'STAFF' && (isMinimized || !isOpen)) {
              setUnreadCount((prev) => prev + 1)
              // Play notification sound
              try {
                const audio = new Audio('/sounds/notification.mp3')
                audio.volume = 0.5
                audio.play().catch(() => {})
              } catch {}
            }
          })

          return () => {
            channel.unbind_all()
            pusher.unsubscribe(`chat-session-${session.id}`)
          }
        }
      })
      .catch(() => {})
  }, [isOpen, isMinimized])

  const handleOpen = () => {
    setIsOpen(true)
    setIsMinimized(false)
    setUnreadCount(0)
  }

  const handleMinimize = () => {
    setIsMinimized(true)
  }

  const handleClose = () => {
    setIsOpen(false)
    setIsMinimized(false)
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {isOpen && !isMinimized && (
        <div className="mb-4">
          <ChatWindow onClose={handleClose} onMinimize={handleMinimize} />
        </div>
      )}

      <Button
        onClick={handleOpen}
        size="lg"
        className={cn(
          "h-14 w-14 rounded-full shadow-lg",
          isOpen && !isMinimized && "hidden"
        )}
      >
        <MessageCircle className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>
    </div>
  )
}
