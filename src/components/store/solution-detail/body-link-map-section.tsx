'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import type { BodyAnchorPoint, SectionListData } from '@/types/solution'
import {
  createConnectorPath,
} from '@/lib/body-link-map'
import { resolveListItemBodyAnchor } from '@/lib/body-anchor-points'

type BodyLinkMapSectionProps = {
  imageSrc?: string
  imageAlt?: string
  items: SectionListData['items']
}

type Connector = {
  itemKey: string
  path: string
  start: BodyAnchorPoint
  end: BodyAnchorPoint
}

const DEFAULT_IMAGE_SRC = '/body.png'
const DEFAULT_IMAGE_ALT = 'PPE body protection map'

export function BodyLinkMapSection({
  imageSrc = DEFAULT_IMAGE_SRC,
  imageAlt = DEFAULT_IMAGE_ALT,
  items,
}: BodyLinkMapSectionProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLDivElement>(null)
  const cardRefs = useRef<Array<HTMLButtonElement | null>>([])
  const [connectors, setConnectors] = useState<Connector[]>([])
  const [activeItemKey, setActiveItemKey] = useState<string | null>(null)

  const linkedItems = useMemo(
    () =>
      items
        .map((item, index) => {
          const resolvedAnchor = resolveListItemBodyAnchor(item)
          if (!resolvedAnchor) return null
          return {
            ...item,
            itemKey: `${item.title || 'item'}-${index}`,
            bodyAnchor: resolvedAnchor,
          }
        })
        .filter((item): item is NonNullable<typeof item> => item !== null),
    [items]
  )

  const recalculateConnectors = useCallback(() => {
    const container = containerRef.current
    const imageArea = imageRef.current
    if (!container || !imageArea) return

    const containerRect = container.getBoundingClientRect()
    const imageRect = imageArea.getBoundingClientRect()

    const next = linkedItems
      .map((item, index) => {
        const cardElement = cardRefs.current[index]
        if (!cardElement) return null

        const cardRect = cardElement.getBoundingClientRect()
        const start = {
          x: imageRect.left - containerRect.left + (item.bodyAnchor.x / 100) * imageRect.width,
          y: imageRect.top - containerRect.top + (item.bodyAnchor.y / 100) * imageRect.height,
        }
        const end = {
          x: cardRect.left - containerRect.left + 10,
          y: cardRect.top - containerRect.top + cardRect.height / 2,
        }

        return {
          itemKey: item.itemKey,
          path: createConnectorPath(start, end),
          start,
          end,
        } satisfies Connector
      })
      .filter((line): line is Connector => line !== null)

    setConnectors(next)
  }, [linkedItems])

  useLayoutEffect(() => {
    recalculateConnectors()
    const rafId = window.requestAnimationFrame(recalculateConnectors)

    const resizeObserver = new ResizeObserver(() => {
      recalculateConnectors()
    })

    if (containerRef.current) resizeObserver.observe(containerRef.current)
    if (imageRef.current) resizeObserver.observe(imageRef.current)
    cardRefs.current.forEach((card) => {
      if (card) resizeObserver.observe(card)
    })

    window.addEventListener('resize', recalculateConnectors)

    return () => {
      window.cancelAnimationFrame(rafId)
      resizeObserver.disconnect()
      window.removeEventListener('resize', recalculateConnectors)
    }
  }, [recalculateConnectors])

  useEffect(() => {
    cardRefs.current = cardRefs.current.slice(0, linkedItems.length)
  }, [linkedItems.length])

  if (linkedItems.length === 0) return null

  return (
    <div className="rounded-2xl border bg-card/70 p-4 md:p-6">
      <div ref={containerRef} className="relative">
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-20 h-full w-full"
        >
          {connectors.map((line) => {
            const isActive = activeItemKey === line.itemKey
            return (
              <g key={line.itemKey}>
                <path
                  d={line.path}
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeWidth={isActive ? 3 : 2}
                  strokeOpacity={isActive ? 1 : 0.5}
                  className="text-primary transition-all duration-200"
                />
                <circle
                  cx={line.start.x}
                  cy={line.start.y}
                  r={isActive ? 4 : 3}
                  fill="currentColor"
                  fillOpacity={isActive ? 1 : 0.75}
                  className="text-primary transition-all duration-200"
                />
                <circle
                  cx={line.end.x}
                  cy={line.end.y}
                  r={isActive ? 4 : 3}
                  fill="currentColor"
                  fillOpacity={isActive ? 1 : 0.75}
                  className="text-primary transition-all duration-200"
                />
              </g>
            )
          })}
        </svg>

        <div className="relative z-10 grid gap-6 md:grid-cols-[minmax(300px,420px)_minmax(0,1fr)]">
          <div ref={imageRef} className="relative mx-auto w-full max-w-[420px] overflow-hidden rounded-xl border bg-muted/20">
            <div className="relative aspect-[2/3] w-full">
              <Image
                src={imageSrc}
                alt={imageAlt}
                fill
                sizes="(max-width: 768px) min(90vw, 360px), 420px"
                className="object-contain"
                onLoad={recalculateConnectors}
              />
            </div>
            {linkedItems.map((item) => {
              const isActive = activeItemKey === item.itemKey
              return (
                <button
                  key={`anchor-${item.itemKey}`}
                  type="button"
                  aria-label={item.title || 'PPE anchor'}
                  onMouseEnter={() => setActiveItemKey(item.itemKey)}
                  onMouseLeave={() => setActiveItemKey(null)}
                  onFocus={() => setActiveItemKey(item.itemKey)}
                  onBlur={() => setActiveItemKey(null)}
                  className="absolute z-30 h-4 w-4 -translate-x-1/2 -translate-y-1/2 transition-transform focus-visible:outline-none"
                  style={{ left: `${item.bodyAnchor.x}%`, top: `${item.bodyAnchor.y}%` }}
                >
                  <span
                    aria-hidden="true"
                    className={`absolute inset-0 rounded-full transition-all ${
                      isActive ? 'scale-110 bg-slate-500/60' : 'bg-slate-400/45'
                    }`}
                  />
                </button>
              )
            })}
          </div>

          <div className="space-y-3">
            {linkedItems.map((item, index) => {
              const isActive = activeItemKey === item.itemKey
              return (
                <button
                  key={item.itemKey}
                  ref={(element) => {
                    cardRefs.current[index] = element
                  }}
                  type="button"
                  onMouseEnter={() => setActiveItemKey(item.itemKey)}
                  onMouseLeave={() => setActiveItemKey(null)}
                  onFocus={() => setActiveItemKey(item.itemKey)}
                  onBlur={() => setActiveItemKey(null)}
                  className={`w-full cursor-pointer rounded-xl border p-4 text-left transition-all ${
                    isActive
                      ? 'border-primary/60 bg-primary/5 shadow-sm'
                      : 'border-border/80 bg-background/70 hover:border-primary/30'
                  }`}
                >
                  {item.title && (
                    <p className="text-sm font-semibold text-foreground">{item.title}</p>
                  )}
                  {item.text && (
                    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                      {item.text}
                    </p>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
