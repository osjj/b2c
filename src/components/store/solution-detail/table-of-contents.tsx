'use client'

import { ChevronDown } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import styles from './solution-detail.module.css'

interface TocItem {
  id: string
  title: string
}

interface TableOfContentsProps {
  items: TocItem[]
}

export function TableOfContents({ items }: TableOfContentsProps) {
  const listId = useId()
  const [expanded, setExpanded] = useState(false)
  const [activeId, setActiveId] = useState(items[0]?.id)

  useEffect(() => {
    const sections = items
      .map(({ id }) => document.getElementById(id))
      .filter((section): section is HTMLElement => section !== null)
    const firstSection = sections[0]
    if (!firstSection) return

    let frame: number | undefined
    const update = () => {
      frame = undefined
      const inset = Number.parseFloat(getComputedStyle(firstSection).scrollMarginTop) || 0
      let current = firstSection
      for (const section of sections) {
        if (section.getBoundingClientRect().top > inset + 2) break
        current = section
      }
      setActiveId(current.id)
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

  if (items.length === 0) return null

  return (
    <nav aria-label="On this page" className={styles.toc}>
      <p className={styles.tocHeading}>
        On this page
        <span className={styles.tocCount}>{items.length} sections</span>
      </p>
      <button
        type="button"
        className={styles.tocToggle}
        aria-controls={listId}
        aria-expanded={expanded}
        onClick={() => setExpanded(!expanded)}
      >
        On this page
        <span className={styles.tocCount}>{items.length} sections</span>
        <ChevronDown size={17} aria-hidden="true" />
      </button>
      <ol id={listId} className={styles.tocList} data-expanded={expanded}>
        {items.map((item, index) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              aria-current={activeId === item.id ? 'location' : undefined}
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
