export interface ToolRelatedGuide {
  href: string
  title: string
  description: string
  eyebrow: string
}

const GUIDE_CATALOG = {
  'construction-safety-footwear-guide': {
    href: '/blog/construction-safety-footwear-guide',
    title: 'Safety Footwear Guide',
    description: 'Use this when tool users need ASTM, EN ISO 20345, toe cap, outsole, and fit context.',
    eyebrow: '2,202 impressions',
  },
  'construction-gloves-selection-guide': {
    href: '/blog/construction-gloves-selection-guide',
    title: 'Construction Gloves Guide',
    description: 'Connect quantity planning to cut, grip, impact, wet work, and replacement decisions.',
    eyebrow: '1,032 impressions',
  },
  'high-visibility-clothing-construction': {
    href: '/blog/high-visibility-clothing-construction',
    title: 'High-Visibility Clothing Guide',
    description: 'Useful for planning hi-vis vests, garments, rainwear, and replacement stock.',
    eyebrow: '983 impressions',
  },
  'construction-respiratory-protection': {
    href: '/blog/construction-respiratory-protection',
    title: 'Respiratory Protection Guide',
    description: 'Tie respirator consumption, filters, dust, fumes, and task exposure back to ordering.',
    eyebrow: '792 impressions',
  },
  'construction-hard-hat-types': {
    href: '/blog/construction-hard-hat-types',
    title: 'Hard Hat Types Guide',
    description: 'Use this for Type I/II, Class G/E/C, helmet accessories, and head protection choices.',
    eyebrow: '717 impressions',
  },
  'construction-eye-face-protection': {
    href: '/blog/construction-eye-face-protection',
    title: 'Eye and Face Protection Guide',
    description: 'Connect eyewear, goggles, face shields, dust, splash, welding, and replacement needs.',
    eyebrow: '555 impressions',
  },
  'construction-hearing-protection': {
    href: '/blog/construction-hearing-protection',
    title: 'Hearing Protection Guide',
    description: 'Use this for earplug, earmuff, NRR/SNR, communication, and replacement planning.',
    eyebrow: '523 impressions',
  },
  'osha-ppe-requirements-construction': {
    href: '/blog/osha-ppe-requirements-construction',
    title: 'OSHA PPE Requirements',
    description: 'Link compliance-focused tool users to construction PPE rules, fit, and documentation.',
    eyebrow: '498 impressions',
  },
  'bulk-construction-ppe-procurement': {
    href: '/blog/bulk-construction-ppe-procurement',
    title: 'Bulk PPE Procurement',
    description: 'Use this when users are turning tool output into RFQs, supplier checks, and repeat orders.',
    eyebrow: '417 impressions',
  },
  'demolition-concrete-cutting-ppe-checklist': {
    href: '/blog/demolition-concrete-cutting-ppe-checklist',
    title: 'Demolition PPE Checklist',
    description: 'Connect calculators and quotes to dust, goggles, respirators, hearing, gloves, and boots.',
    eyebrow: '301 impressions',
  },
  'construction-ppe-checklist': {
    href: '/blog/construction-ppe-checklist',
    title: 'Construction PPE Checklist',
    description: 'A field checklist for turning tool output into daily PPE issue and inspection routines.',
    eyebrow: 'Checklist',
  },
  'construction-safety-helmet-vs-hard-hat': {
    href: '/blog/construction-safety-helmet-vs-hard-hat',
    title: 'Safety Helmet vs Hard Hat',
    description: 'Use this when the buying question is whether to keep hard hats or upgrade to helmet-style protection.',
    eyebrow: 'Helmet upgrade',
  },
  'contractor-ppe-kit-checklist': {
    href: '/blog/contractor-ppe-kit-checklist',
    title: 'Contractor PPE Kit Checklist',
    description: 'Use this when quote and quantity users need role-based kit structure.',
    eyebrow: 'Kit planning',
  },
} satisfies Record<string, ToolRelatedGuide>

function pickGuides(keys: Array<keyof typeof GUIDE_CATALOG>) {
  return keys.map((key) => GUIDE_CATALOG[key])
}

export const TOOLS_HUB_RELATED_GUIDES = pickGuides([
  'construction-safety-footwear-guide',
  'construction-gloves-selection-guide',
  'high-visibility-clothing-construction',
  'construction-respiratory-protection',
  'construction-hard-hat-types',
  'construction-eye-face-protection',
])

export const TOOL_RELATED_GUIDES = {
  'ai-quote': pickGuides([
    'bulk-construction-ppe-procurement',
    'construction-ppe-checklist',
    'contractor-ppe-kit-checklist',
    'osha-ppe-requirements-construction',
  ]),
  'ppe-calculator': pickGuides([
    'bulk-construction-ppe-procurement',
    'contractor-ppe-kit-checklist',
    'construction-gloves-selection-guide',
    'high-visibility-clothing-construction',
    'construction-respiratory-protection',
    'construction-hearing-protection',
    'construction-ppe-checklist',
  ]),
  'size-guide': pickGuides([
    'construction-safety-footwear-guide',
    'bulk-construction-ppe-procurement',
    'construction-ppe-checklist',
    'osha-ppe-requirements-construction',
  ]),
  'compliance-checker': pickGuides([
    'construction-safety-footwear-guide',
    'osha-ppe-requirements-construction',
    'bulk-construction-ppe-procurement',
    'construction-ppe-checklist',
  ]),
  'hard-hat-class-decoder': pickGuides([
    'construction-hard-hat-types',
    'construction-safety-helmet-vs-hard-hat',
    'bulk-construction-ppe-procurement',
    'contractor-ppe-kit-checklist',
  ]),
} satisfies Record<string, ToolRelatedGuide[]>
