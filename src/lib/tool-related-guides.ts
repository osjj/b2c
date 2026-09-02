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
  'mining-quarry-safety-boots-guide': {
    href: '/blog/mining-quarry-safety-boots-guide',
    title: 'Mining & Quarry Safety Boots Guide',
    description:
      'Turn mine hazards, standards evidence, fit trials, size curves, and replacement stock into a footwear RFQ.',
    eyebrow: 'Mining footwear',
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
    description: 'Use this for construction hard hat classes, shell styles, accessories, fit, and replacement planning.',
    eyebrow: '717 impressions',
  },
  'fiberglass-vs-abs-vs-hdpe-safety-helmets': {
    href: '/blog/fiberglass-vs-abs-vs-hdpe-safety-helmets',
    title: 'Safety Helmet Material Guide',
    description:
      'Compare fiberglass or FRP, ABS, and HDPE shells without treating material names as impact, electrical, or heat approvals.',
    eyebrow: 'Shell materials',
  },
  'type-1-vs-type-2-hard-hats': {
    href: '/blog/type-1-vs-type-2-hard-hats',
    title: 'Type 1 vs Type 2 Hard Hats',
    description: 'Use this when buyers need a focused explanation of Type I/II and Class G/E/C before an RFQ.',
    eyebrow: 'Hard hat query',
  },
  'class-e-vs-class-g-vs-class-c-hard-hats': {
    href: '/blog/class-e-vs-class-g-vs-class-c-hard-hats',
    title: 'Class E vs G vs C Hard Hats',
    description: 'Use this when buyers need a focused electrical class explanation before choosing vented or non-vented head protection.',
    eyebrow: 'Electrical class',
  },
  'vented-vs-non-vented-hard-hats-construction': {
    href: '/blog/vented-vs-non-vented-hard-hats-construction',
    title: 'Vented vs Non-Vented Hard Hats',
    description: 'Use this when buyers need shell ventilation, Class C limits, heat comfort, and inventory control context.',
    eyebrow: 'Shell ventilation',
  },
  'full-brim-vs-cap-style-hard-hats-construction': {
    href: '/blog/full-brim-vs-cap-style-hard-hats-construction',
    title: 'Full Brim vs Cap Style Hard Hats',
    description: 'Use this when buyers need brim-shape, weather coverage, and accessory compatibility context.',
    eyebrow: 'Brim style',
  },
  'hard-hat-color-codes-construction-sites': {
    href: '/blog/hard-hat-color-codes-construction-sites',
    title: 'Hard Hat Color Codes',
    description: 'Use this when buyers need role colors, visitor control, inventory separation, and RFQ color wording.',
    eyebrow: 'Color coding',
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
  'mining-hearing-protection-guide': {
    href: '/blog/mining-hearing-protection-guide',
    title: 'Mining Hearing Protection Guide',
    description: 'Connect MSHA Part 62 exposure groups to controls, earplug, earmuff, dual-protection, and RFQ decisions.',
    eyebrow: 'Mining noise',
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
  'contractor-ppe-supplier-bulk-checklist': {
    href: '/blog/contractor-ppe-supplier-bulk-checklist',
    title: 'Contractor PPE Supplier Checklist',
    description: 'Use this when buyers need supplier scorecards, documents, kit packing, substitutions, and replenishment checks.',
    eyebrow: 'Supplier check',
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
  'type-1-vs-type-2-hard-hats',
  'construction-eye-face-protection',
])

export const TOOL_RELATED_GUIDES = {
  'ai-quote': pickGuides([
    'bulk-construction-ppe-procurement',
    'contractor-ppe-supplier-bulk-checklist',
    'construction-ppe-checklist',
    'contractor-ppe-kit-checklist',
    'osha-ppe-requirements-construction',
    'mining-hearing-protection-guide',
    'mining-quarry-safety-boots-guide',
  ]),
  'ppe-calculator': pickGuides([
    'bulk-construction-ppe-procurement',
    'contractor-ppe-kit-checklist',
    'contractor-ppe-supplier-bulk-checklist',
    'construction-gloves-selection-guide',
    'high-visibility-clothing-construction',
    'construction-respiratory-protection',
    'construction-hearing-protection',
    'mining-hearing-protection-guide',
    'mining-quarry-safety-boots-guide',
    'construction-ppe-checklist',
  ]),
  'size-guide': pickGuides([
    'construction-safety-footwear-guide',
    'mining-quarry-safety-boots-guide',
    'bulk-construction-ppe-procurement',
    'construction-ppe-checklist',
    'osha-ppe-requirements-construction',
  ]),
  'compliance-checker': pickGuides([
    'construction-safety-footwear-guide',
    'mining-quarry-safety-boots-guide',
    'osha-ppe-requirements-construction',
    'bulk-construction-ppe-procurement',
    'construction-ppe-checklist',
  ]),
  'hard-hat-class-decoder': pickGuides([
    'class-e-vs-class-g-vs-class-c-hard-hats',
    'fiberglass-vs-abs-vs-hdpe-safety-helmets',
    'vented-vs-non-vented-hard-hats-construction',
    'full-brim-vs-cap-style-hard-hats-construction',
    'hard-hat-color-codes-construction-sites',
    'type-1-vs-type-2-hard-hats',
    'construction-hard-hat-types',
    'construction-safety-helmet-vs-hard-hat',
    'bulk-construction-ppe-procurement',
  ]),
} satisfies Record<string, ToolRelatedGuide[]>
