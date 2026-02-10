import type { BodyAnchorPoint, SectionListItem } from '@/types/solution'
import { clampBodyAnchor, isValidBodyAnchor } from './body-link-map'

export const BODY_ANCHOR_POINTS = [
  { key: 'head', label: 'Head', point: { x: 50, y: 9 } },
  { key: 'eyes', label: 'Eyes', point: { x: 55, y: 14 } },
  { key: 'ears', label: 'Ears', point: { x: 54, y: 22 } },
  { key: 'mouth', label: 'Mouth', point: { x: 53, y: 18 } },
  { key: 'chest', label: 'Chest', point: { x: 30, y: 52 } },
  { key: 'left-hand', label: 'Left Hand', point: { x: 50, y: 42 } },
  { key: 'waist', label: 'Waist', point: { x: 60, y: 48 } },
  { key: 'feet', label: 'Feet', point: { x: 40, y: 93 } },
] as const

export type BodyAnchorKey = (typeof BODY_ANCHOR_POINTS)[number]['key']

const BODY_ANCHOR_MAP = new Map(
  BODY_ANCHOR_POINTS.map((item) => [item.key, item.point] as const)
)

const LEGACY_PRESET_COORDINATES: Array<{ key: BodyAnchorKey; point: BodyAnchorPoint }> = [
  { key: 'head', point: { x: 50, y: 9 } },
  { key: 'eyes', point: { x: 50, y: 18 } },
  { key: 'chest', point: { x: 50, y: 35 } },
  { key: 'left-hand', point: { x: 39, y: 47 } },
  { key: 'waist', point: { x: 50, y: 53 } },
  { key: 'feet', point: { x: 50, y: 90 } },
]

const isSamePoint = (a: BodyAnchorPoint, b: BodyAnchorPoint) =>
  Math.abs(a.x - b.x) <= 0.5 && Math.abs(a.y - b.y) <= 0.5

function inferLegacyAnchorKey(anchor: BodyAnchorPoint): BodyAnchorKey | undefined {
  const matched = LEGACY_PRESET_COORDINATES.find((item) => isSamePoint(item.point, anchor))
  return matched?.key
}

export function getBodyAnchorPointByKey(key: string | undefined): BodyAnchorPoint | undefined {
  if (!isValidBodyAnchorKey(key)) return undefined
  const point = BODY_ANCHOR_MAP.get(key)
  if (!point) return undefined
  return clampBodyAnchor(point)
}

export function isValidBodyAnchorKey(key: string | undefined): key is BodyAnchorKey {
  return !!key && BODY_ANCHOR_POINTS.some((item) => item.key === key)
}

export function resolveListItemBodyAnchor(item: SectionListItem): BodyAnchorPoint | undefined {
  const presetPoint = getBodyAnchorPointByKey(item.bodyAnchorKey)
  if (presetPoint) return presetPoint
  if (!isValidBodyAnchor(item.bodyAnchor)) return undefined
  const normalized = clampBodyAnchor(item.bodyAnchor)
  const legacyKey = inferLegacyAnchorKey(normalized)
  if (legacyKey) {
    return getBodyAnchorPointByKey(legacyKey)
  }
  return normalized
}

export function getDefaultBodyAnchorKey(): BodyAnchorKey {
  return 'chest'
}
