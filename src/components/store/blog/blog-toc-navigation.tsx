'use client'

import { ChevronDown } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import type { TocItem } from '@/lib/blog-toc'
import styles from './blog-layout.module.css'

export function BlogTocNavigation({ items }: { items: TocItem[] }) {
  const listId = useId()
  const [expanded, setExpanded] = useState(false)
  const [activeId, setActiveId] = useState(items[0]?.id)

  useEffect(() => {
    const headings = items
      .map(({ id }) => document.getElementById(id))
      .filter((heading): heading is HTMLElement => heading !== null)
    const firstHeading = headings[0]
    if (!firstHeading) return

    let frame: number | undefined
    const update = () => {
      frame = undefined
      const inset = Number.parseFloat(getComputedStyle(firstHeading).scrollMarginTop) || 0
      let currentHeading = firstHeading

      for (const heading of headings) {
        if (heading.getBoundingClientRect().top > inset + 2) break
        currentHeading = heading
      }

      setActiveId(currentHeading.id)
    }

    const scheduleUpdate = () => {
      if (frame === undefined) frame = window.requestAnimationFrame(update)
    }

    window.addEventListener('scroll', scheduleUpdate, { passive: true })
    window.addEventListener('resize', scheduleUpdate)
    window.addEventListener('hashchange', scheduleUpdate)
    scheduleUpdate()

    return () => {
      window.removeEventListener('scroll', scheduleUpdate)
      window.removeEventListener('resize', scheduleUpdate)
      window.removeEventListener('hashchange', scheduleUpdate)
      if (frame !== undefined) window.cancelAnimationFrame(frame)
    }
  }, [items])

  return (
    <nav aria-label="On this page" className={styles.toc}>
      <p className={styles.tocHeading}>
        On this page <span>{items.length} sections</span>
      </p>
      <button
        type="button"
        aria-controls={listId}
        aria-expanded={expanded}
        className={styles.tocToggle}
        onClick={() => setExpanded(!expanded)}
      >
        On this page
        <span>{items.length} sections</span>
        <ChevronDown size={17} aria-hidden="true" />
      </button>
      <ol id={listId} className={styles.tocList} data-expanded={expanded}>
        {items.map((item, index) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              aria-current={item.id === activeId ? 'location' : undefined}
              onClick={() => {
                setActiveId(item.id)
                setExpanded(false)
              }}
            >
              <span className={styles.tocNumber} aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
              <span>{item.title}</span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  )
}
