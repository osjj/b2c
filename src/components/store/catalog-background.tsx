import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import styles from './catalog-background.module.css'

type CatalogBackgroundProps = {
  children: ReactNode
  className?: string
}

/** Static catalog atmosphere; keep overflow visible so catalog panels can stick. */
export function CatalogBackground({ children, className }: CatalogBackgroundProps) {
  return <div className={cn(styles.page, className)}>{children}</div>
}

export function CatalogHero({
  children,
  className,
  tone = 'light',
}: CatalogBackgroundProps & { tone?: 'light' | 'dark' }) {
  return (
    <section className={cn(styles.hero, tone === 'dark' && styles.heroDark, className)}>
      <div className={styles.drawing} aria-hidden="true">
        <span className={styles.drawingRing} />
        <span className={styles.drawingAxis} />
        <span className={styles.drawingAccent} />
      </div>
      {children}
    </section>
  )
}
