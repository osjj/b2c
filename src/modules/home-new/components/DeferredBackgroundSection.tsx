"use client"

import { useEffect, useRef, type ReactNode } from "react"
import styles from "./home-new.module.css"

interface DeferredBackgroundSectionProps {
  children: ReactNode
  className: string
}

export function DeferredBackgroundSection({ children, className }: DeferredBackgroundSectionProps) {
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return

    const activateBackground = () => {
      section.dataset.backgroundReady = "true"
    }

    if (typeof IntersectionObserver === "undefined") {
      activateBackground()
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return

        activateBackground()
        observer.disconnect()
      },
      { rootMargin: "300px 0px" },
    )

    observer.observe(section)
    return () => observer.disconnect()
  }, [])

  return (
    <section ref={sectionRef} className={`${className} ${styles.deferredBackground}`}>
      {children}
    </section>
  )
}
