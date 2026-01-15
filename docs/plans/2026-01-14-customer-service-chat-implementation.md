# Customer Service Chat Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement a real-time customer service chat system with Pusher for the B2C e-commerce platform.

**Architecture:** Pusher handles real-time message delivery. Messages persist in PostgreSQL via Prisma. Frontend uses React components with pusher-js. Backend uses Next.js API routes with Pusher server SDK.

**Tech Stack:** Next.js 16, Prisma, Pusher, pusher-js, React, TypeScript, Cloudflare R2 (attachments)

---

## Task 1: Install Dependencies

**Files:**
- Modify: `package.json`

**Step 1: Install Pusher packages**

Run:
```bash
npm install pusher pusher-js
```
Expected: Packages added to dependencies

**Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add pusher and pusher-js dependencies"
```

---

## Task 2: Add Prisma Chat Models

**Files:**
- Modify: `prisma/schema.prisma`

**Step 1: Add chat enums and models to schema.prisma**

Add at the end of the file:

```prisma
// ==================== Chat Models ====================

enum SessionStatus {
  ACTIVE
  CLOSED
}

enum SenderType {
  CUSTOMER
  STAFF
}

enum AttachmentType {
  IMAGE
  FILE
}

model ChatSession {
  id        String        @id @default(cuid())
  visitorId String?
  userId    String?
  user      User?         @relation(fields: [userId], references: [id])
  status    SessionStatus @default(ACTIVE)
  createdAt DateTime      @default(now())
  updatedAt DateTime      @updatedAt
  messages  ChatMessage[]

  @@index([visitorId])
  @@index([userId])
  @@index([status])
  @@map("chat_sessions")
}

model ChatMessage {
  id          String           @id @default(cuid())
  sessionId   String
  session     ChatSession      @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  senderType  SenderType
  senderId    String?
  content     String           @db.Text
  attachments ChatAttachment[]
  isRead      Boolean          @default(false)
  createdAt   DateTime         @default(now())

  @@index([sessionId])
  @@map("chat_messages")
}

model ChatAttachment {
  id        String         @id @default(cuid())
  messageId String
  message   ChatMessage    @relation(fields: [messageId], references: [id], onDelete: Cascade)
  type      AttachmentType
  url       String
  fileName  String
  fileSize  Int
  createdAt DateTime       @default(now())

  @@index([messageId])
  @@map("chat_attachments")
}
```

**Step 2: Add chatSessions relation to User model**

Find the User model and add to the relations list:

```prisma
chatSessions ChatSession[]
```

**Step 3: Run database migration**

Run:
```bash
npx prisma db push
```
Expected: Database schema updated successfully

**Step 4: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(db): add chat session, message, and attachment models"
```

---

## Task 3: Create Pusher Configuration

**Files:**
- Create: `src/lib/pusher-server.ts`
- Create: `src/lib/pusher-client.ts`

**Step 1: Create server-side Pusher config**

Create `src/lib/pusher-server.ts`:

```typescript
import Pusher from 'pusher'

if (!process.env.PUSHER_APP_ID) throw new Error('PUSHER_APP_ID is required')
if (!process.env.PUSHER_KEY) throw new Error('PUSHER_KEY is required')
if (!process.env.PUSHER_SECRET) throw new Error('PUSHER_SECRET is required')
if (!process.env.PUSHER_CLUSTER) throw new Error('PUSHER_CLUSTER is required')

export const pusherServer = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER,
  useTLS: true,
})
```

**Step 2: Create client-side Pusher config**

Create `src/lib/pusher-client.ts`:

```typescript
import PusherClient from 'pusher-js'

let pusherClient: PusherClient | null = null

export function getPusherClient(): PusherClient {
  if (!pusherClient) {
    pusherClient = new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    })
  }
  return pusherClient
}
```

**Step 3: Commit**

```bash
git add src/lib/pusher-server.ts src/lib/pusher-client.ts
git commit -m "feat: add Pusher server and client configuration"
```

---

## Task 4: Create Chat API - Sessions

**Files:**
- Create: `src/app/api/chat/sessions/route.ts`
- Create: `src/app/api/chat/sessions/[id]/route.ts`

**Step 1: Create sessions list and create endpoint**

