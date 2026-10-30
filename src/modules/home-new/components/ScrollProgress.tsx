"use client"

import { usePathname } from "next/navigation"
import { useEffect, useRef } from "react"
import styles from "./home-new.module.css"

export function ScrollProgress() {
  const fillRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()

  useEffect(() => {
    const fill = fillRef.current
    if (!fill) return

    let frame: number | null = null
    const updateProgress = () => {
      frame = null
      const scroller = document.scrollingElement ?? document.documentElement
      const scrollRange = scroller.scrollHeight - scroller.clientHeight
      const progress = scrollRange > 0
        ? Math.min(1, Math.max(0, scroller.scrollTop / scrollRange))
        : 0
      fill.style.transform = `scaleX(${progress})`
    }
    const scheduleUpdate = () => {
      if (frame === null) frame = window.requestAnimationFrame(updateProgress)
    }

    window.addEventListener("scroll", scheduleUpdate, { passive: true })
    window.addEventListener("resize", scheduleUpdate)
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(scheduleUpdate)
    observer?.observe(document.documentElement)
    observer?.observe(document.body)
    updateProgress()

    return () => {
      window.removeEventListener("scroll", scheduleUpdate)
      window.removeEventListener("resize", scheduleUpdate)
      observer?.disconnect()
      if (frame !== null) window.cancelAnimationFrame(frame)
    }
  }, [pathname])

  return (
    <div className={styles.scrollProgress} aria-hidden="true">
      <div ref={fillRef} className={styles.scrollProgressFill} />
    </div>
  )
}
