"use client"

import { useEffect, useRef } from "react"
import { ChatBubble } from "./chat-bubble"
import type { ChatMessage } from "./types"

interface ChatMessagesProps {
  messages: ChatMessage[]
}

export function ChatMessages({ messages }: ChatMessagesProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
        <p>发送消息开始对话</p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-4">
      {messages.map((message) => (
        <ChatBubble
          key={message.id}
          message={message}
          isOwn={message.senderType === 'CUSTOMER'}
        />
      ))}
      <div ref={bottomRef} />
    </div>
  )
}
