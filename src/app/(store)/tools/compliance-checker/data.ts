// Safety-footwear compliance code dictionaries.
// Sources: EN ISO 20345:2022, ASTM F2413-18, OSHA 29 CFR 1910.136.

export interface ComplianceCode {
  code: string
  name: string
  description: string
  /** Which standard this code belongs to. */
  standard: 'EN-CLASS' | 'EN-ADDON' | 'ASTM' | 'SLIP'
}

// EN ISO 20345 protection classes — the backbone of European safety footwear.
export const EN_CLASSES: ComplianceCode[] = [
  {
    code: 'SB',
    name: 'Safety Basic',
    description:
      '200 J toe impact + 15 kN compression. Minimum safety footwear under EN ISO 20345 — no other properties required.',
    standard: 'EN-CLASS',
  },
  {
    code: 'S1',
    name: 'Safety Class 1',
    description:
      'SB plus: closed seat region, antistatic (A), energy absorption in heel (E), fuel oil resistance (FO). For dry indoor work.',
    standard: 'EN-CLASS',
  },
  {
    code: 'S1P',
    name: 'Safety Class 1 with Penetration resistance',
    description:
      'All S1 features plus midsole penetration resistance (P). Common in light construction and maintenance.',
    standard: 'EN-CLASS',
  },
  {
    code: 'S1PS',
    name: 'S1P with textile penetration (2022)',
    description:
      'EN ISO 20345:2022 revision — S1P with PS textile anti-penetration midsole (lighter, more flexible than steel).',
    standard: 'EN-CLASS',
  },
  {
    code: 'S2',
    name: 'Safety Class 2',
    description:
      'All S1 properties plus water penetration and absorption resistance of the upper (WRU). For wet indoor/outdoor environments.',
    standard: 'EN-CLASS',
  },
  {
    code: 'S3',
    name: 'Safety Class 3',
    description:
      'All S2 properties plus penetration resistance (P) and cleated outsole. The most common spec for general construction.',
    standard: 'EN-CLASS',
  },
  {
    code: 'S3S',
    name: 'S3 with textile penetration (2022)',
    description:
      'EN ISO 20345:2022 — S3 with PS textile anti-penetration midsole. Lighter alternative to steel midsole.',
    standard: 'EN-CLASS',
  },
  {
    code: 'S4',
    name: 'Safety Class 4 (all-rubber/polymeric)',
    description:
      'Fully moulded boots (rubber/PVC). Antistatic, energy absorption, fuel oil resistance. Typical for agriculture, food, fishing.',
    standard: 'EN-CLASS',
  },
  {
    code: 'S5',
    name: 'Safety Class 5',
    description:
      'All S4 properties plus penetration resistance (P) and cleated outsole. Wet, muddy, sharp-debris environments.',
    standard: 'EN-CLASS',
  },
  {
    code: 'S6',
    name: 'Safety Class 6 (2022)',
    description:
      'New in EN ISO 20345:2022 — S2 specification with fully waterproof boot (WR). Rubber-like protection in a leather upper.',
    standard: 'EN-CLASS',
  },
  {
    code: 'S7',
    name: 'Safety Class 7 (2022)',
    description:
      'New in EN ISO 20345:2022 — S3 specification with fully waterproof boot (WR). Highest leather-boot spec.',
    standard: 'EN-CLASS',
  },
]

