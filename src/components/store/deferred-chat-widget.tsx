"use client"

import { useEffect, useState } from "react"
import dynamic from "next/dynamic"

const ChatWidget = dynamic(
  () => import("@/components/store/chat").then((mod) => mod.ChatWidget),
  { ssr: false }
)

export function DeferredChatWidget() {
  const [shouldRender, setShouldRender] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setShouldRender(true)
    }, 2500)

    return () => window.clearTimeout(timer)
  }, [])

  if (!shouldRender) {
    return null
  }

  return <ChatWidget />
}
