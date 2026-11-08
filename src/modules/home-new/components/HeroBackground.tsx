"use client"

import Image from "next/image"
import { useCallback, useEffect, useRef, useState, type SyntheticEvent } from "react"
import styles from "./home-new.module.css"
import industrial from "./industrial-home.module.css"

type HeroBackgroundProps = {
  images: string[]
  firstSlide: { src: string; srcSet: string }
}

const HERO_SLIDE_INTERVAL_MS = 4000
const HERO_PREPARE_DELAY_MS = 2000

export function HeroBackground(props: HeroBackgroundProps) {
  return <HeroSlides key={props.images.join("|")} {...props} />
}

function HeroSlides({ images, firstSlide }: HeroBackgroundProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [mountedIndexes, setMountedIndexes] = useState([0])
  const [unavailableIndexes, setUnavailableIndexes] = useState<number[]>([])
  const [useFirstSlideFallback, setUseFirstSlideFallback] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const controlsRef = useRef<HTMLDivElement>(null)
  const readyIndexes = useRef(new Set<number>())
  const failedIndexes = useRef(new Set<number>())
  const onImageSettled = useRef<(index: number) => void>(() => {})
  const selectSlide = useRef<(index: number) => void>(() => {})

  // Stable handlers prevent next/image from reassigning img.src on every render.
  const markImageFailed = useCallback((index: number) => {
    if (failedIndexes.current.has(index)) return
    failedIndexes.current.add(index)
    setUnavailableIndexes((current) => [...current, index])
    onImageSettled.current(index)
  }, [])

  const handleError = useCallback((event: SyntheticEvent<HTMLImageElement>) => {
    markImageFailed(Number(event.currentTarget.dataset.slideIndex))
  }, [markImageFailed])

  const markImageReady = useCallback((imageElement: HTMLImageElement) => {
    const index = Number(imageElement.dataset.slideIndex)
    if (readyIndexes.current.has(index)) return

    void imageElement.decode().then(() => {
      if (readyIndexes.current.has(index)) return
      if (failedIndexes.current.delete(index)) {
        setUnavailableIndexes((current) => current.filter((unavailableIndex) => unavailableIndex !== index))
      }
      readyIndexes.current.add(index)
      onImageSettled.current(index)
    }).catch(() => markImageFailed(index))
  }, [markImageFailed])

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
    if (!container || images.length <= 1) return

    const controls = controlsRef.current
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)")
    let controlsFocused = false
    let isInView = false
    let currentIndex = 0
    let nextIndex = 1
    let requestedIndex: number | undefined
    let isTransitionDue = false
    let prepareTimer: ReturnType<typeof setTimeout> | undefined
    let transitionTimer: ReturnType<typeof setTimeout> | undefined
    let progressAnimation: Animation | undefined

    const canPlay = () => isInView && !document.hidden && !motion.matches && !controlsFocused
    const clearTimers = () => {
      clearTimeout(prepareTimer)
      clearTimeout(transitionTimer)
      progressAnimation?.cancel()
      progressAnimation = undefined
      isTransitionDue = false
    }

    const advanceIfReady = () => {
      if (!canPlay() || !isTransitionDue || !readyIndexes.current.has(nextIndex)) return
      showSlide(nextIndex)
    }

    function showSlide(index: number) {
      currentIndex = index
      setActiveIndex(index)
      scheduleCycle()
    }

    function scheduleCycle() {
      clearTimers()
      if (!canPlay() || requestedIndex !== undefined || !readyIndexes.current.has(currentIndex)) return

      // A failed upcoming image must never replace the visible image.
      const candidate = Array.from({ length: images.length - 1 }, (_, offset) =>
        (currentIndex + offset + 1) % images.length,
      ).find((index) => !failedIndexes.current.has(index))
      if (candidate === undefined) return
      nextIndex = candidate

      const progressFill = controls?.children[currentIndex]?.querySelector(`.${industrial.heroDotFill}`)
      progressAnimation = progressFill?.animate?.(
        [{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }],
        { duration: HERO_SLIDE_INTERVAL_MS, fill: "forwards" },
      )
      prepareTimer = setTimeout(() => {
        if (!canPlay()) return
        setMountedIndexes((current) => current.includes(candidate) ? current : [...current, candidate])
      }, HERO_PREPARE_DELAY_MS)
      transitionTimer = setTimeout(() => {
        isTransitionDue = true
        advanceIfReady()
      }, HERO_SLIDE_INTERVAL_MS)
    }

    selectSlide.current = (index) => {
      if (failedIndexes.current.has(index)) return
      requestedIndex = undefined
      if (index === currentIndex || readyIndexes.current.has(index)) {
        showSlide(index)
        return
      }

      clearTimers()
      requestedIndex = index
      setMountedIndexes((current) => current.includes(index) ? current : [...current, index])
    }

    onImageSettled.current = (index) => {
      if (index === requestedIndex) {
        requestedIndex = undefined
        if (readyIndexes.current.has(index)) {
          showSlide(index)
          return
        }
      }
      if (index === currentIndex || failedIndexes.current.has(index)) scheduleCycle()
      else advanceIfReady()
    }

    const onControlsFocus = (event: FocusEvent) => {
      controlsFocused = event.type === "focusin" ||
        (event.relatedTarget instanceof Node && controls?.contains(event.relatedTarget) === true)
      scheduleCycle()
    }
    const observer = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver(([entry]) => {
      isInView = entry?.isIntersecting ?? false
      scheduleCycle()
    })
    observer?.observe(container)
    controls?.addEventListener("focusin", onControlsFocus)
    controls?.addEventListener("focusout", onControlsFocus)
    document.addEventListener("visibilitychange", scheduleCycle)
    motion.addEventListener("change", scheduleCycle)

    return () => {
      clearTimers()
      observer?.disconnect()
      controls?.removeEventListener("focusin", onControlsFocus)
      controls?.removeEventListener("focusout", onControlsFocus)
      document.removeEventListener("visibilitychange", scheduleCycle)
      motion.removeEventListener("change", scheduleCycle)
      onImageSettled.current = () => {}
      selectSlide.current = () => {}
    }
  }, [images.length])

  return (
    <>
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
      {images.length > 1 && (
        <div ref={controlsRef} className={industrial.heroPagination} role="group" aria-label="Homepage slides">
          {images.map((image, index) => (
            <button
              key={image}
              type="button"
              className={industrial.heroDot}
              aria-label={`Show slide ${index + 1} of ${images.length}`}
              aria-current={index === activeIndex ? "true" : undefined}
              disabled={unavailableIndexes.includes(index)}
              onClick={() => selectSlide.current(index)}
            >
              <span className={industrial.heroDotMarker} aria-hidden="true">
                <span className={industrial.heroDotFill} />
              </span>
            </button>
          ))}
        </div>
      )}
    </>
  )
}