Create `src/app/api/chat/sessions/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

// GET - List sessions (admin only)
export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') as 'ACTIVE' | 'CLOSED' | null

  const sessions = await prisma.chatSession.findMany({
    where: status ? { status } : undefined,
    include: {
      user: { select: { id: true, name: true, email: true, image: true } },
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
      _count: {
        select: {
          messages: { where: { isRead: false, senderType: 'CUSTOMER' } },
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
  })

  return NextResponse.json(sessions)
}

// POST - Create or get session (customer)
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { visitorId } = body

  const session = await auth()
  const userId = session?.user?.id

  // Find existing active session
  let chatSession = await prisma.chatSession.findFirst({
    where: {
      status: 'ACTIVE',
      OR: [
        { userId: userId || undefined },
        { visitorId: !userId ? visitorId : undefined },
      ].filter(Boolean),
    },
    include: {
      messages: {
        include: { attachments: true },
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  // Create new session if not found
  if (!chatSession) {
    chatSession = await prisma.chatSession.create({
      data: {
        userId: userId || null,
        visitorId: userId ? null : visitorId,
      },
      include: {
        messages: {
          include: { attachments: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    })
  }

  return NextResponse.json(chatSession)
}
```

**Step 2: Create single session endpoint**

Create `src/app/api/chat/sessions/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

// GET - Get session with messages
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const chatSession = await prisma.chatSession.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true, image: true } },
      messages: {
        include: { attachments: true },
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  if (!chatSession) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  return NextResponse.json(chatSession)
}

// PATCH - Update session (close/reopen)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json()
  const { status } = body

  const chatSession = await prisma.chatSession.update({
    where: { id },
    data: { status },
  })

  return NextResponse.json(chatSession)
}
```

**Step 3: Commit**

```bash
git add src/app/api/chat/sessions/
git commit -m "feat(api): add chat session endpoints"
```

---

## Task 5: Create Chat API - Send Message

**Files:**
- Create: `src/app/api/chat/send/route.ts`

**Step 1: Create send message endpoint**

Create `src/app/api/chat/send/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { pusherServer } from '@/lib/pusher-server'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { sessionId, content, attachments, visitorId } = body

  if (!sessionId || (!content && (!attachments || attachments.length === 0))) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const session = await auth()
  const userId = session?.user?.id
  const isStaff = session?.user?.role === 'ADMIN'

  // Verify session access
  const chatSession = await prisma.chatSession.findUnique({
    where: { id: sessionId },
  })

  if (!chatSession) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  // Verify permission
  if (!isStaff) {
    const hasAccess =
      (userId && chatSession.userId === userId) ||
      (!userId && chatSession.visitorId === visitorId)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
  }

  // Create message
  const message = await prisma.chatMessage.create({
    data: {
      sessionId,
      senderType: isStaff ? 'STAFF' : 'CUSTOMER',
      senderId: isStaff ? userId : null,
      content: content || '',
      attachments: attachments?.length
        ? {
            create: attachments.map((a: { type: string; url: string; fileName: string; fileSize: number }) => ({
              type: a.type as 'IMAGE' | 'FILE',
              url: a.url,
              fileName: a.fileName,
              fileSize: a.fileSize,
            })),
          }
        : undefined,
    },
    include: {
      attachments: true,
    },
  })

  // Update session timestamp
  await prisma.chatSession.update({
    where: { id: sessionId },
    data: { updatedAt: new Date() },
  })

  // Push to Pusher
  await pusherServer.trigger(`chat-session-${sessionId}`, 'new-message', message)

  // Notify admin channel for new customer messages
  if (!isStaff) {
    await pusherServer.trigger('admin-chat', 'new-message', {
      sessionId,
      message,
    })
  }

  return NextResponse.json(message)
}
```

**Step 2: Commit**

```bash
git add src/app/api/chat/send/route.ts
git commit -m "feat(api): add send message endpoint with Pusher"
```

---

## Task 6: Create Chat API - Upload Attachment

**Files:**
- Create: `src/app/api/chat/upload/route.ts`

**Step 1: Create upload endpoint**

