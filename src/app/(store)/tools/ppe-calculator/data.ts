// Illustrative planning defaults, reviewed 2026-10-03. No measured industry benchmark
// or OSHA/BLS consumption dataset supports these values. Users should replace them
// with their own usage records, manufacturer instructions and supplier prices.

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
  // Illustrative unit price in USD (not a supplier quotation) for budget estimation.
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
    description: "Illustrative single-use rate. Select the correct glove for the task and follow product-specific change instructions.",
  },
  {
    key: 'cut-gloves',
    name: 'Cut-resistant gloves (reusable)',
    unit: 'pairs',
    rate: 2.5,
    unitPriceUsd: 8.0,
    description: "Illustrative reusable-glove cycle. Replace worn or damaged protection according to manufacturer instructions.",
    appliesTo: ['construction', 'manufacturing', 'warehouse', 'foodprocessing', 'welding', 'general'],
  },
  {
    key: 'welding-gloves',
    name: 'Welding gauntlets',
    unit: 'pairs',
    rate: 1,
    unitPriceUsd: 18.0,
    description: "Illustrative replacement cycle, not a safe-use service life.",
    appliesTo: ['welding'],
  },
  {
    key: 'safety-glasses',
    name: 'Safety glasses (standard)',
    unit: 'pairs',
    rate: 1.5,
    unitPriceUsd: 6.0,
    description: "Illustrative cycle. Inspect clarity, fit and damage; follow manufacturer retirement instructions.",
  },
  {
    key: 'welding-helmet-lens',
    name: 'Auto-darkening welding lens (replacement)',
    unit: 'pcs',
    rate: 0.25,
    unitPriceUsd: 45.0,
    description: "Illustrative lens replacement cycle. Confirm compatibility and inspect before use.",
    appliesTo: ['welding'],
  },
  {
    key: 'hard-hat',
    name: 'Hard hat (helmet)',
    unit: 'pcs',
    rate: 0.04,
    unitPriceUsd: 22.0,
    description: "Illustrative shell replacement cycle, not an ANSI-mandated service life. Inspect and follow the manufacturer, including replacement after impact.",
  },
  {
    key: 'hi-vis',
    name: 'Hi-vis vest / jacket',
    unit: 'pcs',
    rate: 0.12,
    unitPriceUsd: 14.0,
    description: "Illustrative cycle. Replace when visibility performance or condition no longer meets site requirements.",
  },
  {
    key: 'safety-boots',
    name: 'Safety boots (ASTM F2413 / EN ISO 20345)',
    unit: 'pairs',
    rate: 0.18,
    unitPriceUsd: 85.0,
    description: "Illustrative footwear cycle. Inspect tread, soles, uppers and protective features; replace damaged footwear.",
  },
  {
    key: 'n95',
    name: 'N95 / FFP2 disposable respirators',
    unit: 'pcs',
    rate: 22,
    unitPriceUsd: 1.1,
    description: "Illustrative rate. N95 and FFP2 are separate standards; choose suitable protection and follow fit, use and change instructions.",
  },
  {
    key: 'respirator-cartridges',
    name: 'Reusable respirator cartridges',
    unit: 'pairs',
    rate: 3,
    unitPriceUsd: 14.0,
    description: "Illustrative inventory rate, not a cartridge change schedule. Use the manufacturer and site respiratory-protection program; do not rely on odour or saturation.",
    appliesTo: ['chemical', 'welding', 'construction', 'general'],
  },
  {
    key: 'earplugs',
    name: 'Disposable earplugs',
    unit: 'pairs',
    rate: 22,
    unitPriceUsd: 0.25,
    description: "Illustrative disposable-earplug rate. Follow manufacturer hygiene and reuse instructions.",
  },
  {
    key: 'earmuffs',
    name: 'Earmuffs (reusable)',
    unit: 'pcs',
    rate: 0.06,
    unitPriceUsd: 28.0,
    description: "Illustrative cycle. Inspect cushions, seals and headband; replace components as instructed.",
  },
  {
    key: 'coveralls',
    name: 'Disposable coveralls (Type 5/6)',
    unit: 'pcs',
    rate: 6,
    unitPriceUsd: 7.5,
    description: "Illustrative single-use rate. Confirm the exact chemical and task protection; Type 5/6 does not cover every hazard.",
    appliesTo: ['chemical', 'construction', 'healthcare', 'general'],
  },
  {
    key: 'fall-arrest-harness',
    name: 'Full-body fall-arrest harness',
    unit: 'pcs',
    rate: 0.04,
    unitPriceUsd: 120.0,
    description: "Illustrative cycle, not a mandatory two-year life. Inspect and follow manufacturer retirement and post-fall instructions.",
    appliesTo: ['construction', 'electrical', 'general'],
  },
  {
    key: 'gas-detection-sensor',
    name: 'Gas detector calibration gas / sensor',
    unit: 'pcs',
    rate: 0.25,
    unitPriceUsd: 65.0,
    description: "Illustrative combined budget allowance. Sensor replacement and calibration-gas use are different; replace this rate and price with your equipment-specific budget.",
    appliesTo: ['chemical', 'electrical', 'welding'],
  },
]
