import Image from 'next/image'
import { formatUsageSceneLabel, type UsageScene } from '@/lib/usage-scenes'
import { ArrowDown, Shield } from 'lucide-react'
import styles from './solution-detail.module.css'

interface SolutionHeroProps {
  title: string
  excerpt?: string | null
  usageScenes: string[]
  coverImage?: string | null
  sectionLink?: { href: string; label: string }
}

export function SolutionHero({
  title,
  excerpt,
  usageScenes,
  coverImage,
  sectionLink,
}: SolutionHeroProps) {
  return (
    <section className={styles.hero}>
      <div className={styles.heroCopy}>
        <p className={styles.eyebrow}>Basic Information</p>
        <h1 className={styles.heroTitle}>{title}</h1>
        {excerpt ? <p className={styles.heroExcerpt}>{excerpt}</p> : null}
        {usageScenes.length > 0 ? (
          <div className={styles.heroScenes}>
            <Shield size={16} aria-hidden="true" />
            <span>
              {usageScenes.slice(0, 2).map((scene) => formatUsageSceneLabel(scene as UsageScene)).join(' · ')}
              {usageScenes.length > 2 && ` +${usageScenes.length - 2}`}
            </span>
          </div>
        ) : null}
        {sectionLink ? (
          <a href={sectionLink.href} className={styles.heroJump}>
            {sectionLink.label}
            <ArrowDown size={17} aria-hidden="true" />
          </a>
        ) : null}
      </div>
      <div className={styles.heroMedia} data-has-image={Boolean(coverImage)}>
        {coverImage ? (
          <Image
            src={coverImage}
            alt={title}
            fill
            sizes="(max-width: 959px) calc(100vw - 2rem), 48vw"
            className={styles.coverImage}
            priority
          />
        ) : (
          <span>Cover image not set</span>
        )}
      </div>
    </section>
  )
}
