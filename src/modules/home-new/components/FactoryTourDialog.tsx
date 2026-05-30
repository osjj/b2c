"use client"

import * as Dialog from "@radix-ui/react-dialog"
import { ChevronLeft, ChevronRight, X } from "lucide-react"
import Image from "next/image"
import { useCallback, useState } from "react"
import { factoryTourImages } from "./data"
import styles from "./home-new.module.css"

export function FactoryTourDialog() {
  const [activeIndex, setActiveIndex] = useState(0)
  const activeImage = factoryTourImages[activeIndex]

  const showPrevious = useCallback(() => {
    setActiveIndex((index) => (index === 0 ? factoryTourImages.length - 1 : index - 1))
  }, [])

  const showNext = useCallback(() => {
    setActiveIndex((index) => (index + 1) % factoryTourImages.length)
  }, [])

  return (
    <Dialog.Root onOpenChange={(open) => open && setActiveIndex(0)}>
      <Dialog.Trigger asChild>
        <button className={`${styles.btn} ${styles.btnWhite}`} type="button">
          Tour the factory
          <span className={styles.arr} aria-hidden="true">
            &rarr;
          </span>
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.factoryTourOverlay} />
        <Dialog.Content
          className={styles.factoryTourDialog}
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft") {
              event.preventDefault()
              showPrevious()
            }

            if (event.key === "ArrowRight") {
              event.preventDefault()
              showNext()
            }
          }}
        >
          <Dialog.Title className={styles.srOnly}>Factory tour gallery</Dialog.Title>
          <Dialog.Description className={styles.srOnly}>
            Browse Laifappe factory, office, and warehouse photos.
          </Dialog.Description>
          <div className={styles.factoryTourImageFrame}>
            <Image
              key={activeImage.src}
              src={activeImage.src}
              alt={activeImage.alt}
              fill
              sizes="(max-width: 768px) 92vw, 1040px"
              className={styles.factoryTourImage}
              priority={activeIndex === 0}
            />
          </div>
          <button
            className={`${styles.factoryTourArrow} ${styles.factoryTourArrowLeft}`}
            type="button"
            onClick={showPrevious}
            aria-label="Previous factory photo"
          >
            <ChevronLeft size={26} strokeWidth={2} aria-hidden="true" />
          </button>
          <button
            className={`${styles.factoryTourArrow} ${styles.factoryTourArrowRight}`}
            type="button"
            onClick={showNext}
            aria-label="Next factory photo"
          >
            <ChevronRight size={26} strokeWidth={2} aria-hidden="true" />
          </button>
          <Dialog.Close className={styles.factoryTourClose} aria-label="Close factory tour">
            <X size={22} strokeWidth={2} aria-hidden="true" />
          </Dialog.Close>
          <div className={styles.factoryTourFooter}>
            <div>
              <span>
                {String(activeIndex + 1).padStart(2, "0")} / {String(factoryTourImages.length).padStart(2, "0")}
              </span>
              <strong>{activeImage.title}</strong>
            </div>
            <div className={styles.factoryTourDots} aria-label="Factory photo selector">
              {factoryTourImages.map((image, index) => (
                <button
                  key={image.src}
                  className={index === activeIndex ? styles.factoryTourDotActive : undefined}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  aria-label={`Show ${image.title}`}
                  aria-current={index === activeIndex ? "true" : undefined}
                />
              ))}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
