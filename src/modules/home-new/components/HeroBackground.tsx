"use client"

import Image from "next/image"
import { useEffect, useState } from "react"
import styles from "./home-new.module.css"

type HeroBackgroundProps = {
  images: string[]
}

const HERO_SLIDE_INTERVAL_MS = 5200

export function HeroBackground({ images }: HeroBackgroundProps) {
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    if (images.length <= 1) return undefined

    const slideTimer = window.setInterval(() => {
      setActiveIndex((currentIndex) => (currentIndex + 1) % images.length)
    }, HERO_SLIDE_INTERVAL_MS)

    return () => window.clearInterval(slideTimer)
  }, [images.length])

  return (
    <div className={styles.heroMedia} aria-hidden="true">
      {images.map((image, index) => (
        <Image
          key={image}
          src={image}
          alt=""
          fill
          priority={index === 0}
          sizes="100vw"
          className={`${styles.heroSlide} ${index === activeIndex ? styles.heroSlideActive : ""}`}
        />
      ))}
      <div className={styles.heroOverlay} />
      <div className={styles.heroOverlay2} />
    </div>
  )
}
