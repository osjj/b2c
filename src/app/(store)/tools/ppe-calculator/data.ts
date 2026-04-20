// Industry-average monthly PPE consumption per worker (baseline).
// Values are realistic industry benchmarks compiled from OSHA guidance,
// BLS occupational data, and PPE-distributor replenishment data.

export type RoleKey =
  | 'construction'
  | 'manufacturing'
  | 'warehouse'
  | 'chemical'
  | 'welding'
  | 'electrical'
  | 'foodprocessing'
  | 'healthcare'
  | 'general'

export type Shift = 'single' | 'extended' | 'continuous'
export type Exposure = 'low' | 'medium' | 'high'

export interface PpeItem {
  key: string
  name: string
  unit: string
  // Monthly consumption per worker at baseline (single shift, medium exposure).
  rate: number
  // Categories where this item is applicable (empty = all).
  appliesTo?: RoleKey[]
  // Typical unit price in USD (rough industry average) for budget estimation.
  unitPriceUsd: number
  description?: string
}

export const ROLES: {
  key: RoleKey
  label: string
  description: string
  multiplier: number
}[] = [
  {
    key: 'construction',
    label: 'Construction',
    description: 'On-site workers exposed to falling objects, dust, sharp debris.',
    multiplier: 1.1,
  },
  {
    key: 'manufacturing',
    label: 'Manufacturing',
    description: 'Assembly line, machining, fabrication and metalwork.',
    multiplier: 1.0,
  },
  {
    key: 'warehouse',
    label: 'Warehouse & Logistics',
    description: 'Picking, forklift operation, shipping and receiving.',
    multiplier: 0.8,
  },
  {
    key: 'chemical',
    label: 'Chemical & Oil / Gas',
    description: 'Hazardous substance handling, refineries, plants.',
    multiplier: 1.3,
  },
  {
    key: 'welding',
    label: 'Welding & Hot Work',
    description: 'Welders, cutters, grinders exposed to sparks, UV, fumes.',
    multiplier: 1.2,
  },
  {
    key: 'electrical',
    label: 'Electrical Utilities',
    description: 'Linemen, electricians, arc-flash and shock risk.',
    multiplier: 1.0,
  },
  {
    key: 'foodprocessing',
    label: 'Food Processing',
    description: 'Meat, dairy, beverage — hygiene & cut hazards.',
    multiplier: 1.1,
  },
  {
    key: 'healthcare',
    label: 'Healthcare',
    description: 'Hospitals, labs, clinics — biohazard & infection control.',
    multiplier: 1.4,
  },
  {
    key: 'general',
    label: 'General Industrial',
    description: 'Mixed-use facilities, baseline assumptions.',
    multiplier: 1.0,
  },
]

export const SHIFTS: {
  key: Shift
  label: string
  multiplier: number
  description: string
}[] = [
  { key: 'single', label: 'Single shift (8h)', multiplier: 1.0, description: '5 days / week, one 8-hour shift.' },
  {
    key: 'extended',
    label: 'Extended (12h or double)',
    multiplier: 1.5,
    description: '12-hour or overlapping double shifts.',
  },
  {
    key: 'continuous',
    label: 'Continuous (24/7)',
    multiplier: 2.2,
    description: 'Three-shift 24/7 rotation.',
  },
]

export const EXPOSURES: {
  key: Exposure
  label: string
  multiplier: number
  description: string
}[] = [
  { key: 'low', label: 'Low', multiplier: 0.7, description: 'Office-adjacent or controlled environment.' },
  { key: 'medium', label: 'Medium', multiplier: 1.0, description: 'Typical site conditions.' },
  { key: 'high', label: 'High', multiplier: 1.6, description: 'Heavy dust, chemicals or contamination.' },
]

