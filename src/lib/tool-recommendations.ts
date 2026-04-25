export type ToolRecommendationId =
  | 'ai-quote'
  | 'ppe-calculator'
  | 'size-guide'
  | 'compliance-checker'

export interface ToolRecommendation {
  id: ToolRecommendationId
  href: string
  title: string
  description: string
  cta: string
  eyebrow: string
}

const TOOL_CATALOG: Record<ToolRecommendationId, ToolRecommendation> = {
  'ai-quote': {
    id: 'ai-quote',
    href: '/tools/ai-quote',
    title: 'AI Quote Generator',
    description:
      'Turn site conditions, hazards, and worker roles into a shortlist of PPE SKUs and a fast quote request.',
    cta: 'Build a quote',
    eyebrow: 'Procurement',
  },
  'ppe-calculator': {
    id: 'ppe-calculator',
    href: '/tools/ppe-calculator',
    title: 'PPE Quantity Calculator',
    description:
      'Estimate monthly usage, replacement cycles, and budget needs before you place a bulk PPE order.',
    cta: 'Plan quantities',
    eyebrow: 'Planning',
  },
  'size-guide': {
    id: 'size-guide',
    href: '/tools/size-guide',
    title: 'Safety Boot Size Guide',
    description:
      'Convert US, EU, UK, CN, and JP sizing and check width fittings before you lock in footwear specs.',
    cta: 'Check sizing',
    eyebrow: 'Reference',
  },
  'compliance-checker': {
    id: 'compliance-checker',
    href: '/tools/compliance-checker',
    title: 'Safety Footwear Label Decoder',
    description:
      'Decode ASTM F2413 and EN ISO 20345 markings such as S3, SRC, HRO, EH, and PR in seconds.',
    cta: 'Decode labels',
    eyebrow: 'Compliance',
  },
}

const FALLBACK_ORDER: ToolRecommendationId[] = [
  'ai-quote',
  'ppe-calculator',
  'size-guide',
  'compliance-checker',
]

function normalizeText(value: string) {
  return value.toLowerCase()
}

function includesAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term))
}

function addScore(
  scores: Map<ToolRecommendationId, number>,
  id: ToolRecommendationId,
  points: number,
) {
  scores.set(id, (scores.get(id) ?? 0) + points)
}

function pickRecommendations(
  scores: Map<ToolRecommendationId, number>,
  fallback: ToolRecommendationId[],
) {
  const ranked = [...scores.entries()]
    .sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1]
      return FALLBACK_ORDER.indexOf(a[0]) - FALLBACK_ORDER.indexOf(b[0])
    })
    .map(([id]) => id)

  const merged = [...ranked, ...fallback]
  const uniqueIds = merged.filter((id, index) => merged.indexOf(id) === index).slice(0, 3)

  return uniqueIds.map((id) => TOOL_CATALOG[id])
}

export function getToolRecommendationsForBlog(input: {
  slug: string
  title: string
  excerpt?: string | null
}) {
  const haystack = normalizeText([input.slug, input.title, input.excerpt ?? ''].join(' '))
  const scores = new Map<ToolRecommendationId, number>()

  const footwearTerms = [
    'boot',
    'boots',
    'footwear',
    'shoe',
    'shoes',
    'toe cap',
    'steel toe',
    'composite toe',
    'size',
    'sizing',
    'fit',
  ]
  const complianceTerms = [
    'astm',
    'f2413',
    'en iso',
    '20345',
    's1',
    's2',
    's3',
    'src',
    'hro',
    'eh',
    'pr',
    'label',
    'certification',
    'compliance',
  ]
  const planningTerms = [
    'ppe',
    'checklist',
    'budget',
    'quantity',
    'consumption',
    'replenishment',
    'headcount',
    'worker',
    'procurement',
    'order',
  ]

  if (includesAny(haystack, footwearTerms)) {
    addScore(scores, 'size-guide', 8)
    addScore(scores, 'compliance-checker', 5)
  }

  if (includesAny(haystack, complianceTerms)) {
    addScore(scores, 'compliance-checker', 8)
    addScore(scores, 'size-guide', 2)
  }

  if (includesAny(haystack, planningTerms)) {
    addScore(scores, 'ppe-calculator', 7)
    addScore(scores, 'ai-quote', 4)
  }

  if (haystack.includes('construction')) {
    addScore(scores, 'ppe-calculator', 3)
    addScore(scores, 'ai-quote', 2)
  }

  return pickRecommendations(scores, [
    'ppe-calculator',
    'ai-quote',
    'compliance-checker',
  ])
}

export function getToolRecommendationsForSolution(input: {
  slug: string
  title: string
  excerpt?: string | null
  usageScenes: string[]
}) {
  const haystack = normalizeText(
    [input.slug, input.title, input.excerpt ?? '', input.usageScenes.join(' ')].join(' '),
  )
  const scores = new Map<ToolRecommendationId, number>()

  addScore(scores, 'ai-quote', 6)
  addScore(scores, 'ppe-calculator', 5)

  if (
    includesAny(haystack, [
      'boot',
      'boots',
      'footwear',
      'shoe',
      'shoes',
      'electrician',
      'electrical',
    ])
  ) {
    addScore(scores, 'size-guide', 6)
    addScore(scores, 'compliance-checker', 6)
  }

  if (
    includesAny(haystack, [
      'astm',
      'f2413',
      'en iso',
      '20345',
      'certification',
      'compliance',
      'label',
    ])
  ) {
    addScore(scores, 'compliance-checker', 6)
  }

  return pickRecommendations(scores, [
    'ai-quote',
    'ppe-calculator',
    'compliance-checker',
  ])
}
