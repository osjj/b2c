import { clampBodyAnchor, isValidBodyAnchor } from './body-link-map'
import type { BodyAnchorPoint, SectionListItem } from '@/types/solution'

const DEFAULT_BODY_ANCHOR: BodyAnchorPoint = { x: 50, y: 50 }

const parseAxisValue = (value: string): number | null => {
  const trimmed = value.trim()
  if (!trimmed) return null
  const parsed = Number(trimmed)
  if (!Number.isFinite(parsed)) return null
  return parsed
}

const getExistingAnchor = (item: SectionListItem): BodyAnchorPoint =>
  isValidBodyAnchor(item.bodyAnchor)
    ? clampBodyAnchor(item.bodyAnchor)
    : DEFAULT_BODY_ANCHOR

export function shouldShowBodyAnchorEditor(sectionKey: string): boolean {
  return sectionKey === 'essential-categories'
}

export function toggleListItemBodyAnchor(item: SectionListItem, enabled: boolean): SectionListItem {
  if (!enabled) {
    const next = { ...item }
    delete next.bodyAnchor
    return next
  }

  return {
    ...item,
    bodyAnchor: getExistingAnchor(item),
  }
}

export function updateListItemBodyAnchorValue(
  item: SectionListItem,
  axis: keyof BodyAnchorPoint,
  rawValue: string
): SectionListItem {
  const value = parseAxisValue(rawValue)
  if (value === null) return item

  const current = getExistingAnchor(item)
  const nextAnchor = clampBodyAnchor({
    ...current,
    [axis]: value,
  })

  return {
    ...item,
    bodyAnchor: nextAnchor,
  }
}
