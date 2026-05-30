import Image from "next/image"
import styles from "./home-new.module.css"

type HeroBackgroundProps = {
  images: string[]
}

export function HeroBackground({ images }: HeroBackgroundProps) {
  const activeImage = images[0]

  return (
    <div className={styles.heroMedia} aria-hidden="true">
      {activeImage ? (
        <Image
          key={activeImage}
          src={activeImage}
          alt=""
          fill
          priority
          sizes="100vw"
          className={`${styles.heroSlide} ${styles.heroSlideActive}`}
        />
      ) : null}
      <div className={styles.heroOverlay} />
      <div className={styles.heroOverlay2} />
    </div>
  )
}
