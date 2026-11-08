'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import styles from './product-detail.module.css'

interface Tab {
  id: string
  label: string
}

interface ProductSectionTabsProps {
  hasDescription: boolean
  hasSpecifications: boolean
  hasDetails: boolean
}

export function ProductSectionTabs({
  hasDescription,
  hasSpecifications,
  hasDetails,
}: ProductSectionTabsProps) {
  const tabs = useMemo<Tab[]>(
    () =>
      [
        hasDescription && { id: 'description', label: 'Description' },
        hasSpecifications && { id: 'specifications', label: 'Specifications' },
        hasDetails && { id: 'product-details', label: 'Product Details' },
      ].filter(Boolean) as Tab[],
    [hasDescription, hasSpecifications, hasDetails]
  )

  const [activeId, setActiveId] = useState<string>(tabs[0]?.id ?? '')
  const activeTabId = tabs.some((tab) => tab.id === activeId) ? activeId : tabs[0]?.id
  const navRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const nav = navRef.current
    const sections = tabs
      .map(({ id }) => document.getElementById(id))
      .filter((section): section is HTMLElement => section !== null)
    const firstSection = sections[0]
    if (!nav || !firstSection) return

    let frame: number | undefined
    const updateActiveSection = () => {
      frame = undefined
      // Native anchor scrolling uses the same inset. The extra pixel covers subpixel rounding.
      const anchorInset = Number.parseFloat(getComputedStyle(firstSection).scrollMarginTop) || 0
      const activationLine = Math.max(nav.getBoundingClientRect().bottom, anchorInset) + 1
      let currentSection = firstSection

      for (const section of sections) {
        if (section.getBoundingClientRect().top > activationLine) break
        currentSection = section
      }

      setActiveId(currentSection.id)
    }

    const scheduleUpdate = () => {
      if (frame === undefined) frame = window.requestAnimationFrame(updateActiveSection)
    }

    const resizeObserver = new ResizeObserver(scheduleUpdate)
    resizeObserver.observe(nav)
    for (const section of sections) resizeObserver.observe(section)

    window.addEventListener('scroll', scheduleUpdate, { passive: true })
    window.addEventListener('resize', scheduleUpdate)
    window.addEventListener('hashchange', scheduleUpdate)
    scheduleUpdate()

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('scroll', scheduleUpdate)
      window.removeEventListener('resize', scheduleUpdate)
      window.removeEventListener('hashchange', scheduleUpdate)
      if (frame !== undefined) window.cancelAnimationFrame(frame)
    }
  }, [tabs])

  if (tabs.length === 0) return null

  return (
    <nav ref={navRef} aria-label="Product information" className={styles.sectionNav}>
      <div className={styles.shell}>
        {tabs.map(({ id, label }) => (
          <a
            key={id}
            href={`#${id}`}
            onClick={() => setActiveId(id)}
            aria-current={activeTabId === id ? 'location' : undefined}
          >
            {label}
          </a>
        ))}
      </div>
    </nav>
  )
}
