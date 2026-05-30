import type { ReactNode } from "react"
import styles from "./home-new.module.css"

type SectionHeaderProps = {
  eyebrow: string
  title: ReactNode
  description?: string
  dark?: boolean
  action?: ReactNode
}

export function SectionHeader({ eyebrow, title, description, dark = false, action }: SectionHeaderProps) {
  return (
    <div className={`${styles.sectionHeader} ${dark ? styles.sectionHeaderDark : ""}`}>
      <div>
        <div className={dark ? styles.eyebrowLight : styles.eyebrow}>{eyebrow}</div>
        <h2>{title}</h2>
      </div>
      {action ? <div className={styles.sectionAction}>{action}</div> : null}
      {description ? <p>{description}</p> : null}
    </div>
  )
}
