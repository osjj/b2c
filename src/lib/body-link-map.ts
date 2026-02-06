import type { BodyAnchorPoint } from '@/types/solution'

const MIN_ANCHOR = 0
const MAX_ANCHOR = 100

const clamp = (value: number) => Math.max(MIN_ANCHOR, Math.min(MAX_ANCHOR, value))

export function isValidBodyAnchor(anchor: unknown): anchor is BodyAnchorPoint {
  if (!anchor || typeof anchor !== 'object') return false
  const value = anchor as Record<string, unknown>
  return (
    typeof value.x === 'number' &&
    Number.isFinite(value.x) &&
    typeof value.y === 'number' &&
    Number.isFinite(value.y)
  )
}

export function clampBodyAnchor(anchor: BodyAnchorPoint): BodyAnchorPoint {
  return {
    x: clamp(anchor.x),
    y: clamp(anchor.y),
  }
}

export function isBodyLinkedList(
  sectionKey: string,
  items: Array<{ bodyAnchor?: unknown }>
): boolean {
  if (sectionKey !== 'essential-categories') return false
  return items.some((item) => isValidBodyAnchor(item.bodyAnchor))
}

export function createConnectorPath(start: BodyAnchorPoint, end: BodyAnchorPoint): string {
  return `M ${start.x} ${start.y} L ${end.x} ${end.y}`
}
