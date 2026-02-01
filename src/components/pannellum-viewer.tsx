"use client"

import { useEffect, useRef } from "react"

interface PannellumViewerProps {
  cubeMap: {
    front: string
    right: string
    back: string
    left: string
    up: string
    down: string
  }
  autoRotate?: number
  autoLoad?: boolean
  showControls?: boolean
  className?: string
}

declare global {
  interface Window {
    pannellum: {
      viewer: (
        container: string | HTMLElement,
        config: Record<string, unknown>
      ) => {
        destroy: () => void
        getYaw: () => number
        getPitch: () => number
        setYaw: (yaw: number) => void
        setPitch: (pitch: number) => void
        startAutoRotate: (speed?: number) => void
        stopAutoRotate: () => void
      }
    }
  }
}

export default function PannellumViewer({
  cubeMap,
  autoRotate = -2,
  autoLoad = true,
  showControls = true,
  className = "",
}: PannellumViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<ReturnType<typeof window.pannellum.viewer> | null>(null)
  const scriptLoadedRef = useRef(false)

  useEffect(() => {
    const loadPannellum = async () => {
      // Load CSS if not already loaded
      if (!document.querySelector('link[href*="pannellum"]')) {
        const link = document.createElement("link")
        link.rel = "stylesheet"
        link.href = "https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.css"
        document.head.appendChild(link)
      }

      // Load JS if not already loaded
      if (!window.pannellum && !scriptLoadedRef.current) {
        scriptLoadedRef.current = true
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script")
          script.src = "https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.js"
          script.async = true
          script.onload = () => resolve()
          script.onerror = () => reject(new Error("Failed to load Pannellum"))
          document.body.appendChild(script)
        })
      }

      // Wait for pannellum to be available
      while (!window.pannellum) {
        await new Promise((resolve) => setTimeout(resolve, 50))
      }

      // Initialize viewer
      if (containerRef.current && !viewerRef.current) {
        viewerRef.current = window.pannellum.viewer(containerRef.current, {
          type: "cubemap",
          cubeMap: [
            cubeMap.front,
            cubeMap.right,
            cubeMap.back,
            cubeMap.left,
            cubeMap.up,
            cubeMap.down,
          ],
          autoLoad,
          autoRotate,
          compass: false,
          showControls,
          mouseZoom: false,
          keyboardZoom: false,
          hfov: 100,
          minHfov: 50,
          maxHfov: 120,
          friction: 0.15,
          yaw: 0,
          pitch: 0,
        })
      }
    }

    loadPannellum()

    return () => {
      if (viewerRef.current) {
        viewerRef.current.destroy()
        viewerRef.current = null
      }
    }
  }, [cubeMap, autoLoad, autoRotate, showControls])

  return (
    <div
      ref={containerRef}
      className={`w-full h-full ${className}`}
      style={{ minHeight: "300px" }}
    />
  )
}
