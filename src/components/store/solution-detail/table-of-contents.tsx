'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface TocItem {
  id: string
  title: string
}

interface TableOfContentsProps {
  items: TocItem[]
}

export function TableOfContents({ items }: TableOfContentsProps) {
  const [activeId, setActiveId] = useState<string>('')

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id)
          }
        })
      },
      {
        rootMargin: '-100px 0px -80% 0px',
        threshold: 0,
      }
    )

    items.forEach((item) => {
      const element = document.getElementById(item.id)
      if (element) {
        observer.observe(element)
      }
    })

    return () => observer.disconnect()
  }, [items])

  const handleClick = (id: string) => {
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  if (items.length === 0) return null

  return (
    <nav className="sticky top-24 rounded-2xl border bg-background/90 p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.3em]">
          On This Page
        </h3>
        <span className="text-xs text-muted-foreground">{items.length} sections</span>
      </div>
      <ul className="mt-4 space-y-2">
        {items.map((item) => (
          <li key={item.id}>
            <button
              onClick={() => handleClick(item.id)}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-sm transition-colors cursor-pointer',
                activeId === item.id
                  ? 'border-primary/40 bg-primary/5 text-primary'
                  : 'border-transparent text-muted-foreground hover:border-muted-foreground/30 hover:text-foreground'
              )}
            >
              <span
                className={cn(
                  'h-2 w-2 rounded-full',
                  activeId === item.id ? 'bg-primary' : 'bg-muted-foreground/30'
                )}
              />
              <span className="flex-1 text-left">{item.title}</span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}
