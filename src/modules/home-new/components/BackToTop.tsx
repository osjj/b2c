"use client"

import { ChevronUp } from "lucide-react"
import { useSyncExternalStore } from "react"
import styles from "./back-to-top.module.css"

const SCROLL_THRESHOLD = 600

function subscribeToScroll(onScroll: () => void) {
  window.addEventListener("scroll", onScroll, { passive: true })
  return () => window.removeEventListener("scroll", onScroll)
}

function isPastThreshold() {
  return window.scrollY > SCROLL_THRESHOLD
}

function isVisibleOnServer() {
  return false
}

export function BackToTop({ focusTargetId }: { focusTargetId: string }) {
  const visible = useSyncExternalStore(subscribeToScroll, isPastThreshold, isVisibleOnServer)

  if (!visible) return null

  function scrollToTop() {
    document.getElementById(focusTargetId)?.focus({ preventScroll: true })
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    window.scrollTo({ top: 0, behavior: reduceMotion ? "instant" : "smooth" })
  }

  return (
    <button
      className={styles.button}
      type="button"
      aria-label="Back to top"
      title="Back to top"
      onClick={scrollToTop}
    >
      <ChevronUp size={22} strokeWidth={2.25} aria-hidden="true" />
    </button>
  )
}