Create `src/app/api/chat/upload/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { r2Client } from '@/lib/r2'
import { PutObjectCommand } from '@aws-sdk/client-s3'

const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'medusa'
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || 'https://shop.laifappe.com'

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif']
const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]
const MAX_IMAGE_SIZE = 10 * 1024 * 1024 // 10MB
const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20MB

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const file = formData.get('file') as File | null

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  const isImage = ALLOWED_IMAGE_TYPES.includes(file.type)
  const isFile = ALLOWED_FILE_TYPES.includes(file.type)

  if (!isImage && !isFile) {
    return NextResponse.json({ error: 'Invalid file type' }, { status: 400 })
  }

  const maxSize = isImage ? MAX_IMAGE_SIZE : MAX_FILE_SIZE
  if (file.size > maxSize) {
    return NextResponse.json(
      { error: `File too large. Max size: ${maxSize / 1024 / 1024}MB` },
      { status: 400 }
    )
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const timestamp = Date.now()
  const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
  const key = `chat/${timestamp}-${safeName}`

  await r2Client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: file.type,
    })
  )

  const url = `${R2_PUBLIC_URL}/${key}`

  return NextResponse.json({
    url,
    fileName: file.name,
    fileSize: file.size,
    type: isImage ? 'IMAGE' : 'FILE',
  })
}
```

**Step 2: Commit**

```bash
git add src/app/api/chat/upload/route.ts
git commit -m "feat(api): add chat file upload endpoint"
```

---

## Task 7: Create Chat API - Mark Read

**Files:**
- Create: `src/app/api/chat/read/route.ts`

**Step 1: Create mark-as-read endpoint**

Create `src/app/api/chat/read/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { sessionId } = body

  const session = await auth()
  const isStaff = session?.user?.role === 'ADMIN'

  // Mark messages as read based on who is reading
  await prisma.chatMessage.updateMany({
    where: {
      sessionId,
      isRead: false,
      senderType: isStaff ? 'CUSTOMER' : 'STAFF',
    },
    data: { isRead: true },
  })

  return NextResponse.json({ success: true })
}
```

**Step 2: Commit**

```bash
git add src/app/api/chat/read/route.ts
git commit -m "feat(api): add mark messages as read endpoint"
```

---

## Task 8: Create Chat API - Customer Context

**Files:**
- Create: `src/app/api/chat/context/[sessionId]/route.ts`

**Step 1: Create customer context endpoint**

Create `src/app/api/chat/context/[sessionId]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { sessionId } = await params

  const chatSession = await prisma.chatSession.findUnique({
    where: { id: sessionId },
    select: { userId: true, visitorId: true },
  })

  if (!chatSession) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  let context: {
    type: 'user' | 'guest'
    user?: { id: string; name: string | null; email: string; phone: string | null; createdAt: Date }
    visitorId?: string
    orders: Array<{ id: string; orderNumber: string; total: unknown; status: string; createdAt: Date }>
    cart: Array<{ name: string; quantity: number; price: unknown }>
  }

  if (chatSession.userId) {
    const user = await prisma.user.findUnique({
      where: { id: chatSession.userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        createdAt: true,
        orders: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: {
            id: true,
            orderNumber: true,
            total: true,
            status: true,
            createdAt: true,
          },
        },
        cart: {
          include: {
            items: {
              include: {
                product: { select: { name: true, price: true } },
              },
            },
          },
        },
      },
    })

    context = {
      type: 'user',
      user: user ? {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        createdAt: user.createdAt,
      } : undefined,
      orders: user?.orders || [],
      cart: user?.cart?.items.map((item) => ({
        name: item.product.name,
        quantity: item.quantity,
        price: item.product.price,
      })) || [],
    }
  } else {
    context = {
      type: 'guest',
      visitorId: chatSession.visitorId || undefined,
      orders: [],
      cart: [],
    }
  }

  return NextResponse.json(context)
}
```

**Step 2: Commit**

```bash
git add src/app/api/chat/context/
git commit -m "feat(api): add customer context endpoint for chat"
```

---

## Task 9: Create Frontend Chat Components - Types

**Files:**
- Create: `src/components/store/chat/types.ts`

**Step 1: Create chat types**

Create `src/components/store/chat/types.ts`:

```typescript
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
```

**Step 2: Commit**

```bash
git add src/components/store/chat/types.ts
git commit -m "feat: add chat TypeScript types"
```

---

## Task 10: Create Frontend Chat Components - Bubble

**Files:**
- Create: `src/components/store/chat/chat-bubble.tsx`

**Step 1: Create chat bubble component**

Create `src/components/store/chat/chat-bubble.tsx`:

```typescript
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
```

**Step 2: Commit**

```bash
git add src/components/store/chat/chat-bubble.tsx
git commit -m "feat: add chat bubble component"
```

---

## Task 11: Create Frontend Chat Components - Messages List

**Files:**
- Create: `src/components/store/chat/chat-messages.tsx`

**Step 1: Create messages list component**

Create `src/components/store/chat/chat-messages.tsx`:

