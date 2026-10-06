'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { ArrowLeft, ChevronDown } from 'lucide-react'
import { caseNumber } from './case-format'
import styles from './cases.module.css'

export function CaseContents({ chapters }: { chapters: { placement: string; title: string }[] }) {
  const detailsRef = useRef<HTMLDetailsElement>(null)

  useEffect(() => {
    const details = detailsRef.current
    const container = details?.closest('[data-case-page]')
    if (!details || !container) return
    let wasWide: boolean | undefined
    const synchronize = (width: number) => {
      const isWide = width > 700
      if (isWide === wasWide) return
      details.open = isWide
      wasWide = isWide
    }
    synchronize(container.getBoundingClientRect().width)
    const observer = new ResizeObserver(([entry]) => synchronize(entry.contentRect.width))
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  return (
    <aside className={styles.contents}>
      {chapters.length > 0 ? (
        <details ref={detailsRef} className={styles.contentsDetails}>
          <summary className={styles.contentsSummary}><span>In this case <span className={styles.contentsCount}>{chapters.length} sections</span></span><ChevronDown size={17} aria-hidden="true" /></summary>
          <nav aria-label="Case contents">
            <span className={`${styles.eyebrow} ${styles.contentsHeading}`}>IN THIS CASE</span>
            <ol>{chapters.map((chapter, index) => <li key={chapter.placement}><a href={`#${chapter.placement}`}><span className={styles.contentsNumber}>{caseNumber(index)}</span><span>{chapter.title}</span></a></li>)}</ol>
            <Link href="/cases" className={styles.backLink}><ArrowLeft size={15} aria-hidden="true" /> All procurement cases</Link>
          </nav>
        </details>
      ) : <Link href="/cases" className={styles.backLink}><ArrowLeft size={15} aria-hidden="true" /> All procurement cases</Link>}
    </aside>
  )
}