// EN ISO 20345 additional requirement codes.
export const EN_ADDONS: ComplianceCode[] = [
  { code: 'P', name: 'Penetration resistance (steel)', description: 'Steel midsole resists 1,100 N nail penetration.', standard: 'EN-ADDON' },
  { code: 'PS', name: 'Penetration resistance (textile)', description: 'Textile/composite midsole resists 1,100 N (new 2022 test).', standard: 'EN-ADDON' },
  { code: 'PL', name: 'Penetration resistance with large test nail', description: '1,100 N with 4.5 mm nail — 2022 replacement for metallic midsole.', standard: 'EN-ADDON' },
  { code: 'A', name: 'Antistatic', description: 'Electrical resistance between 100 kΩ and 1 GΩ — dissipates static without full insulation.', standard: 'EN-ADDON' },
  { code: 'E', name: 'Energy absorption (heel)', description: 'Heel absorbs ≥ 20 J of impact. Reduces fatigue on hard floors.', standard: 'EN-ADDON' },
  { code: 'FO', name: 'Fuel oil resistance', description: 'Outsole resists degradation from fuel oils and hydrocarbons.', standard: 'EN-ADDON' },
  { code: 'WR', name: 'Whole boot water resistance', description: 'Entire boot waterproof — tested by walking through a water trough.', standard: 'EN-ADDON' },
  { code: 'WRU', name: 'Water resistant upper', description: 'Upper resists water penetration/absorption for ≥ 60 min (not fully waterproof).', standard: 'EN-ADDON' },
  { code: 'HI', name: 'Heat insulation of sole', description: 'Sole insulates against contact heat up to 150 °C for 30 min.', standard: 'EN-ADDON' },
  { code: 'CI', name: 'Cold insulation of sole', description: 'Sole insulates against contact cold down to −17 °C for 30 min.', standard: 'EN-ADDON' },
  { code: 'HRO', name: 'Heat resistant outsole', description: 'Outsole resists contact heat of 300 °C for 60 s without melting.', standard: 'EN-ADDON' },
  { code: 'M', name: 'Metatarsal protection', description: 'Additional top-of-foot impact guard (≥ 100 J).', standard: 'EN-ADDON' },
  { code: 'AN', name: 'Ankle protection', description: 'Lateral ankle impact resistance.', standard: 'EN-ADDON' },
  { code: 'CR', name: 'Cut resistance (upper)', description: 'Upper resists cut-through — protects against glass, metal shards.', standard: 'EN-ADDON' },
  { code: 'ESD', name: 'Electrostatic discharge', description: 'Resistance 100 kΩ–100 MΩ — tighter range than A, for electronics assembly.', standard: 'EN-ADDON' },
  { code: 'SC', name: 'Scuff cap abrasion', description: '2022 test — toe cap abrasion resistance (replaces unofficial "SRC+" marking).', standard: 'EN-ADDON' },
  { code: 'LG', name: 'Ladder grip', description: 'New 2022 — outsole tread optimised for ladder rungs.', standard: 'EN-ADDON' },
  { code: 'FP', name: 'Metatarsal flexibility (internal)', description: 'Internal flexible metatarsal guard.', standard: 'EN-ADDON' },
]

// Slip resistance — codes SRA/SRB/SRC were replaced in EN ISO 20345:2022 by a
// single mandatory SR symbol, but the old codes remain very common in the wild.
export const SLIP_CODES: ComplianceCode[] = [
  { code: 'SRA', name: 'Slip resistance — ceramic + SLS', description: 'Tested on ceramic tile with sodium lauryl sulphate solution.', standard: 'SLIP' },
  { code: 'SRB', name: 'Slip resistance — steel + glycerol', description: 'Tested on steel floor with glycerol. More aggressive than SRA.', standard: 'SLIP' },
  { code: 'SRC', name: 'Slip resistance — SRA + SRB', description: 'Passes both tests. Pre-2022 gold standard for slip resistance.', standard: 'SLIP' },
  { code: 'SR', name: 'Slip resistance (2022)', description: 'Mandatory in EN ISO 20345:2022 — ceramic + glycerol, stricter than SRB.', standard: 'SLIP' },
]

