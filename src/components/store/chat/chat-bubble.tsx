"use client"

import { cn } from "@/lib/utils"
import { FileText, Download } from "lucide-react"
import type { ChatMessage } from "./types"

interface ChatBubbleProps {
  message: ChatMessage
  isOwn: boolean
}

export function ChatBubble({ message, isOwn }: ChatBubbleProps) {
  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  }

  return (
    <div className={cn("flex mb-3", isOwn ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[75%] rounded-2xl px-4 py-2",
          isOwn
            ? "bg-primary text-primary-foreground rounded-br-md"
            : "bg-muted rounded-bl-md"
        )}
      >
        {message.content && (
          <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
        )}

        {message.attachments.map((attachment) => (
          <div key={attachment.id} className="mt-2">
            {attachment.type === 'IMAGE' ? (
              <a href={attachment.url} target="_blank" rel="noopener noreferrer">
                <img
                  src={attachment.url}
                  alt={attachment.fileName}
                  className="max-w-full rounded-lg max-h-48 object-cover"
                />
              </a>
            ) : (
              <a
                href={attachment.url}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "flex items-center gap-2 p-2 rounded-lg",
                  isOwn ? "bg-primary-foreground/10" : "bg-background"
                )}
              >
                <FileText className="h-8 w-8 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{attachment.fileName}</p>
                  <p className="text-xs opacity-70">{formatFileSize(attachment.fileSize)}</p>
                </div>
                <Download className="h-4 w-4 flex-shrink-0" />
              </a>
            )}
          </div>
        ))}

        <p className={cn("text-xs mt-1", isOwn ? "text-primary-foreground/70" : "text-muted-foreground")}>
          {formatTime(message.createdAt)}
        </p>
      </div>
    </div>
  )
}