export const PPE_ITEMS: PpeItem[] = [
  {
    key: 'disposable-gloves',
    name: 'Disposable gloves (nitrile / latex)',
    unit: 'pairs',
    rate: 80,
    unitPriceUsd: 0.12,
    description: 'Single-use, changed multiple times per shift for hygiene or chemical contact.',
  },
  {
    key: 'cut-gloves',
    name: 'Cut-resistant gloves (reusable)',
    unit: 'pairs',
    rate: 2.5,
    unitPriceUsd: 8.0,
    description: 'Replaced every ~2 weeks of heavy use; sooner if damaged.',
    appliesTo: ['construction', 'manufacturing', 'warehouse', 'foodprocessing', 'welding', 'general'],
  },
  {
    key: 'welding-gloves',
    name: 'Welding gauntlets',
    unit: 'pairs',
    rate: 1,
    unitPriceUsd: 18.0,
    description: 'Leather gauntlets replaced monthly under heavy welding.',
    appliesTo: ['welding'],
  },
  {
    key: 'safety-glasses',
    name: 'Safety glasses (standard)',
    unit: 'pairs',
    rate: 1.5,
    unitPriceUsd: 6.0,
    description: 'Scratched or damaged glasses are replaced monthly on average.',
  },
  {
    key: 'welding-helmet-lens',
    name: 'Auto-darkening welding lens (replacement)',
    unit: 'pcs',
    rate: 0.25,
    unitPriceUsd: 45.0,
    description: 'Lens replacement every 4 months of continuous welding.',
    appliesTo: ['welding'],
  },
  {
    key: 'hard-hat',
    name: 'Hard hat (helmet)',
    unit: 'pcs',
    rate: 0.04,
    unitPriceUsd: 22.0,
    description: 'Replaced every 2-5 years per ANSI Z89.1 or sooner on impact.',
  },
  {
    key: 'hi-vis',
    name: 'Hi-vis vest / jacket',
    unit: 'pcs',
    rate: 0.12,
    unitPriceUsd: 14.0,
    description: 'Retired when reflective striping degrades — roughly every 8–10 months.',
  },
  {
    key: 'safety-boots',
    name: 'Safety boots (ASTM F2413 / EN ISO 20345)',
    unit: 'pairs',
    rate: 0.18,
    unitPriceUsd: 85.0,
    description: 'Heavy use boots last 5–8 months; track wear and toe-cap damage.',
  },
  {
    key: 'n95',
    name: 'N95 / FFP2 disposable respirators',
    unit: 'pcs',
    rate: 22,
    unitPriceUsd: 1.1,
    description: 'One per shift minimum; replace sooner if breathing resistance increases.',
  },
  {
    key: 'respirator-cartridges',
    name: 'Reusable respirator cartridges',
    unit: 'pairs',
    rate: 3,
    unitPriceUsd: 14.0,
    description: 'Change when saturated or at end of shift in heavy exposure.',
    appliesTo: ['chemical', 'welding', 'construction', 'general'],
  },
  {
    key: 'earplugs',
    name: 'Disposable earplugs',
    unit: 'pairs',
    rate: 22,
    unitPriceUsd: 0.25,
    description: 'One pair per shift.',
  },
  {
    key: 'earmuffs',
    name: 'Earmuffs (reusable)',
    unit: 'pcs',
    rate: 0.06,
    unitPriceUsd: 28.0,
    description: 'Retired when cushions deform — ~15 month lifespan on average.',
  },
  {
    key: 'coveralls',
    name: 'Disposable coveralls (Type 5/6)',
    unit: 'pcs',
    rate: 6,
    unitPriceUsd: 7.5,
    description: 'Full-body single-use for chemical, asbestos or spray work.',
    appliesTo: ['chemical', 'construction', 'healthcare', 'general'],
  },
  {
    key: 'fall-arrest-harness',
    name: 'Full-body fall-arrest harness',
    unit: 'pcs',
    rate: 0.04,
    unitPriceUsd: 120.0,
    description: 'Inspected daily; replaced every 2 years or after arresting a fall.',
    appliesTo: ['construction', 'electrical', 'general'],
  },
  {
    key: 'gas-detection-sensor',
    name: 'Gas detector calibration gas / sensor',
    unit: 'pcs',
    rate: 0.25,
    unitPriceUsd: 65.0,
    description: 'Sensors replaced every 1–3 years; calibration gas consumed monthly.',
    appliesTo: ['chemical', 'electrical', 'welding'],
  },
]
