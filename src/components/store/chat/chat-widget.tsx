"use client"

import { useState, useEffect, useRef } from "react"
import { MessageCircle } from "lucide-react"
import { FloatingEmailButton } from "@/components/store/floating-email-button"
import { ChatWindow } from "./chat-window"
import { getPusherClient } from "@/lib/pusher-client"

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const isOpenRef = useRef(false)
  const isMinimizedRef = useRef(false)

  useEffect(() => {
    isOpenRef.current = isOpen
  }, [isOpen])

  useEffect(() => {
    isMinimizedRef.current = isMinimized
  }, [isMinimized])

  useEffect(() => {
    let cleanup: (() => void) | undefined
    let isMounted = true
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
        if (!isMounted || !session?.id) return

        const unread = session.messages.filter(
          (m: { senderType: string; isRead: boolean }) => m.senderType === 'STAFF' && !m.isRead
        ).length
        setUnreadCount(unread)

        // Subscribe to new messages
        const pusher = getPusherClient()
        const channelName = `chat-session-${session.id}`
        const channel = pusher.subscribe(channelName)
        channel.bind('new-message', (message: { senderType: string }) => {
          if (message.senderType === 'STAFF' && (isMinimizedRef.current || !isOpenRef.current)) {
            setUnreadCount((prev) => prev + 1)
            // Play notification sound
            try {
              const audio = new Audio('/sounds/notification.mp3')
              audio.volume = 0.5
              audio.play().catch(() => {})
            } catch {}
          }
        })

        cleanup = () => {
          channel.unbind_all()
          pusher.unsubscribe(channelName)
        }
      })
      .catch(() => {})

    return () => {
      isMounted = false
      cleanup?.()
    }
  }, [])

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
    <div className="fixed right-6 top-1/2 z-50 flex -translate-y-1/2 flex-col items-end gap-3">
      {isOpen && !isMinimized && (
        <div className="mb-1">
          <ChatWindow onClose={handleClose} onMinimize={handleMinimize} />
        </div>
      )}

      {(!isOpen || isMinimized) && <FloatingEmailButton />}

      {(!isOpen || isMinimized) && (
        <button
          type="button"
          onClick={handleOpen}
          aria-label="Open Laifappe chat"
          className="group inline-flex w-20 flex-col items-center gap-1.5 text-xs font-semibold text-foreground transition-transform hover:-translate-y-0.5 focus-visible:outline-none"
        >
          <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-black/10 transition-colors group-hover:bg-primary/90 group-hover:shadow-xl group-focus-visible:ring-2 group-focus-visible:ring-primary group-focus-visible:ring-offset-2">
            <MessageCircle className="h-6 w-6" />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-xs font-bold text-destructive-foreground">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </span>
          <span className="rounded-full bg-background/95 px-2 py-0.5 leading-none shadow-sm">
            Chat
          </span>
        </button>
      )}
    </div>
  )
}
