// Safety footwear size conversion reference.
// Based on Brannock / Mondopoint / ISO 9407 standards used across major
// safety-footwear brands (Timberland PRO, Caterpillar, Dr. Martens Industrial,
// Red Wing, KEEN Utility, Safety Jogger, Uvex, Haix).

export interface SizeRow {
  /** Foot length in millimetres — the definitive measurement. */
  mm: number
  usMen: string
  usWomen: string
  uk: string
  eu: string
  cn: string
  jp: string
}

// Men's conversion table (most safety footwear sold in men's sizing).
export const SIZE_CHART: SizeRow[] = [
  { mm: 230, usMen: '5', usWomen: '6.5', uk: '4', eu: '38', cn: '38', jp: '23.0' },
  { mm: 235, usMen: '5.5', usWomen: '7', uk: '4.5', eu: '38.5', cn: '38.5', jp: '23.5' },
  { mm: 240, usMen: '6', usWomen: '7.5', uk: '5', eu: '39', cn: '39', jp: '24.0' },
  { mm: 245, usMen: '6.5', usWomen: '8', uk: '5.5', eu: '39.5', cn: '39.5', jp: '24.5' },
  { mm: 250, usMen: '7', usWomen: '8.5', uk: '6', eu: '40', cn: '40', jp: '25.0' },
  { mm: 255, usMen: '7.5', usWomen: '9', uk: '6.5', eu: '40.5', cn: '40.5', jp: '25.5' },
  { mm: 260, usMen: '8', usWomen: '9.5', uk: '7', eu: '41', cn: '41', jp: '26.0' },
  { mm: 265, usMen: '8.5', usWomen: '10', uk: '7.5', eu: '42', cn: '42', jp: '26.5' },
  { mm: 270, usMen: '9', usWomen: '10.5', uk: '8', eu: '42.5', cn: '42.5', jp: '27.0' },
  { mm: 275, usMen: '9.5', usWomen: '11', uk: '8.5', eu: '43', cn: '43', jp: '27.5' },
  { mm: 280, usMen: '10', usWomen: '11.5', uk: '9', eu: '44', cn: '44', jp: '28.0' },
  { mm: 285, usMen: '10.5', usWomen: '12', uk: '9.5', eu: '44.5', cn: '44.5', jp: '28.5' },
  { mm: 290, usMen: '11', usWomen: '12.5', uk: '10', eu: '45', cn: '45', jp: '29.0' },
  { mm: 295, usMen: '11.5', usWomen: '13', uk: '10.5', eu: '45.5', cn: '45.5', jp: '29.5' },
  { mm: 300, usMen: '12', usWomen: '13.5', uk: '11', eu: '46', cn: '46', jp: '30.0' },
  { mm: 310, usMen: '13', usWomen: '—', uk: '12', eu: '47', cn: '47', jp: '31.0' },
  { mm: 320, usMen: '14', usWomen: '—', uk: '13', eu: '48', cn: '48', jp: '32.0' },
  { mm: 330, usMen: '15', usWomen: '—', uk: '14', eu: '49', cn: '49', jp: '33.0' },
]

export type System = 'mm' | 'usMen' | 'usWomen' | 'uk' | 'eu' | 'cn' | 'jp'

export const SYSTEMS: { key: System; label: string; abbr: string }[] = [
  { key: 'mm', label: 'Foot length (mm)', abbr: 'mm' },
  { key: 'usMen', label: "US men's", abbr: 'US M' },
  { key: 'usWomen', label: "US women's", abbr: 'US W' },
  { key: 'uk', label: 'UK', abbr: 'UK' },
  { key: 'eu', label: 'EU', abbr: 'EU' },
  { key: 'cn', label: 'China', abbr: 'CN' },
  { key: 'jp', label: 'Japan', abbr: 'JP' },
]

export interface WidthRow {
  code: string
  usLabel: string
  euLabel: string
  description: string
}

// ASTM F2413 and EN ISO 20345 both permit width variants.
export const WIDTH_CHART: WidthRow[] = [
  { code: 'B / Narrow', usLabel: "B (women) / AA (men)", euLabel: '—', description: 'Narrower instep and ball, common for smaller frames.' },
  { code: 'D / Medium', usLabel: 'D', euLabel: 'F (medium)', description: 'Standard width — fits most workers.' },
  { code: 'E / Wide', usLabel: 'E, 2E', euLabel: 'G (wide)', description: 'Extra room across the ball of the foot.' },
  { code: '2E / EE', usLabel: '2E, EE', euLabel: 'H', description: 'Wide fit used for work boots with thick socks.' },
  { code: '4E / EEEE', usLabel: '4E, EEEE', euLabel: 'K', description: 'Very wide fit — orthopaedic or swelling accommodation.' },
  { code: '6E', usLabel: '6E', euLabel: '—', description: 'Rare US-only extra-wide fit; select brands only.' },
]
