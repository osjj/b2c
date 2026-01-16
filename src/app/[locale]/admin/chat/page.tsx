"use client"

import { useEffect, useState, useCallback } from "react"
import { SessionList } from "./components/session-list"
import { ChatArea } from "./components/chat-area"
import { CustomerContext } from "./components/customer-context"
import { getPusherClient } from "@/lib/pusher-client"
import { MessageSquare } from "lucide-react"

interface Session {
  id: string
  visitorId: string | null
  userId: string | null
  status: 'ACTIVE' | 'CLOSED'
  user: { id: string; name: string | null; email: string } | null
  messages: Array<{ content: string; createdAt: string }>
  _count: { messages: number }
  updatedAt: string
}

export default function AdminChatPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'ACTIVE' | 'CLOSED'>('ACTIVE')
  const [loading, setLoading] = useState(true)

  const loadSessions = useCallback(async () => {
    try {
      const res = await fetch('/api/chat/sessions')
      const data = await res.json()
      setSessions(data)
    } catch (err) {
      console.error('Failed to load sessions:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSessions()
  }, [loadSessions])

  useEffect(() => {
    const pusher = getPusherClient()
    const channel = pusher.subscribe('admin-chat')

    channel.bind('new-message', () => {
      loadSessions()

      // Play notification sound
      try {
        const audio = new Audio('/sounds/notification.mp3')
        audio.volume = 0.5
        audio.play().catch(() => {})
      } catch {}

      // Browser notification
      if (Notification.permission === 'granted') {
        new Notification('新客户消息', {
          body: '您有一条新的客户消息',
          icon: '/favicon.ico',
        })
      }
    })

    // Request notification permission
    if (Notification.permission === 'default') {
      Notification.requestPermission()
    }

    return () => {
      channel.unbind_all()
      pusher.unsubscribe('admin-chat')
    }
  }, [loadSessions])

  const selectedSession = sessions.find(s => s.id === selectedId)

  if (loading) {
    return (
      <div className="h-[calc(100vh-7rem)] flex items-center justify-center">
        <p className="text-muted-foreground">加载中...</p>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-7rem)] flex rounded-lg border overflow-hidden">
      {/* Session List */}
      <SessionList
        sessions={sessions}
        selectedId={selectedId}
        onSelect={setSelectedId}
        filter={filter}
        onFilterChange={setFilter}
      />

      {/* Chat Area */}
      {selectedId && selectedSession ? (
        <>
          <ChatArea
            sessionId={selectedId}
            sessionStatus={selectedSession.status}
            onStatusChange={loadSessions}
          />
          <CustomerContext sessionId={selectedId} />
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>选择一个会话开始</p>
          </div>
        </div>
      )}
    </div>
  )
}
