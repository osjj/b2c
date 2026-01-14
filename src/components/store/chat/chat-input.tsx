"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Paperclip, Send, X, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface PendingAttachment {
  file: File
  preview?: string
  uploading: boolean
  uploaded?: {
    url: string
    fileName: string
    fileSize: number
    type: 'IMAGE' | 'FILE'
  }
}

interface ChatInputProps {
  onSend: (content: string, attachments: Array<{ url: string; fileName: string; fileSize: number; type: 'IMAGE' | 'FILE' }>) => Promise<void>
  disabled?: boolean
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [content, setContent] = useState("")
  const [attachments, setAttachments] = useState<PendingAttachment[]>([])
  const [sending, setSending] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    for (const file of files) {
      const isImage = file.type.startsWith('image/')
      const preview = isImage ? URL.createObjectURL(file) : undefined

      const pending: PendingAttachment = { file, preview, uploading: true }
      setAttachments((prev) => [...prev, pending])

      try {
        const formData = new FormData()
        formData.append('file', file)

        const res = await fetch('/api/chat/upload', { method: 'POST', body: formData })
        const data = await res.json()

        if (res.ok) {
          setAttachments((prev) =>
            prev.map((a) =>
              a.file === file ? { ...a, uploading: false, uploaded: data } : a
            )
          )
        } else {
          setAttachments((prev) => prev.filter((a) => a.file !== file))
          alert(data.error || '上传失败')
        }
      } catch {
        setAttachments((prev) => prev.filter((a) => a.file !== file))
        alert('上传失败')
      }
    }

    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removeAttachment = (file: File) => {
    setAttachments((prev) => {
      const item = prev.find((a) => a.file === file)
      if (item?.preview) URL.revokeObjectURL(item.preview)
      return prev.filter((a) => a.file !== file)
    })
  }

  const handleSend = async () => {
    const uploadedAttachments = attachments
      .filter((a) => a.uploaded)
      .map((a) => a.uploaded!)

    if (!content.trim() && uploadedAttachments.length === 0) return

    setSending(true)
    try {
      await onSend(content.trim(), uploadedAttachments)
      setContent("")
      attachments.forEach((a) => a.preview && URL.revokeObjectURL(a.preview))
      setAttachments([])
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const hasUploading = attachments.some((a) => a.uploading)

  return (
    <div className="border-t p-3">
      {attachments.length > 0 && (
        <div className="flex gap-2 mb-2 flex-wrap">
          {attachments.map((a, i) => (
            <div key={i} className="relative">
              {a.preview ? (
                <img src={a.preview} alt="" className="h-16 w-16 object-cover rounded-lg" />
              ) : (
                <div className="h-16 w-16 bg-muted rounded-lg flex items-center justify-center text-xs text-center p-1">
                  {a.file.name.slice(0, 10)}...
                </div>
              )}
              {a.uploading && (
                <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                </div>
              )}
              <button
                onClick={() => removeAttachment(a.file)}
                className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/gif,application/pdf,.doc,.docx,.xls,.xlsx"
          onChange={handleFileSelect}
          className="hidden"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || sending}
        >
          <Paperclip className="h-5 w-5" />
        </Button>

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入消息..."
          disabled={disabled || sending}
          rows={1}
          className={cn(
            "flex-1 resize-none rounded-lg border bg-background px-3 py-2 text-sm",
            "focus:outline-none focus:ring-2 focus:ring-ring",
            "disabled:opacity-50"
          )}
        />

        <Button
          onClick={handleSend}
          disabled={disabled || sending || hasUploading || (!content.trim() && attachments.length === 0)}
          size="icon"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  )
}
