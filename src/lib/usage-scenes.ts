export const USAGE_SCENES = [
  'construction',
  'height-work',
  'steel-work',
  'falling-objects',
  'fall-protection',
  'heavy-duty',
  'impact-resistant',
  'slip-resistant',
  'cut-resistant',
  'eye-protection',
  'dusty-work',
  'wet-ground',
] as const

export type UsageScene = (typeof USAGE_SCENES)[number]

const INDUSTRY_TO_USAGE_SCENES: Record<string, UsageScene[]> = {
  CONSTRUCTION: [
    'construction',
    'height-work',
    'steel-work',
    'falling-objects',
    'fall-protection',
    'heavy-duty',
    'impact-resistant',
    'slip-resistant',
  ],
  FACTORY: [
    'heavy-duty',
    'impact-resistant',
    'cut-resistant',
    'eye-protection',
    'steel-work',
  ],
  MINING: [
    'heavy-duty',
    'dusty-work',
    'impact-resistant',
    'slip-resistant',
  ],
  ELECTRICAL: [
    'eye-protection',
    'cut-resistant',
    'impact-resistant',
  ],
  WAREHOUSE: [
    'heavy-duty',
    'slip-resistant',
    'impact-resistant',
  ],
  CHEMICAL: [
    'eye-protection',
    'cut-resistant',
    'impact-resistant',
    'dusty-work',
  ],
  FOOD_PROCESSING: [
    'wet-ground',
    'slip-resistant',
    'cut-resistant',
    'eye-protection',
  ],
  LOGISTICS: [
    'heavy-duty',
    'slip-resistant',
    'impact-resistant',
  ],
}

export const formatUsageSceneLabel = (scene: UsageScene): string =>
  scene
    .split('-')
    .map((segment) => (segment.length ? segment[0].toUpperCase() + segment.slice(1) : segment))
    .join(' ')

export const mapIndustryToUsageScenes = (industry: string): UsageScene[] =>
  INDUSTRY_TO_USAGE_SCENES[industry] ?? []