// ASTM F2413 — US safety footwear standard.
export const ASTM_CODES: ComplianceCode[] = [
  { code: 'ASTM F2413-18', name: 'US safety footwear standard', description: 'Current revision. Footwear must also be marked with section numbers identifying which protections it provides.', standard: 'ASTM' },
  { code: 'I/75', name: 'Impact resistance 75 ft·lb', description: '75 ft·lb (≈ 101 J) toe impact — primary ASTM toe protection rating.', standard: 'ASTM' },
  { code: 'I/50', name: 'Impact resistance 50 ft·lb', description: '50 ft·lb toe impact — lower tier, less common today.', standard: 'ASTM' },
  { code: 'C/75', name: 'Compression resistance 2500 lbf', description: '2,500 lbf (≈ 11.1 kN) toe compression — pairs with I/75.', standard: 'ASTM' },
  { code: 'C/50', name: 'Compression resistance 1750 lbf', description: '1,750 lbf compression — pairs with I/50.', standard: 'ASTM' },
  { code: 'Mt/75', name: 'Metatarsal 75 ft·lb', description: 'Top-of-foot impact resistance equivalent to I/75.', standard: 'ASTM' },
  { code: 'PR', name: 'Puncture resistance', description: 'Midsole resists ≥ 270 lbf puncture — equivalent to EN "P".', standard: 'ASTM' },
  { code: 'EH', name: 'Electrical hazard', description: 'Secondary insulation — withstands 18 kV for 60 s at ≤ 1.0 mA leakage. NOT primary insulation.', standard: 'ASTM' },
  { code: 'SD', name: 'Static dissipative', description: 'Resistance 10⁶–10⁸ Ω. For electronics and explosive-atmosphere work.', standard: 'ASTM' },
  { code: 'CD', name: 'Conductive', description: 'Resistance ≤ 500 kΩ. Dissipates static for explosive-atmosphere work.', standard: 'ASTM' },
  { code: 'DI', name: 'Dielectric insulation', description: 'Primary electrical insulation to ASTM F2412 — rare, specialty line work.', standard: 'ASTM' },
  { code: 'PR/SRC', name: 'Puncture + Slip (combined label)', description: 'Example combined marking seen on the tongue label.', standard: 'ASTM' },
]

// Quick regex map used by the decoder to highlight matched codes.
// Order matters — longer/more specific tokens first so S3S matches before S3.
export const DECODER_TOKENS: { pattern: RegExp; code: string; standard: ComplianceCode['standard'] }[] = [
  // EN classes (longest first)
  { pattern: /\bS1PS\b/g, code: 'S1PS', standard: 'EN-CLASS' },
  { pattern: /\bS1P\b/g, code: 'S1P', standard: 'EN-CLASS' },
  { pattern: /\bS3S\b/g, code: 'S3S', standard: 'EN-CLASS' },
  { pattern: /\bSB\b/g, code: 'SB', standard: 'EN-CLASS' },
  { pattern: /\bS1\b/g, code: 'S1', standard: 'EN-CLASS' },
  { pattern: /\bS2\b/g, code: 'S2', standard: 'EN-CLASS' },
  { pattern: /\bS3\b/g, code: 'S3', standard: 'EN-CLASS' },
  { pattern: /\bS4\b/g, code: 'S4', standard: 'EN-CLASS' },
  { pattern: /\bS5\b/g, code: 'S5', standard: 'EN-CLASS' },
  { pattern: /\bS6\b/g, code: 'S6', standard: 'EN-CLASS' },
  { pattern: /\bS7\b/g, code: 'S7', standard: 'EN-CLASS' },
  // Slip (longest first)
  { pattern: /\bSRC\b/g, code: 'SRC', standard: 'SLIP' },
  { pattern: /\bSRA\b/g, code: 'SRA', standard: 'SLIP' },
  { pattern: /\bSRB\b/g, code: 'SRB', standard: 'SLIP' },
  { pattern: /\bSR\b/g, code: 'SR', standard: 'SLIP' },
  // ASTM (longest first)
  { pattern: /\bI\/75\b/g, code: 'I/75', standard: 'ASTM' },
  { pattern: /\bI\/50\b/g, code: 'I/50', standard: 'ASTM' },
  { pattern: /\bC\/75\b/g, code: 'C/75', standard: 'ASTM' },
  { pattern: /\bC\/50\b/g, code: 'C/50', standard: 'ASTM' },
  { pattern: /\bMt\/75\b/g, code: 'Mt/75', standard: 'ASTM' },
  { pattern: /\bPR\b/g, code: 'PR', standard: 'ASTM' },
  { pattern: /\bEH\b/g, code: 'EH', standard: 'ASTM' },
  { pattern: /\bSD\b/g, code: 'SD', standard: 'ASTM' },
  { pattern: /\bCD\b/g, code: 'CD', standard: 'ASTM' },
  { pattern: /\bDI\b/g, code: 'DI', standard: 'ASTM' },
  // EN addons (longest first — PS before P, WRU before WR, HRO before HI, ESD before E)
  { pattern: /\bPS\b/g, code: 'PS', standard: 'EN-ADDON' },
  { pattern: /\bPL\b/g, code: 'PL', standard: 'EN-ADDON' },
  { pattern: /\bWRU\b/g, code: 'WRU', standard: 'EN-ADDON' },
  { pattern: /\bWR\b/g, code: 'WR', standard: 'EN-ADDON' },
  { pattern: /\bHRO\b/g, code: 'HRO', standard: 'EN-ADDON' },
  { pattern: /\bHI\b/g, code: 'HI', standard: 'EN-ADDON' },
  { pattern: /\bCI\b/g, code: 'CI', standard: 'EN-ADDON' },
  { pattern: /\bESD\b/g, code: 'ESD', standard: 'EN-ADDON' },
  { pattern: /\bCR\b/g, code: 'CR', standard: 'EN-ADDON' },
  { pattern: /\bAN\b/g, code: 'AN', standard: 'EN-ADDON' },
  { pattern: /\bFO\b/g, code: 'FO', standard: 'EN-ADDON' },
  { pattern: /\bSC\b/g, code: 'SC', standard: 'EN-ADDON' },
  { pattern: /\bLG\b/g, code: 'LG', standard: 'EN-ADDON' },
  { pattern: /\bFP\b/g, code: 'FP', standard: 'EN-ADDON' },
  { pattern: /\bP\b/g, code: 'P', standard: 'EN-ADDON' },
  { pattern: /\bA\b/g, code: 'A', standard: 'EN-ADDON' },
  { pattern: /\bE\b/g, code: 'E', standard: 'EN-ADDON' },
  { pattern: /\bM\b/g, code: 'M', standard: 'EN-ADDON' },
]

