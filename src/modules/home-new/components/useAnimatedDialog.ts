"use client"

import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react"

type DialogMotion = "drawer" | "modal"
type Surface = "panel" | "overlay"

const EASE_OUT = "cubic-bezier(0.23, 1, 0.32, 1)"
const EASE_DRAWER = "cubic-bezier(0.32, 0.72, 0, 1)"

/** Keep Radix mounted through exit, retargeting WAAPI from the displayed frame. */
export function useAnimatedDialog(kind: DialogMotion) {
  const [open, setOpen] = useState(false)
  const present = useRef(false)
  const desiredOpen = useRef(false)
  const epoch = useRef(0)
  const panel = useRef<HTMLDivElement | null>(null)
  const overlay = useRef<HTMLDivElement | null>(null)
  const animations = useRef(new Map<HTMLDivElement, Animation>())

  const animateSurface = useCallback((node: HTMLDivElement, surface: Surface, initial = false) => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const entering = desiredOpen.current
    const version = epoch.current
    const modal = kind === "modal"
    const settledTransform = modal ? "translate(-50%, -50%) scale(1)" : "translateX(0)"
    const closedTransform = modal ? "translate(-50%, -50%) scale(0.97)" : "translateX(100%)"
    const reducedTransform = modal ? "translate(-50%, -50%)" : "none"
    const fades = surface === "overlay" || modal || reduce
    const targetOpacity = fades && !entering ? "0" : "1"
    const targetTransform = reduce ? reducedTransform : entering ? settledTransform : closedTransform

    if (initial) {
      node.style.opacity = fades ? "0" : "1"
      if (surface === "panel") node.style.transform = reduce ? reducedTransform : closedTransform
    }

    // Snapshot before cancel: cancelling a fill animation first restores its base style.
    const computed = getComputedStyle(node)
    const fromOpacity = computed.opacity
    const fromTransform = computed.transform
    node.style.opacity = fromOpacity
    if (surface === "panel") node.style.transform = reduce ? reducedTransform : fromTransform
    animations.current.get(node)?.cancel()

    const easingToken = surface === "panel" && !modal && !reduce ? "--home-ease-drawer" : "--home-ease-out"
    const easing = computed.getPropertyValue(easingToken).trim() || (easingToken === "--home-ease-drawer" ? EASE_DRAWER : EASE_OUT)
    const duration = surface === "overlay" ? (entering ? 200 : 150) : reduce || modal ? 200 : entering ? 320 : 220
    const from: Keyframe = { opacity: fromOpacity }
    const to: Keyframe = { opacity: targetOpacity }
    if (surface === "panel") {
      from.transform = reduce ? reducedTransform : fromTransform
      to.transform = targetTransform
    }

    const animation = node.animate([from, to], { duration, easing, fill: "forwards" })
    animations.current.set(node, animation)
    void animation.finished.then(() => {
      if (epoch.current !== version || animations.current.get(node) !== animation) return
      node.style.opacity = targetOpacity
      if (surface === "panel") node.style.transform = targetTransform
      animations.current.delete(node)
      animation.cancel()
      if (surface === "panel" && !desiredOpen.current) {
        present.current = false
        setOpen(false)
      }
    }).catch(() => {
      // Superseded animations reject finished with AbortError; the latest intent owns exit.
    })
  }, [kind])

  const requestOpen = useCallback((next: boolean) => {
    if (desiredOpen.current === next) return
    desiredOpen.current = next
    epoch.current += 1
    if (next && !present.current) {
      present.current = true
      setOpen(true)
      return
    }
    if (overlay.current) animateSurface(overlay.current, "overlay")
    if (panel.current) animateSurface(panel.current, "panel")
    else if (!next) {
      present.current = false
      setOpen(false)
    }
  }, [animateSurface])

  const panelRef = useCallback((node: HTMLDivElement | null) => {
    if (panel.current) {
      animations.current.get(panel.current)?.cancel()
      animations.current.delete(panel.current)
    }
    panel.current = node
    if (node) animateSurface(node, "panel", true)
  }, [animateSurface])

  const overlayRef = useCallback((node: HTMLDivElement | null) => {
    if (overlay.current) {
      animations.current.get(overlay.current)?.cancel()
      animations.current.delete(overlay.current)
    }
    overlay.current = node
    if (node) animateSurface(node, "overlay", true)
  }, [animateSurface])

  const onTriggerClick = useCallback((event: MouseEvent<HTMLElement>) => {
    // Radix remains open until exit finishes, so a repeated trigger click must reopen it.
    if (present.current && !desiredOpen.current) {
      event.preventDefault()
      requestOpen(true)
    }
  }, [requestOpen])

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)")
    const retarget = () => {
      if (!present.current) return
      epoch.current += 1
      if (overlay.current) animateSurface(overlay.current, "overlay")
      if (panel.current) animateSurface(panel.current, "panel")
    }
    const resize = () => {
      if (animations.current.size > 0) retarget()
    }
    motion.addEventListener("change", retarget)
    window.addEventListener("resize", resize)
    const activeAnimations = animations.current
    return () => {
      epoch.current += 1
      motion.removeEventListener("change", retarget)
      window.removeEventListener("resize", resize)
      activeAnimations.forEach((animation) => animation.cancel())
      activeAnimations.clear()
    }
  }, [animateSurface])

  return { open, requestOpen, onTriggerClick, panelRef, overlayRef }
}