```typescript
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
        <p>Send a message to start the conversation</p>
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
```

**Step 2: Commit**

```bash
git add src/components/store/chat/chat-messages.tsx
git commit -m "feat: add chat messages list component"
```

---

## Task 12: Create Frontend Chat Components - Input

**Files:**
- Create: `src/components/store/chat/chat-input.tsx`

**Step 1: Create chat input component**

Create `src/components/store/chat/chat-input.tsx`:

```typescript
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
          alert(data.error || 'Upload failed')
        }
      } catch {
        setAttachments((prev) => prev.filter((a) => a.file !== file))
        alert('Upload failed')
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
          placeholder="Type a message..."
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
```

**Step 2: Commit**

```bash
git add src/components/store/chat/chat-input.tsx
git commit -m "feat: add chat input component with file upload"
```

---

## Task 13: Create Frontend Chat Components - Window

**Files:**
- Create: `src/components/store/chat/chat-window.tsx`

**Step 1: Create chat window component**

Create `src/components/store/chat/chat-window.tsx`:

```typescript
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
        <h3 className="font-medium">Customer Service</h3>
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
```

**Step 2: Commit**

```bash
git add src/components/store/chat/chat-window.tsx
git commit -m "feat: add chat window component with Pusher integration"
```

---

## Task 14: Create Frontend Chat Components - Widget

**Files:**
- Create: `src/components/store/chat/chat-widget.tsx`

**Step 1: Create chat widget (floating button)**

Create `src/components/store/chat/chat-widget.tsx`:

```typescript
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
```

**Step 2: Commit**

```bash
git add src/components/store/chat/chat-widget.tsx
git commit -m "feat: add floating chat widget with unread counter"
```

---

## Task 15: Create Index Export

**Files:**
- Create: `src/components/store/chat/index.ts`

**Step 1: Create index export**

Create `src/components/store/chat/index.ts`:

```typescript
export { ChatWidget } from './chat-widget'
```

**Step 2: Commit**

```bash
git add src/components/store/chat/index.ts
git commit -m "feat: add chat components index export"
```

---

## Task 16: Integrate Chat Widget into Store Layout

**Files:**
- Modify: `src/app/(store)/layout.tsx`

**Step 1: Add ChatWidget to store layout**

Modify `src/app/(store)/layout.tsx`:

```typescript
import { auth } from "@/lib/auth"
import { Header } from "@/components/store/header"
import { Footer } from "@/components/store/footer"
import { ChatWidget } from "@/components/store/chat"

export default async function StoreLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  return (
    <div className="flex min-h-screen flex-col">
      <Header user={session?.user} />
      <main className="flex-1">{children}</main>
      <Footer />
      <ChatWidget />
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/app/\\(store\\)/layout.tsx
git commit -m "feat: integrate chat widget into store layout"
```

---

## Task 17: Create Admin Chat Page - Session List

**Files:**
- Create: `src/app/admin/chat/page.tsx`
- Create: `src/app/admin/chat/components/session-list.tsx`

**Step 1: Create session list component**

Create `src/app/admin/chat/components/session-list.tsx`:

```typescript
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

    if (diff < 60000) return 'Just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
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
            {f === 'all' ? 'All' : f === 'ACTIVE' ? 'Active' : 'Closed'}
          </button>
        ))}
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto">
        {filteredSessions.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground text-sm">
            No conversations
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
                      {session.user?.name || session.user?.email || `Guest ${session.visitorId?.slice(0, 8)}`}
                    </span>
                    {session._count.messages > 0 && (
                      <span className="ml-auto bg-primary text-primary-foreground text-xs rounded-full px-1.5 py-0.5">
                        {session._count.messages}
                      </span>
                    )}
                  </div>
                  {session.messages[0] && (
                    <p className="text-xs text-muted-foreground truncate mt-1">
                      {session.messages[0].content || '[Attachment]'}
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
```

**Step 2: Commit**

```bash
git add src/app/admin/chat/components/session-list.tsx
git commit -m "feat(admin): add chat session list component"
```

---

## Task 18: Create Admin Chat Page - Chat Area

**Files:**
- Create: `src/app/admin/chat/components/chat-area.tsx`

**Step 1: Create admin chat area component**

Create `src/app/admin/chat/components/chat-area.tsx`:

```typescript
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
        <h3 className="font-medium">Conversation</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={handleStatusToggle}
        >
          {sessionStatus === 'ACTIVE' ? (
            <>
              <CheckCircle className="h-4 w-4 mr-2" />
              Close
            </>
          ) : (
            <>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reopen
            </>
          )}
        </Button>
      </div>

      {/* Messages */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground text-sm">Loading...</p>
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
```