export const ALL_CODES: ComplianceCode[] = [
  ...EN_CLASSES,
  ...EN_ADDONS,
  ...SLIP_CODES,
  ...ASTM_CODES,
]

export const STANDARD_LABEL: Record<ComplianceCode['standard'], string> = {
  'EN-CLASS': 'EN ISO 20345 class',
  'EN-ADDON': 'EN additional code',
  SLIP: 'Slip resistance',
  ASTM: 'ASTM F2413',
}

// Comparison table row — used by the page for a featured snippet-friendly grid.
export interface StandardComparison {
  property: string
  en: string
  astm: string
}

export const STANDARD_COMPARISON: StandardComparison[] = [
  { property: 'Governing body', en: 'CEN (European Committee for Standardization)', astm: 'ASTM International' },
  { property: 'Toe impact', en: '200 J (all classes)', astm: '75 ft·lb (I/75) or 50 ft·lb (I/50)' },
  { property: 'Toe compression', en: '15 kN (all classes)', astm: '2,500 lbf (C/75) or 1,750 lbf (C/50)' },
  { property: 'Puncture resistance', en: 'Optional — marked P, PS or PL', astm: 'Optional — marked PR' },
  { property: 'Metatarsal', en: 'Optional — marked M', astm: 'Optional — marked Mt/75' },
  { property: 'Electrical hazard', en: 'Antistatic (A) is standard; full insulation not common', astm: 'EH — secondary insulation (18 kV)' },
  { property: 'Slip resistance', en: 'SR mandatory (2022); legacy SRA/SRB/SRC widespread', astm: 'Not mandated — some brands self-certify' },
  { property: 'Water resistance', en: 'Optional — WRU (upper) or WR (whole boot)', astm: 'Not part of F2413 — covered by voluntary specs' },
]
