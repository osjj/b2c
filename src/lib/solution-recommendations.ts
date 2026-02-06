export const RECOMMENDED_PPE_BLOCK_KEY = 'recommended-ppe'

export const RECOMMENDATION_MODES = ['rule', 'manual'] as const

export type RecommendationMode = (typeof RECOMMENDATION_MODES)[number]

export function resolveRecommendationMode(value: unknown): RecommendationMode {
  return value === 'manual' ? 'manual' : 'rule'
}

export function normalizeManualProductIds(value: unknown): string[] {
  if (!Array.isArray(value)) return []

  const normalized: string[] = []
  const seen = new Set<string>()

  for (const item of value) {
    if (typeof item !== 'string') continue
    const id = item.trim()
    if (!id || seen.has(id)) continue
    seen.add(id)
    normalized.push(id)
  }

  return normalized
}

type SectionLike<TData = unknown> = {
  key: string
  data: TData
}

export function withRecommendationModeForSection<T extends SectionLike<Record<string, unknown>>>(
  sections: T[],
  mode: RecommendationMode
): T[] {
  return sections.map((section) => {
    if (section.key !== RECOMMENDED_PPE_BLOCK_KEY) {
      return section
    }

    return {
      ...section,
      data: {
        ...section.data,
        mode,
      },
    }
  })
}