**Step 2: Commit**

```bash
git add src/app/admin/chat/components/chat-area.tsx
git commit -m "feat(admin): add chat area component"
```

---

## Task 19: Create Admin Chat Page - Customer Context

**Files:**
- Create: `src/app/admin/chat/components/customer-context.tsx`

**Step 1: Create customer context panel**

Create `src/app/admin/chat/components/customer-context.tsx`:

```typescript
"use client"

import { useEffect, useState } from "react"
import { User, Package, ShoppingCart } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface CustomerContext {
  type: 'user' | 'guest'
  user?: {
    id: string
    name: string | null
    email: string
    phone: string | null
    createdAt: string
  }
  visitorId?: string
  orders: Array<{
    id: string
    orderNumber: string
    total: string
    status: string
    createdAt: string
  }>
  cart: Array<{
    name: string
    quantity: number
    price: string
  }>
}

interface CustomerContextProps {
  sessionId: string
}

export function CustomerContext({ sessionId }: CustomerContextProps) {
  const [context, setContext] = useState<CustomerContext | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadContext = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/chat/context/${sessionId}`)
        const data = await res.json()
        setContext(data)
      } catch (err) {
        console.error('Failed to load context:', err)
      } finally {
        setLoading(false)
      }
    }

    loadContext()
  }, [sessionId])

  if (loading) {
    return (
      <div className="w-72 border-l p-4 bg-card">
        <p className="text-muted-foreground text-sm">Loading...</p>
      </div>
    )
  }

  if (!context) {
    return (
      <div className="w-72 border-l p-4 bg-card">
        <p className="text-muted-foreground text-sm">No context available</p>
      </div>
    )
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('zh-CN')
  }

  const formatPrice = (price: string | number) => {
    return `¥${Number(price).toFixed(2)}`
  }

  return (
    <div className="w-72 border-l bg-card overflow-y-auto">
      {/* User Info */}
      <div className="p-4 border-b">
        <div className="flex items-center gap-2 mb-3">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-sm">Customer Info</span>
        </div>

        {context.type === 'user' && context.user ? (
          <div className="space-y-2 text-sm">
            <p><span className="text-muted-foreground">Name:</span> {context.user.name || '-'}</p>
            <p><span className="text-muted-foreground">Email:</span> {context.user.email}</p>
            <p><span className="text-muted-foreground">Phone:</span> {context.user.phone || '-'}</p>
            <p><span className="text-muted-foreground">Joined:</span> {formatDate(context.user.createdAt)}</p>
          </div>
        ) : (
          <div className="text-sm">
            <Badge variant="secondary">Guest</Badge>
            <p className="text-muted-foreground mt-2 text-xs">ID: {context.visitorId?.slice(0, 12)}...</p>
          </div>
        )}
      </div>

      {/* Orders */}
      <div className="p-4 border-b">
        <div className="flex items-center gap-2 mb-3">
          <Package className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-sm">Recent Orders</span>
        </div>

        {context.orders.length === 0 ? (
          <p className="text-sm text-muted-foreground">No orders</p>
        ) : (
          <div className="space-y-2">
            {context.orders.map((order) => (
              <div key={order.id} className="text-sm p-2 bg-muted rounded-lg">
                <div className="flex justify-between">
                  <span className="font-mono text-xs">{order.orderNumber}</span>
                  <Badge variant="outline" className="text-xs">{order.status}</Badge>
                </div>
                <div className="flex justify-between mt-1 text-muted-foreground">
                  <span>{formatDate(order.createdAt)}</span>
                  <span>{formatPrice(order.total)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cart */}
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-sm">Current Cart</span>
        </div>

        {context.cart.length === 0 ? (
          <p className="text-sm text-muted-foreground">Empty cart</p>
        ) : (
          <div className="space-y-2">
            {context.cart.map((item, i) => (
              <div key={i} className="text-sm p-2 bg-muted rounded-lg">
                <p className="truncate">{item.name}</p>
                <div className="flex justify-between mt-1 text-muted-foreground">
                  <span>x{item.quantity}</span>
                  <span>{formatPrice(item.price)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/app/admin/chat/components/customer-context.tsx
git commit -m "feat(admin): add customer context panel"
```

---

## Task 20: Create Admin Chat Page - Main Page

**Files:**
- Create: `src/app/admin/chat/page.tsx`

**Step 1: Create main admin chat page**

Create `src/app/admin/chat/page.tsx`:

```typescript
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
        new Notification('New Customer Message', {
          body: 'You have a new message from a customer',
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
            <p>Select a conversation to start</p>
          </div>
        </div>
      )}
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/app/admin/chat/page.tsx
git commit -m "feat(admin): add main chat page with three-column layout"
```

---

## Task 21: Add Chat Menu Item to Sidebar

**Files:**
- Modify: `src/components/admin/sidebar.tsx`

**Step 1: Add chat menu item**

In `src/components/admin/sidebar.tsx`, add to the imports:

```typescript
import { MessageSquare } from "lucide-react"
```

Add to menuItems array after Quotes:

```typescript
{ href: "/admin/chat", label: "Chat", icon: MessageSquare },
```

**Step 2: Commit**

```bash
git add src/components/admin/sidebar.tsx
git commit -m "feat(admin): add chat menu item to sidebar"
```

---

## Task 22: Add Notification Sound

**Files:**
- Create: `public/sounds/notification.mp3`

**Step 1: Add notification sound file**

Download or create a short notification sound and save it to `public/sounds/notification.mp3`.

For a simple solution, create the directory:
```bash
mkdir -p public/sounds
```

Then add a placeholder text file explaining the need for a sound:
```bash
echo "Add a notification.mp3 sound file here" > public/sounds/README.txt
```

**Note:** You'll need to add an actual MP3 notification sound file. You can find free ones at:
- https://notificationsounds.com/
- https://freesound.org/

**Step 2: Commit**

```bash
git add public/sounds/
git commit -m "chore: add sounds directory for notifications"
```

---

## Task 23: Add Environment Variables Template

**Files:**
- Modify: `.env.example` (or create if not exists)

**Step 1: Add Pusher environment variables**

Add to `.env.example`:

```env
# Pusher Configuration
PUSHER_APP_ID=your_app_id
PUSHER_KEY=your_key
PUSHER_SECRET=your_secret
PUSHER_CLUSTER=your_cluster
NEXT_PUBLIC_PUSHER_KEY=your_key
NEXT_PUBLIC_PUSHER_CLUSTER=your_cluster
```

**Step 2: Commit**

```bash
git add .env.example
git commit -m "docs: add Pusher environment variables to .env.example"
```

---

## Task 24: Merge Guest Sessions on Login

**Files:**
- Create: `src/lib/chat-utils.ts`
- Modify: `src/app/(auth)/login/page.tsx` (or auth callback)

**Step 1: Create chat utility function**

Create `src/lib/chat-utils.ts`:

```typescript
import { prisma } from './prisma'

export async function mergeGuestSessions(visitorId: string, userId: string) {
  // Find all guest sessions with this visitor ID
  const guestSessions = await prisma.chatSession.findMany({
    where: {
      visitorId,
      userId: null,
    },
  })

  // Update them to be owned by the user
  for (const session of guestSessions) {
    await prisma.chatSession.update({
      where: { id: session.id },
      data: {
        userId,
        visitorId: null,
      },
    })
  }

  return guestSessions.length
}
```

**Step 2: Commit**

```bash
git add src/lib/chat-utils.ts
git commit -m "feat: add utility to merge guest chat sessions on login"
```

---

## Task 25: Final Integration Test

**Step 1: Run database migration**

```bash
npx prisma db push
```

**Step 2: Start development server**

```bash
npm run dev
```

**Step 3: Test the chat flow**

1. Open the store frontend in a browser
2. Click the chat widget button (bottom right)
3. Send a message as a guest
4. Open `/admin/chat` in another tab (logged in as admin)
5. Verify the conversation appears
6. Reply from the admin side
7. Verify real-time message delivery

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete customer service chat implementation"
```

---

## Summary

| Task | Description |
|------|-------------|
| 1 | Install Pusher dependencies |
| 2 | Add Prisma chat models |
| 3 | Create Pusher configuration |
| 4 | Create sessions API |
| 5 | Create send message API |
| 6 | Create upload API |
| 7 | Create mark-read API |
| 8 | Create customer context API |
| 9-15 | Create frontend chat components |
| 16 | Integrate widget into store |
| 17-20 | Create admin chat page |
| 21 | Add sidebar menu item |
| 22 | Add notification sound |
| 23 | Add env variables template |
| 24 | Add guest session merge |
| 25 | Integration test |
