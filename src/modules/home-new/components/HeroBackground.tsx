"use client"

import Image from "next/image"
import { useCallback, useEffect, useRef, useState, type SyntheticEvent } from "react"
import styles from "./home-new.module.css"

type HeroBackgroundProps = {
  images: string[]
  firstSlide: { src: string; srcSet: string }
}

const HERO_SLIDE_INTERVAL_MS = 5200
const HERO_PREPARE_DELAY_MS = 3200

export function HeroBackground(props: HeroBackgroundProps) {
  return <HeroSlides key={props.images.join("|")} {...props} />
}

function HeroSlides({ images, firstSlide }: HeroBackgroundProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [mountedIndexes, setMountedIndexes] = useState([0])
  const [useFirstSlideFallback, setUseFirstSlideFallback] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const readyIndexes = useRef(new Set<number>())
  const failedIndexes = useRef(new Set<number>())
  const onImageSettled = useRef<(index: number) => void>(() => {})

  // Stable handlers prevent next/image from reassigning img.src on every render.
  const handleError = useCallback((event: SyntheticEvent<HTMLImageElement>) => {
    const index = Number(event.currentTarget.dataset.slideIndex)
    failedIndexes.current.add(index)
    onImageSettled.current(index)
  }, [])

  const markImageReady = useCallback((imageElement: HTMLImageElement) => {
    const index = Number(imageElement.dataset.slideIndex)
    if (readyIndexes.current.has(index)) return

    void imageElement.decode().then(() => {
      if (readyIndexes.current.has(index)) return
      failedIndexes.current.delete(index)
      readyIndexes.current.add(index)
      onImageSettled.current(index)
    }).catch(() => {
      failedIndexes.current.add(index)
      onImageSettled.current(index)
    })
  }, [])

  const handleLoad = useCallback((event: SyntheticEvent<HTMLImageElement>) => {
    markImageReady(event.currentTarget)
  }, [markImageReady])

  const checkFirstSlide = useCallback((image: HTMLImageElement | null) => {
    // The CDN image can finish before React hydrates the load/error handlers.
    if (!image?.complete) return
    if (image.naturalWidth > 0) markImageReady(image)
    else setUseFirstSlideFallback(true)
  }, [markImageReady])

  useEffect(() => {
    const container = containerRef.current
    if (!container || images.length <= 1 || typeof IntersectionObserver === "undefined") return

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)")
    let isInView = false
    let currentIndex = 0
    let nextIndex = 1
    let isTransitionDue = false
    let prepareTimer: ReturnType<typeof setTimeout> | undefined
    let transitionTimer: ReturnType<typeof setTimeout> | undefined

    const canPlay = () => isInView && !document.hidden && !motion.matches
    const clearTimers = () => {
      clearTimeout(prepareTimer)
      clearTimeout(transitionTimer)
      isTransitionDue = false
    }

    const advanceIfReady = () => {
      if (!canPlay() || !isTransitionDue || !readyIndexes.current.has(nextIndex)) return
      currentIndex = nextIndex
      setActiveIndex(currentIndex)
      scheduleCycle()
    }

    function scheduleCycle() {
      clearTimers()
      if (!canPlay() || !readyIndexes.current.has(currentIndex)) return

      // A failed upcoming image must never replace the visible image.
      const candidate = Array.from({ length: images.length - 1 }, (_, offset) =>
        (currentIndex + offset + 1) % images.length,
      ).find((index) => !failedIndexes.current.has(index))
      if (candidate === undefined) return
      nextIndex = candidate

      prepareTimer = setTimeout(() => {
        if (!canPlay()) return
        setMountedIndexes((current) => current.includes(candidate) ? current : [...current, candidate])
      }, HERO_PREPARE_DELAY_MS)
      transitionTimer = setTimeout(() => {
        isTransitionDue = true
        advanceIfReady()
      }, HERO_SLIDE_INTERVAL_MS)
    }

    onImageSettled.current = (index) => {
      if (index === currentIndex || failedIndexes.current.has(index)) scheduleCycle()
      else advanceIfReady()
    }
    const observer = new IntersectionObserver(([entry]) => {
      isInView = entry?.isIntersecting ?? false
      scheduleCycle()
    })
    observer.observe(container)
    document.addEventListener("visibilitychange", scheduleCycle)
    motion.addEventListener("change", scheduleCycle)

    return () => {
      clearTimers()
      observer.disconnect()
      document.removeEventListener("visibilitychange", scheduleCycle)
      motion.removeEventListener("change", scheduleCycle)
      onImageSettled.current = () => {}
    }
  }, [images.length])

  return (
    <div ref={containerRef} className={styles.heroMedia} aria-hidden="true">
      {images.map((image, index) => {
        if (!mountedIndexes.includes(index)) return null
        const className = `${styles.heroSlide} ${index === activeIndex ? styles.heroSlideActive : ""}`

        if (index === 0 && !useFirstSlideFallback) {
          return (
            // Pre-sized CDN variants skip runtime optimization. React preloads the matching srcSet.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={image}
              ref={checkFirstSlide}
              data-slide-index={index}
              srcSet={firstSlide.srcSet}
              sizes="100vw"
              src={firstSlide.src}
              alt=""
              fetchPriority="high"
              className={className}
              onLoad={handleLoad}
              onError={() => setUseFirstSlideFallback(true)}
            />
          )
        }

        return (
          <Image
            key={image}
            data-slide-index={index}
            src={image}
            alt=""
            fill
            loading="eager"
            fetchPriority={index === 0 ? "high" : "low"}
            quality={60}
            sizes="100vw"
            className={className}
            onLoad={handleLoad}
            onError={handleError}
          />
        )
      })}
      <div className={styles.heroOverlay} />
      <div className={styles.heroOverlay2} />
    </div>
  )
}
