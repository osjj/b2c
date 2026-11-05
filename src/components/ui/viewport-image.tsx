"use client"

import Image, { type ImageProps } from "next/image"
import { useEffect, useRef, useState } from "react"

export function ViewportImage({ alt, ...props }: ImageProps) {
  const frameRef = useRef<HTMLDivElement>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const frame = frameRef.current
    if (!frame) return
    if (typeof IntersectionObserver === "undefined") {
      const frameId = requestAnimationFrame(() => setReady(true))
      return () => cancelAnimationFrame(frameId)
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return
      setReady(true)
      observer.disconnect()
    }, { rootMargin: "300px 0px" })

    observer.observe(frame)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={frameRef} className="absolute inset-0" data-viewport-image>
      {ready && <Image {...props} alt={alt} />}
      <noscript><Image {...props} alt={alt} /></noscript>
    </div>
  )
}
