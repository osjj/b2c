"use client"

import { cn } from "@/lib/utils"
import { User, Clock } from "lucide-react"

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

interface SessionListProps {
  sessions: Session[]
  selectedId: string | null
  onSelect: (id: string) => void
  filter: 'all' | 'ACTIVE' | 'CLOSED'
  onFilterChange: (filter: 'all' | 'ACTIVE' | 'CLOSED') => void
}

export function SessionList({ sessions, selectedId, onSelect, filter, onFilterChange }: SessionListProps) {
  const formatTime = (date: string) => {
    const d = new Date(date)
    const now = new Date()
    const diff = now.getTime() - d.getTime()

    if (diff < 60000) return '刚刚'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
    return d.toLocaleDateString('zh-CN')
  }

  const filteredSessions = filter === 'all'
    ? sessions
    : sessions.filter(s => s.status === filter)

  return (
    <div className="w-72 border-r flex flex-col bg-card">
      {/* Filter tabs */}
      <div className="p-3 border-b flex gap-2">
        {(['all', 'ACTIVE', 'CLOSED'] as const).map((f) => (
          <button
            key={f}
            onClick={() => onFilterChange(f)}
            className={cn(
              "px-3 py-1 text-xs rounded-full transition-colors",
              filter === f
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            {f === 'all' ? '全部' : f === 'ACTIVE' ? '进行中' : '已关闭'}
          </button>
        ))}
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto">
        {filteredSessions.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground text-sm">
            暂无会话
          </div>
        ) : (
          filteredSessions.map((session) => (
            <button
              key={session.id}
              onClick={() => onSelect(session.id)}
              className={cn(
                "w-full p-3 text-left border-b transition-colors hover:bg-muted/50",
                selectedId === session.id && "bg-muted"
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cn(
                  "mt-1 h-2 w-2 rounded-full flex-shrink-0",
                  session.status === 'ACTIVE' ? "bg-green-500" : "bg-gray-300"
                )} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <User className="h-3 w-3 text-muted-foreground" />
                    <span className="text-sm font-medium truncate">
                      {session.user?.name || session.user?.email || `访客 ${session.visitorId?.slice(0, 8)}`}
                    </span>
                    {session._count.messages > 0 && (
                      <span className="ml-auto bg-primary text-primary-foreground text-xs rounded-full px-1.5 py-0.5">
                        {session._count.messages}
                      </span>
                    )}
                  </div>
                  {session.messages[0] && (
                    <p className="text-xs text-muted-foreground truncate mt-1">
                      {session.messages[0].content || '[附件]'}
                    </p>
                  )}
                  <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {formatTime(session.updatedAt)}
                  </div>
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
